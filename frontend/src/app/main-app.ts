import { MultiLayerMaze, SingleLayerMaze } from '../maze';
import { Toolbar } from '../sidebar/toolbar';
import { GUIController } from '../gui';
import { PreviewWindow } from '../preview/preview-window';
import { PreviewController } from './preview-controller';
import { ActionBar, type ActionTool } from '../actionbar';
import type { MazeController } from '../maze';
import { computeMarkersFromLayer } from '../maze';
import { subscribeLanguageChange, t } from '../i18n';
import { DebugOverlay } from '../debug/debug-overlay';
import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../constants/maze';
import { PREVIEW_WINDOW, UI_BREAKPOINTS } from '../constants/ui';
import { PREVIEW_WINDOW_STATUS_CHANGED_EVENT } from '../constants/events';
import {
  normalizeCameraZoomMaxDistance,
  normalizeCameraZoomMinDistance,
  normalizeMeshReductionThreshold,
} from '../utils/maze-normalizers';
import type { WebGLRenderer } from 'three';
import { createInitialMazeData, createSampleMultiLayerMazeData } from './default-mazes';
import { MeshReductionSettingsStorage } from './mesh-settings-store';
import { DatGuiSettingsStorage, type DatGuiSettings } from './gui-settings-store';
import type {
  MarkerPoint,
  MazeAppBridge,
  MazeMarkers,
  SolutionPath,
  UpdateMazeOptions,
} from '../types/maze';

type MazeInstance = SingleLayerMaze | MultiLayerMaze;

interface CameraSnapshot {
  state: ReturnType<MazeInstance['getCameraState']>;
  center: ReturnType<MazeInstance['getMazeCenter']>;
}

type DrawingTool = Extract<ActionTool, 'hand' | 'pen' | 'eraser'>;

/**
 * MainApp - Application entry point & lifecycle manager
 */
export class MainApp implements MazeController, MazeAppBridge {
  private readonly canvas: HTMLCanvasElement;
  private readonly toolbar: Toolbar;
  private maze: MazeInstance;
  private readonly guiController: GUIController;
  private readonly previewController: PreviewController;
  private readonly debugOverlay: DebugOverlay;
  private readonly actionBar: ActionBar;
  private readonly renderListener: () => void;
  private readonly settingsStorage: MeshReductionSettingsStorage;
  private readonly datGuiSettingsStorage: DatGuiSettingsStorage;
  private readonly resizeHandler: () => void;
  private readonly keydownHandler: (event: KeyboardEvent) => void;
  private readonly canvasPointerDownHandler: (event: PointerEvent) => void;
  private readonly canvasPointerMoveHandler: (event: PointerEvent) => void;
  private readonly canvasPointerUpHandler: (event: PointerEvent) => void;

  private previewMarkers: MazeMarkers | null = null;
  private solutionPath: SolutionPath = [];
  private drawingTool: DrawingTool = 'hand';
  private drawingPointerId: number | null = null;
  private lastEditedCellKey: string | null = null;
  private edgesVisible: boolean = true;
  private debugOverlayVisible: boolean = true;
  private previewVisibleByViewport: boolean = true;
  private debugVisibilityOverriddenByUser: boolean = false;
  private previewVisibilityOverriddenByUser: boolean = false;
  private readonly mobileBreakpoint: number = UI_BREAKPOINTS.MOBILE;
  private meshReductionThreshold: number = MESH_REDUCTION.DEFAULT_THRESHOLD;
  private meshReductionEnabled: boolean = MESH_REDUCTION.DEFAULT_ENABLED;
  private hideEdgesDuringInteractionEnabled: boolean = false;
  private floorGridEnabled: boolean = true;
  private adaptiveQualityEnabled: boolean = true;
  private allowMultipleMazePopupPanels: boolean = false;
  private toolbarTooltipsEnabled: boolean = true;
  private actionBarVisible: boolean = true;
  private cameraZoomLimitEnabled: boolean = CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED;
  private cameraZoomMinDistance: number = CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
  private cameraZoomMaxDistance: number = CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private pendingDatGuiSettingsToSave: Partial<DatGuiSettings> = {};
  private datGuiSaveTimerId: number | null = null;
  private datGuiSaveIdleId: number | null = null;

  constructor() {
    this.canvas = this.getCanvasOrThrow();
    this.toolbar = new Toolbar();
    this.settingsStorage = new MeshReductionSettingsStorage();
    this.datGuiSettingsStorage = new DatGuiSettingsStorage();
    this.loadMeshReductionSettings();
    this.toolbar.setTooltipsEnabled(this.toolbarTooltipsEnabled);
    const initialDatGuiSettings = this.loadDatGuiSettings();

    this.maze = this.createInitialMaze();
    this.applyMeshReductionSettingsToMaze();
    this.previewMarkers = computeMarkersFromLayer(this.maze.getMazeDataRef()?.[0]);

    this.guiController = new GUIController(this, {
      scale: 1.4,
      mobileBreakpoint: this.mobileBreakpoint,
      autoHide: true,
      initialSettings: initialDatGuiSettings,
      onSettingChange: (key, value) => {
        switch (key) {
          case 'backgroundColor':
          case 'wallColor':
          case 'floorColor':
            this.queueDatGuiSettingSave(key, value as string);
            break;
          case 'wallOpacity':
          case 'floorOpacity':
            this.queueDatGuiSettingSave(key, value as number);
            break;
        }
      },
    });
    this.initializeVisibilityByViewport();
    this.previewController = new PreviewController({
      initialVisible: this.previewVisibleByViewport,
      createWindow: ({ onHide, onClose }) => this.createPreviewWindow(onHide, onClose),
      updatePreviewVisibilitySetting: visible =>
        this.guiController.updateSetting('showPreview', visible),
      setPreviewControllerEnabled: (enabled, tooltip) =>
        this.guiController.setControllerEnabled('showPreview', enabled, tooltip),
      getPreviewClosedTooltip: () => t('gui.previewClosedTooltip'),
      requestPreviewRefresh: () => this.updatePreview(),
      emitStatusChanged: canOpenNewPreviewWindow =>
        this.emitPreviewWindowStatusChanged(canOpenNewPreviewWindow),
    });
    this.subscribeToLanguageChanges();

    this.debugOverlay = new DebugOverlay({
      getMazeLayerCount: () => this.maze.getMazeLayerCount(),
      getRenderQualityInfo: () => this.maze.getRenderQualityInfo(),
    });
    this.renderListener = () => this.debugOverlay.recordRender();
    this.maze.addRenderListener(this.renderListener);

    this.applyDebugOverlayVisible(this.debugOverlayVisible);
    this.applyPreviewVisible(this.previewVisibleByViewport);
    this.applyGUISettings();
    this.updatePreview();
    this.actionBar = new ActionBar();
    this.actionBar.setVisible(this.actionBarVisible);
    this.actionBar.setActiveTool('hand');
    this.actionBar.onToolChange(tool => this.setDrawingTool(tool));
    this.actionBar.onUndo(() => this.undoDrawnPathStep());
    this.actionBar.onClear(() => this.clearDrawnPath());
    this.setDrawingTool('hand');

    this.resizeHandler = () => this.onWindowResize();
    this.keydownHandler = event => {
      if (event.key === 'p' || event.key === 'P') {
        this.setPreviewVisible(!this.previewController.isVisible());
      }
    };
    this.canvasPointerDownHandler = event => this.handleCanvasPointerDown(event);
    this.canvasPointerMoveHandler = event => this.handleCanvasPointerMove(event);
    this.canvasPointerUpHandler = event => this.handleCanvasPointerUp(event);
    this.registerGlobalListeners();
  }

  private getCanvasOrThrow(): HTMLCanvasElement {
    const canvas = document.getElementById('mazeCanvas') as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error('Canvas element "mazeCanvas" not found');
    }
    return canvas;
  }

  private loadMeshReductionSettings(): void {
    const loaded = this.settingsStorage.load({
      enabled: MESH_REDUCTION.DEFAULT_ENABLED,
      threshold: MESH_REDUCTION.DEFAULT_THRESHOLD,
      hideEdgesDuringInteractionEnabled: false,
      floorGridEnabled: false,
      adaptiveQualityEnabled: false,
      allowMultipleMazePopupPanels: false,
      toolbarTooltipsEnabled: true,
      actionBarVisible: true,
      cameraZoomLimitEnabled: CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED,
      cameraZoomMinDistance: CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE,
      cameraZoomMaxDistance: CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE,
    });
    this.meshReductionEnabled = loaded.enabled;
    this.meshReductionThreshold = loaded.threshold;
    this.hideEdgesDuringInteractionEnabled = loaded.hideEdgesDuringInteractionEnabled;
    this.floorGridEnabled = loaded.floorGridEnabled;
    this.adaptiveQualityEnabled = loaded.adaptiveQualityEnabled;
    this.allowMultipleMazePopupPanels = loaded.allowMultipleMazePopupPanels;
    this.toolbarTooltipsEnabled = loaded.toolbarTooltipsEnabled;
    this.actionBarVisible = loaded.actionBarVisible;
    this.cameraZoomLimitEnabled = loaded.cameraZoomLimitEnabled;
    this.cameraZoomMinDistance = loaded.cameraZoomMinDistance;
    this.cameraZoomMaxDistance = loaded.cameraZoomMaxDistance;
  }

  private loadDatGuiSettings(): DatGuiSettings {
    return this.datGuiSettingsStorage.load({
      backgroundColor: '#999999',
      wallColor: '#808080',
      floorColor: '#C0C0C0',
      wallOpacity: 1.0,
      floorOpacity: 1.0,
    });
  }

  private queueDatGuiSettingSave<K extends keyof DatGuiSettings>(
    key: K,
    value: DatGuiSettings[K]
  ): void {
    this.pendingDatGuiSettingsToSave[key] = value;
    if (this.datGuiSaveIdleId !== null || this.datGuiSaveTimerId !== null) {
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      this.datGuiSaveIdleId = window.requestIdleCallback(
        () => {
          this.datGuiSaveIdleId = null;
          this.flushDatGuiSettingsSave();
        },
        { timeout: 250 }
      );
      return;
    }

    this.datGuiSaveTimerId = window.setTimeout(() => {
      this.datGuiSaveTimerId = null;
      this.flushDatGuiSettingsSave();
    }, 150);
  }

  private flushDatGuiSettingsSave(): void {
    if (this.datGuiSaveIdleId !== null && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(this.datGuiSaveIdleId);
      this.datGuiSaveIdleId = null;
    }
    if (this.datGuiSaveTimerId !== null) {
      window.clearTimeout(this.datGuiSaveTimerId);
      this.datGuiSaveTimerId = null;
    }

    const pending = this.pendingDatGuiSettingsToSave;
    this.pendingDatGuiSettingsToSave = {};

    (Object.keys(pending) as Array<keyof DatGuiSettings>).forEach(key => {
      const value = pending[key];
      if (value !== undefined) {
        this.datGuiSettingsStorage.save(key, value);
      }
    });
  }

  private applyMeshReductionSettingsToMaze(): void {
    this.maze.setMeshMergeThreshold(this.meshReductionThreshold);
    this.maze.setMeshReductionEnabled(this.meshReductionEnabled);
    this.maze.setHideEdgesDuringInteractionEnabled(this.hideEdgesDuringInteractionEnabled);
    this.maze.setFloorGridEnabled(this.floorGridEnabled);
    this.maze.setAdaptiveQualityEnabled(this.adaptiveQualityEnabled);
    this.maze.setCameraZoomMinDistance(this.cameraZoomMinDistance);
    this.maze.setCameraZoomMaxDistance(this.cameraZoomMaxDistance);
    this.maze.setCameraZoomLimitEnabled(this.cameraZoomLimitEnabled);
  }

  private initializeVisibilityByViewport(): void {
    const isMobile = window.innerWidth <= this.mobileBreakpoint;
    this.debugOverlayVisible = !isMobile;
    this.previewVisibleByViewport = !isMobile;
    this.guiController.updateSetting('showDebug', this.debugOverlayVisible);
    this.guiController.updateSetting('showPreview', this.previewVisibleByViewport);
  }

  private subscribeToLanguageChanges(): void {
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => {
      this.previewController.handleLanguageChange();
    });
  }

  private registerGlobalListeners(): void {
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('keydown', this.keydownHandler);
    this.canvas.addEventListener('pointerdown', this.canvasPointerDownHandler);
    this.canvas.addEventListener('pointermove', this.canvasPointerMoveHandler);
    this.canvas.addEventListener('pointerup', this.canvasPointerUpHandler);
    this.canvas.addEventListener('pointercancel', this.canvasPointerUpHandler);
  }

  private unregisterGlobalListeners(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.keydownHandler);
    this.canvas.removeEventListener('pointerdown', this.canvasPointerDownHandler);
    this.canvas.removeEventListener('pointermove', this.canvasPointerMoveHandler);
    this.canvas.removeEventListener('pointerup', this.canvasPointerUpHandler);
    this.canvas.removeEventListener('pointercancel', this.canvasPointerUpHandler);
  }

  private createInitialMaze(): MazeInstance {
    return new SingleLayerMaze(this.canvas, createInitialMazeData());
  }

  private setDrawingTool(tool: ActionTool): void {
    this.drawingTool = tool;
    this.actionBar.setActiveTool(tool);
    this.maze.setCameraOrbitEnabled(tool === 'hand');
    this.canvas.style.cursor = tool === 'hand' ? 'grab' : 'crosshair';
    if (this.drawingPointerId !== null && this.canvas.hasPointerCapture(this.drawingPointerId)) {
      this.canvas.releasePointerCapture(this.drawingPointerId);
    }
    this.clearDrawingPointerState();
  }

  private undoDrawnPathStep(): void {
    if (this.solutionPath.length === 0) {
      return;
    }
    this.solutionPath = this.solutionPath.slice(0, -1);
    this.syncRenderedPathWithState();
  }

  private clearDrawnPath(): void {
    if (this.solutionPath.length === 0) {
      return;
    }
    this.solutionPath = [];
    this.syncRenderedPathWithState();
  }

  private handleCanvasPointerDown(event: PointerEvent): void {
    if (!this.shouldHandleDrawingPointer(event)) {
      return;
    }

    event.preventDefault();
    this.drawingPointerId = event.pointerId;
    this.lastEditedCellKey = null;
    this.canvas.setPointerCapture(event.pointerId);
    this.applyDrawingAtPointer(event);
  }

  private handleCanvasPointerMove(event: PointerEvent): void {
    if (
      this.drawingPointerId === null ||
      this.drawingPointerId !== event.pointerId ||
      this.drawingTool === 'hand'
    ) {
      return;
    }
    this.applyDrawingAtPointer(event);
  }

  private handleCanvasPointerUp(event: PointerEvent): void {
    if (this.drawingPointerId === null || this.drawingPointerId !== event.pointerId) {
      return;
    }

    this.clearDrawingPointerState();
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  }

  private shouldHandleDrawingPointer(event: PointerEvent): boolean {
    if (this.drawingTool === 'hand') {
      return false;
    }
    return event.button === 0;
  }

  private clearDrawingPointerState(): void {
    this.drawingPointerId = null;
    this.lastEditedCellKey = null;
  }

  private applyDrawingAtPointer(event: PointerEvent): void {
    const pickedCell = this.maze.pickCellFromClientPoint(event.clientX, event.clientY, 0);
    if (!pickedCell) {
      return;
    }

    const cellKey = `${pickedCell.layerIndex ?? 0}:${pickedCell.row}:${pickedCell.col}`;
    if (cellKey === this.lastEditedCellKey) {
      return;
    }
    this.lastEditedCellKey = cellKey;

    if (!this.isWalkableCell(pickedCell.row, pickedCell.col, pickedCell.layerIndex ?? 0)) {
      return;
    }

    if (this.drawingTool === 'pen') {
      this.addCellToDrawnPath(pickedCell);
      return;
    }

    this.removeCellFromDrawnPath(pickedCell);
  }

  private isWalkableCell(row: number, col: number, layerIndex: number): boolean {
    const layer = this.maze.getMazeDataRef()[layerIndex];
    const value = layer?.[row]?.[col];
    return typeof value === 'number' && value !== 1;
  }

  private addCellToDrawnPath(cell: MarkerPoint): void {
    const exists = this.solutionPath.some(
      existing =>
        existing.row === cell.row &&
        existing.col === cell.col &&
        (existing.layerIndex ?? 0) === (cell.layerIndex ?? 0)
    );
    if (exists) {
      return;
    }
    this.solutionPath = [...this.solutionPath, cell];
    this.syncRenderedPathWithState();
  }

  private removeCellFromDrawnPath(cell: MarkerPoint): void {
    const nextPath = this.solutionPath.filter(
      existing =>
        !(
          existing.row === cell.row &&
          existing.col === cell.col &&
          (existing.layerIndex ?? 0) === (cell.layerIndex ?? 0)
        )
    );
    if (nextPath.length === this.solutionPath.length) {
      return;
    }
    this.solutionPath = nextPath;
    this.syncRenderedPathWithState();
  }

  private syncRenderedPathWithState(): void {
    if (this.solutionPath.length === 0) {
      this.maze.clearSolutionPath();
      this.updatePreview();
      return;
    }
    this.maze.setSolutionPath(this.solutionPath);
    this.updatePreview();
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    this.toolbar.resizeToolbar();
    this.maze.resize();
    this.guiController.checkWindowSize();
    this.previewController.handleWindowResize();

    const isMobile = window.innerWidth <= this.mobileBreakpoint;
    const nextDebugVisible = !isMobile;
    const nextPreviewVisible = !isMobile;
    const effectivePreviewVisible = nextPreviewVisible && !this.previewController.isWindowClosed();

    if (!this.debugVisibilityOverriddenByUser && this.debugOverlayVisible !== nextDebugVisible) {
      this.applyDebugOverlayVisible(nextDebugVisible);
    }

    if (
      !this.previewVisibilityOverriddenByUser &&
      this.previewController.isVisible() !== effectivePreviewVisible
    ) {
      this.applyPreviewVisible(effectivePreviewVisible);
    }
  }

  /**
   * Update maze with new data
   */
  public updateMaze(
    newMaze: number[][][],
    multiLayer: boolean = false,
    markers?: {
      start?: MarkerPoint | null;
      end?: MarkerPoint | null;
    },
    options: UpdateMazeOptions = {}
  ): void {
    this.solutionPath = [];
    this.maze.clearSolutionPath();
    const cameraSnapshot = this.captureCameraSnapshot(options.preserveCamera === true);

    if (this.canReuseMazeInstance(multiLayer)) {
      this.maze.updateMazeData(newMaze, { preserveCamera: !!cameraSnapshot });
    } else {
      this.recreateMazeInstance(newMaze, multiLayer);
    }

    this.restoreCameraSnapshot(cameraSnapshot);
    this.syncPreviewMarkers(markers);
    this.updatePreview();
  }

  private canReuseMazeInstance(multiLayer: boolean): boolean {
    const canReuseSingle = !multiLayer && this.maze instanceof SingleLayerMaze;
    const canReuseMulti = multiLayer && this.maze instanceof MultiLayerMaze;
    return canReuseSingle || canReuseMulti;
  }

  private recreateMazeInstance(newMaze: number[][][], multiLayer: boolean): void {
    this.maze.removeRenderListener(this.renderListener);
    this.maze.destroy();

    this.maze = multiLayer
      ? new MultiLayerMaze(this.canvas, newMaze)
      : new SingleLayerMaze(this.canvas, newMaze);
    this.applyGUISettings();
    this.applyMeshReductionSettingsToMaze();
    this.maze.setCameraOrbitEnabled(this.drawingTool === 'hand');
    this.maze.addRenderListener(this.renderListener);
  }

  private captureCameraSnapshot(preserveCamera: boolean): CameraSnapshot | null {
    if (!preserveCamera) {
      return null;
    }
    return {
      state: this.maze.getCameraState(),
      center: this.maze.getMazeCenter(),
    };
  }

  private restoreCameraSnapshot(snapshot: CameraSnapshot | null): void {
    if (!snapshot) {
      return;
    }

    const nextCenter = this.maze.getMazeCenter();
    const deltaX = nextCenter.x - snapshot.center.x;
    const deltaZ = nextCenter.z - snapshot.center.z;

    snapshot.state.position.x += deltaX;
    snapshot.state.position.z += deltaZ;
    snapshot.state.target.x += deltaX;
    snapshot.state.target.z += deltaZ;
    this.maze.setCameraState(snapshot.state);
  }

  private syncPreviewMarkers(markers?: {
    start?: MarkerPoint | null;
    end?: MarkerPoint | null;
  }): void {
    if (markers) {
      this.previewMarkers = { start: markers.start ?? null, end: markers.end ?? null };
      return;
    }

    const currentData = this.maze.getMazeDataRef();
    this.previewMarkers = computeMarkersFromLayer(currentData?.[0]);
  }

  /**
   * Update preview window with current maze data
   */
  private updatePreview(): void {
    const mazeData = this.maze.getMazeDataRef();
    if (mazeData.length === 0) {
      return;
    }

    if (this.previewMarkers) {
      this.previewController.updateMaze(mazeData, this.previewMarkers, this.solutionPath);
      return;
    }

    this.previewController.updateMaze(mazeData, undefined, this.solutionPath);
  }

  /**
   * Apply current GUI settings to maze
   */
  private applyGUISettings(): void {
    const { backgroundColor, wallColor, floorColor, wallOpacity, floorOpacity } =
      this.guiController.settings;
    this.maze.setBackgroundColor(backgroundColor);
    this.maze.updateWallColor(wallColor);
    this.maze.updateFloorColor(floorColor);
    this.maze.updateWallOpacity(wallOpacity);
    this.maze.updateFloorOpacity(floorOpacity);
    this.maze.toggleEdges(this.edgesVisible);
  }

  /**
   * Create multi-layer maze example
   */
  public createMultiLayerMaze(): void {
    this.updateMaze(createSampleMultiLayerMazeData(), true);
  }

  /**
   * Toggle preview window visibility
   */
  public togglePreview(): void {
    this.setPreviewVisible(!this.previewController.isVisible());
  }

  public setMeshReductionThreshold(threshold: number): void {
    const normalized = normalizeMeshReductionThreshold(threshold);
    this.meshReductionThreshold = normalized;
    this.maze.setMeshMergeThreshold(normalized);
    this.settingsStorage.saveThreshold(normalized);
    this.updatePreview();
  }

  public getMeshReductionThreshold(): number {
    return this.meshReductionThreshold;
  }

  public setMeshReductionEnabled(enabled: boolean): void {
    this.meshReductionEnabled = enabled;
    this.maze.setMeshReductionEnabled(enabled);
    this.settingsStorage.saveEnabled(enabled);
    this.updatePreview();
  }

  public isMeshReductionEnabled(): boolean {
    return this.meshReductionEnabled;
  }

  public setHideEdgesDuringInteractionEnabled(enabled: boolean): void {
    this.hideEdgesDuringInteractionEnabled = enabled;
    this.maze.setHideEdgesDuringInteractionEnabled(enabled);
    this.settingsStorage.saveHideEdgesDuringInteractionEnabled(enabled);
  }

  public isHideEdgesDuringInteractionEnabled(): boolean {
    return this.hideEdgesDuringInteractionEnabled;
  }

  public setAdaptiveQualityEnabled(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled;
    this.maze.setAdaptiveQualityEnabled(enabled);
    this.settingsStorage.saveAdaptiveQualityEnabled(enabled);
  }

  public setFloorGridEnabled(enabled: boolean): void {
    this.floorGridEnabled = enabled;
    this.maze.setFloorGridEnabled(enabled);
    this.settingsStorage.saveFloorGridEnabled(enabled);
  }

  public isFloorGridEnabled(): boolean {
    return this.floorGridEnabled;
  }

  public isAdaptiveQualityEnabled(): boolean {
    return this.adaptiveQualityEnabled;
  }

  public setAllowMultipleMazePopupPanels(enabled: boolean): void {
    this.allowMultipleMazePopupPanels = enabled;
    this.settingsStorage.saveAllowMultipleMazePopupPanels(enabled);
  }

  public isAllowMultipleMazePopupPanelsEnabled(): boolean {
    return this.allowMultipleMazePopupPanels;
  }

  public setToolbarTooltipsEnabled(enabled: boolean): void {
    this.toolbarTooltipsEnabled = enabled;
    this.toolbar.setTooltipsEnabled(enabled);
    this.settingsStorage.saveToolbarTooltipsEnabled(enabled);
  }

  public isToolbarTooltipsEnabled(): boolean {
    return this.toolbarTooltipsEnabled;
  }

  public setActionBarVisible(visible: boolean): void {
    this.actionBarVisible = visible;
    this.actionBar.setVisible(visible);
    this.settingsStorage.saveActionBarVisible(visible);
  }

  public isActionBarVisible(): boolean {
    return this.actionBarVisible;
  }

  public setCameraZoomLimitEnabled(enabled: boolean): void {
    this.cameraZoomLimitEnabled = enabled;
    this.maze.setCameraZoomLimitEnabled(enabled);
    this.settingsStorage.saveCameraZoomLimitEnabled(enabled);
  }

  public isCameraZoomLimitEnabled(): boolean {
    return this.cameraZoomLimitEnabled;
  }

  public setCameraZoomMinDistance(distance: number): void {
    const normalized = normalizeCameraZoomMinDistance(distance);
    this.cameraZoomMinDistance = normalized;
    if (this.cameraZoomMaxDistance < normalized) {
      this.cameraZoomMaxDistance = normalized;
      this.settingsStorage.saveCameraZoomMaxDistance(normalized);
    }
    this.maze.setCameraZoomMinDistance(normalized);
    this.settingsStorage.saveCameraZoomMinDistance(normalized);
  }

  public getCameraZoomMinDistance(): number {
    return this.cameraZoomMinDistance;
  }

  public setCameraZoomMaxDistance(distance: number): void {
    const normalized = normalizeCameraZoomMaxDistance(distance);
    this.cameraZoomMaxDistance = normalized;
    if (this.cameraZoomMinDistance > normalized) {
      this.cameraZoomMinDistance = normalized;
      this.settingsStorage.saveCameraZoomMinDistance(normalized);
    }
    this.maze.setCameraZoomMaxDistance(normalized);
    this.settingsStorage.saveCameraZoomMaxDistance(normalized);
  }

  public getCameraZoomMaxDistance(): number {
    return this.cameraZoomMaxDistance;
  }

  // ========== MazeController Interface Implementation ==========

  public getRenderer(): WebGLRenderer {
    return this.maze.getRenderer();
  }

  public setBackgroundColor(color: string): void {
    this.maze.setBackgroundColor(color);
  }

  public getMazeData(): number[][][] {
    return this.maze.getMazeData();
  }

  public getMazeDataRef(): number[][][] {
    return this.maze.getMazeDataRef();
  }

  public getMazeMarkers(): MazeMarkers | null {
    return this.previewMarkers ? { ...this.previewMarkers } : null;
  }

  public setSolutionPath(path: SolutionPath): void {
    this.solutionPath = path.map(cell => ({ ...cell }));
    this.maze.setSolutionPath(this.solutionPath);
    this.updatePreview();
  }

  public clearSolutionPath(): void {
    this.solutionPath = [];
    this.maze.clearSolutionPath();
    this.updatePreview();
  }

  public updateWallColor(color: string): void {
    this.maze.updateWallColor(color);
  }

  public updateFloorColor(color: string): void {
    this.maze.updateFloorColor(color);
  }

  public updateWallOpacity(opacity: number): void {
    this.maze.updateWallOpacity(opacity);
  }

  public updateFloorOpacity(opacity: number): void {
    this.maze.updateFloorOpacity(opacity);
  }

  public toggleEdges(showEdges: boolean): void {
    this.edgesVisible = showEdges;
    this.guiController.updateSetting('showEdges', showEdges);
    this.maze.toggleEdges(showEdges);
  }

  public setEdgesVisible(enabled: boolean): void {
    this.toggleEdges(enabled);
  }

  public isEdgesVisible(): boolean {
    return this.edgesVisible;
  }

  public requestRender(): void {
    this.maze.requestRender();
  }

  /**
   * Cleanup app on destroyed
   */
  public destroy(): void {
    this.flushDatGuiSettingsSave();
    this.unregisterGlobalListeners();

    this.toolbar.destroy();
    this.maze.destroy();
    this.guiController.destroy();
    this.previewController.destroy();
    this.actionBar.destroy();
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }

    this.debugOverlay.destroy();
  }

  private applyDebugOverlayVisible(visible: boolean): void {
    this.debugOverlayVisible = visible;
    this.guiController.updateSetting('showDebug', visible);
    this.debugOverlay.setVisible(visible);
  }

  private applyPreviewVisible(visible: boolean): void {
    this.previewController.setVisible(visible);
  }

  public setDebugOverlayVisible(visible: boolean): void {
    this.debugVisibilityOverriddenByUser = true;
    this.applyDebugOverlayVisible(visible);
  }

  public isDebugOverlayVisible(): boolean {
    return this.debugOverlayVisible;
  }

  public setPreviewVisible(visible: boolean): void {
    this.previewVisibilityOverriddenByUser = true;
    this.applyPreviewVisible(visible);
  }

  public isPreviewVisible(): boolean {
    return this.previewController.isVisible();
  }

  public reopenPreviewWindow(): void {
    this.previewController.reopen();
  }

  public canOpenNewPreviewWindow(): boolean {
    return this.previewController.canOpenNewWindow();
  }

  private createPreviewWindow(onHide: () => void, onClose: () => void): PreviewWindow {
    return new PreviewWindow({
      title: t('preview.title'),
      width: PREVIEW_WINDOW.DEFAULT_WIDTH,
      height: PREVIEW_WINDOW.DEFAULT_HEIGHT,
      onHide,
      onClose,
    });
  }

  private emitPreviewWindowStatusChanged(canOpenNewPreviewWindow: boolean): void {
    window.dispatchEvent(
      new CustomEvent(PREVIEW_WINDOW_STATUS_CHANGED_EVENT, {
        detail: { canOpenNewPreviewWindow },
      })
    );
  }
}
