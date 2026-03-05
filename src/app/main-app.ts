import { SingleLayerMaze } from '../maze/single-layer-maze';
import { MultiLayerMaze } from '../maze/multi-layer-maze';
import { Toolbar } from '../sidebar/toolbar';
import { GUIController } from '../gui';
import { PreviewWindow } from '../preview/preview-window';
import { PreviewController } from './preview-controller';
import type { MazeController } from '../maze/maze-controller';
import { computeMarkersFromLayer } from '../maze/marker-utils';
import { subscribeLanguageChange, t } from '../sidebar/i18n';
import { DebugOverlay } from '../debug/debug-overlay';
import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../constants/maze';
import { PREVIEW_WINDOW, UI_BREAKPOINTS } from '../constants/ui';
import { PREVIEW_WINDOW_STATUS_CHANGED_EVENT } from '../constants/events';
import type { WebGLRenderer } from 'three';
import { createSampleMultiLayerMazeData, createSampleSingleLayerMazeData } from './default-mazes';
import { MeshReductionSettingsStorage } from './mesh-settings-store';
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
  private readonly renderListener: () => void;
  private readonly settingsStorage: MeshReductionSettingsStorage;
  private readonly resizeHandler: () => void;
  private readonly keydownHandler: (event: KeyboardEvent) => void;

  private previewMarkers: MazeMarkers | null = null;
  private solutionPath: SolutionPath = [];
  private edgesVisible: boolean = true;
  private debugOverlayVisible: boolean = true;
  private previewVisibleByViewport: boolean = true;
  private debugVisibilityOverriddenByUser: boolean = false;
  private previewVisibilityOverriddenByUser: boolean = false;
  private readonly mobileBreakpoint: number = UI_BREAKPOINTS.MOBILE;
  private meshReductionThreshold: number = MESH_REDUCTION.DEFAULT_THRESHOLD;
  private meshReductionEnabled: boolean = MESH_REDUCTION.DEFAULT_ENABLED;
  private hideEdgesDuringInteractionEnabled: boolean = false;
  private floorGridEnabled: boolean = false;
  private adaptiveQualityEnabled: boolean = true;
  private cameraZoomLimitEnabled: boolean = CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED;
  private cameraZoomMinDistance: number = CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
  private cameraZoomMaxDistance: number = CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor() {
    this.canvas = this.getCanvasOrThrow();
    this.toolbar = new Toolbar();
    this.settingsStorage = new MeshReductionSettingsStorage();
    this.loadMeshReductionSettings();

    this.maze = this.createInitialMaze();
    this.applyMeshReductionSettingsToMaze();
    this.previewMarkers = computeMarkersFromLayer(this.maze.getMazeDataRef()?.[0]);

    this.guiController = new GUIController(this, {
      scale: 1.4,
      mobileBreakpoint: this.mobileBreakpoint,
      autoHide: true,
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
    this.maze.setBackgroundColor(this.guiController.settings.backgroundColor);
    this.updatePreview();

    this.resizeHandler = () => this.onWindowResize();
    this.keydownHandler = event => {
      if (event.key === 'p' || event.key === 'P') {
        this.setPreviewVisible(!this.previewController.isVisible());
      }
    };
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
      adaptiveQualityEnabled: true,
      cameraZoomLimitEnabled: CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED,
      cameraZoomMinDistance: CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE,
      cameraZoomMaxDistance: CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE,
    });
    this.meshReductionEnabled = loaded.enabled;
    this.meshReductionThreshold = loaded.threshold;
    this.hideEdgesDuringInteractionEnabled = loaded.hideEdgesDuringInteractionEnabled;
    this.floorGridEnabled = loaded.floorGridEnabled;
    this.adaptiveQualityEnabled = loaded.adaptiveQualityEnabled;
    this.cameraZoomLimitEnabled = loaded.cameraZoomLimitEnabled;
    this.cameraZoomMinDistance = loaded.cameraZoomMinDistance;
    this.cameraZoomMaxDistance = loaded.cameraZoomMaxDistance;
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
  }

  private unregisterGlobalListeners(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.keydownHandler);
  }

  private createInitialMaze(): MazeInstance {
    return new MultiLayerMaze(this.canvas, createSampleMultiLayerMazeData());
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
      this.previewController.updateMaze(mazeData[0], this.previewMarkers, this.solutionPath);
      return;
    }

    this.previewController.updateMaze(mazeData[0], undefined, this.solutionPath);
  }

  /**
   * Apply current GUI settings to maze
   */
  private applyGUISettings(): void {
    this.maze.setBackgroundColor(this.guiController.settings.backgroundColor);
    this.maze.toggleEdges(this.edgesVisible);
  }

  /**
   * Create multi-layer maze example
   */
  public createMultiLayerMaze(): void {
    this.updateMaze(createSampleMultiLayerMazeData(), true);
  }

  /**
   * Create single-layer maze example
   */
  public createSingleLayerMaze(): void {
    this.updateMaze(createSampleSingleLayerMazeData(), false);
  }

  /**
   * Toggle preview window visibility
   */
  public togglePreview(): void {
    this.setPreviewVisible(!this.previewController.isVisible());
  }

  public setMeshReductionThreshold(threshold: number): void {
    const normalized = Math.max(
      MESH_REDUCTION.MIN_THRESHOLD,
      Math.min(MESH_REDUCTION.MAX_THRESHOLD, Math.floor(threshold))
    );
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

  public setCameraZoomLimitEnabled(enabled: boolean): void {
    this.cameraZoomLimitEnabled = enabled;
    this.maze.setCameraZoomLimitEnabled(enabled);
    this.settingsStorage.saveCameraZoomLimitEnabled(enabled);
  }

  public isCameraZoomLimitEnabled(): boolean {
    return this.cameraZoomLimitEnabled;
  }

  public setCameraZoomMinDistance(distance: number): void {
    const normalized = Math.min(
      CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX,
      Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, distance)
    );
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
    const normalized = Math.min(
      CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX,
      Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, distance)
    );
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
    this.maze.setSolutionPath(this.solutionPath, 0);
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
    this.unregisterGlobalListeners();

    this.toolbar.destroy();
    this.maze.destroy();
    this.guiController.destroy();
    this.previewController.destroy();
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
