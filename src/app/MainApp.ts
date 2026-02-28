import { SingleLayerMaze } from '../maze/SingleLayerMaze';
import { MultiLayerMaze } from '../maze/MultiLayerMaze';
import { Toolbar } from '../sidebar/toolbar';
import { GUIController } from '../gui';
import { PreviewWindow } from '../preview/PreviewWindow';
import { PreviewWindowManager } from './PreviewWindowManager';
import type { MazeController } from '../maze/MazeController';
import { computeMarkersFromLayer } from '../maze/markerUtils';
import { subscribeLanguageChange, t } from '../sidebar/i18n';
import { DebugOverlay } from '../debug/DebugOverlay';
import { MESH_REDUCTION } from '../constants/maze';
import { PREVIEW_WINDOW, UI_BREAKPOINTS } from '../constants/ui';
import type { WebGLRenderer } from 'three';
import {
  createInitialMazeData,
  createSampleMultiLayerMazeData,
  createSampleSingleLayerMazeData,
} from './defaultMazes';
import {
  MeshReductionSettingsStorage,
} from './MeshReductionSettingsStorage';
import type { MarkerPoint, MazeAppBridge, MazeMarkers, UpdateMazeOptions } from '../types/maze';

type MazeInstance = SingleLayerMaze | MultiLayerMaze;

interface CameraSnapshot {
  state: ReturnType<MazeInstance['getCameraState']>;
  center: ReturnType<MazeInstance['getMazeCenter']>;
}

/**
 * MainApp - Application entry point & lifecycle manager
 */
export class MainApp implements MazeController, MazeAppBridge {
  private static readonly PREVIEW_STATUS_EVENT = 'maze:preview-window-status-changed';

  private readonly canvas: HTMLCanvasElement;
  private readonly toolbar: Toolbar;
  private maze: MazeInstance;
  private readonly guiController: GUIController;
  private readonly previewWindowManager: PreviewWindowManager;
  private readonly debugOverlay: DebugOverlay;
  private readonly renderListener: () => void;
  private readonly settingsStorage: MeshReductionSettingsStorage;
  private readonly resizeHandler: () => void;
  private readonly keydownHandler: (event: KeyboardEvent) => void;

  private previewMarkers: MazeMarkers | null = null;
  private isDebugOverlayVisible: boolean = true;
  private isPreviewVisible: boolean = true;
  private readonly mobileBreakpoint: number = UI_BREAKPOINTS.MOBILE;
  private meshReductionThreshold: number = MESH_REDUCTION.DEFAULT_THRESHOLD;
  private meshReductionEnabled: boolean = MESH_REDUCTION.DEFAULT_ENABLED;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor() {
    this.canvas = this.getCanvasOrThrow();
    this.toolbar = new Toolbar();
    this.settingsStorage = new MeshReductionSettingsStorage();
    this.loadMeshReductionSettings();

    this.maze = this.createInitialMaze();
    this.applyMeshReductionSettingsToMaze();
    this.previewMarkers = computeMarkersFromLayer(this.maze.getMazeData()?.[0]);

    this.guiController = new GUIController(this, {
      scale: 1.4,
      mobileBreakpoint: this.mobileBreakpoint,
      autoHide: true,
    });
    this.initializeVisibilityByViewport();

    this.previewWindowManager = new PreviewWindowManager(
      {
        createWindow: ({ onHide, onClose }) => this.createPreviewWindow(onHide, onClose),
        onVisibilityChanged: visible => this.handlePreviewVisibilityChanged(visible),
        onClosed: () => this.handlePreviewClosed(),
      },
      this.isPreviewVisible
    );
    this.subscribeToLanguageChanges();

    this.debugOverlay = new DebugOverlay({
      getMazeData: () => this.maze.getMazeData(),
    });
    this.renderListener = () => this.debugOverlay.recordRender();
    this.maze.addRenderListener(this.renderListener);

    this.setDebugOverlayVisible(this.isDebugOverlayVisible);
    this.setPreviewVisible(this.isPreviewVisible);
    this.getRenderer().setClearColor(this.guiController.settings.backgroundColor);
    this.updatePreview();

    this.resizeHandler = () => this.onWindowResize();
    this.keydownHandler = event => {
      if (event.key === 'p' || event.key === 'P') {
        this.setPreviewVisible(!this.isPreviewVisible);
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
    });
    this.meshReductionEnabled = loaded.enabled;
    this.meshReductionThreshold = loaded.threshold;
  }

  private applyMeshReductionSettingsToMaze(): void {
    this.maze.setMeshMergeThreshold(this.meshReductionThreshold);
    this.maze.setMeshReductionEnabled(this.meshReductionEnabled);
  }

  private initializeVisibilityByViewport(): void {
    const isMobile = window.innerWidth <= this.mobileBreakpoint;
    this.isDebugOverlayVisible = !isMobile;
    this.isPreviewVisible = !isMobile;
    this.guiController.updateSetting('showDebug', this.isDebugOverlayVisible);
    this.guiController.updateSetting('showPreview', this.isPreviewVisible);
  }

  private subscribeToLanguageChanges(): void {
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => {
      if (this.previewWindowManager.isWindowClosed()) {
        this.guiController.setControllerEnabled('showPreview', false, t('gui.previewClosedTooltip'));
      }
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

  private createInitialMaze(): SingleLayerMaze {
    return new SingleLayerMaze(this.canvas, createInitialMazeData());
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    this.toolbar.resizeToolbar();
    this.maze.resize();
    this.guiController.checkWindowSize();
    this.previewWindowManager.handleWindowResize();

    const isMobile = window.innerWidth <= this.mobileBreakpoint;
    const nextDebugVisible = !isMobile;
    const nextPreviewVisible = !isMobile;
    const effectivePreviewVisible = nextPreviewVisible && !this.previewWindowManager.isWindowClosed();

    if (this.isDebugOverlayVisible !== nextDebugVisible) {
      this.setDebugOverlayVisible(nextDebugVisible);
      this.guiController.updateSetting('showDebug', nextDebugVisible);
    }

    if (this.isPreviewVisible !== effectivePreviewVisible) {
      this.setPreviewVisible(effectivePreviewVisible);
      this.guiController.updateSetting('showPreview', effectivePreviewVisible);
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

    this.maze = multiLayer ? new MultiLayerMaze(this.canvas, newMaze) : new SingleLayerMaze(this.canvas, newMaze);
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

  private syncPreviewMarkers(markers?: { start?: MarkerPoint | null; end?: MarkerPoint | null }): void {
    if (markers) {
      this.previewMarkers = { start: markers.start ?? null, end: markers.end ?? null };
      return;
    }

    const currentData = this.maze.getMazeData();
    this.previewMarkers = computeMarkersFromLayer(currentData?.[0]);
  }

  /**
   * Update preview window with current maze data
   */
  private updatePreview(): void {
    const mazeData = this.maze.getMazeData();
    if (mazeData.length === 0) {
      return;
    }

    if (this.previewMarkers) {
      this.previewWindowManager.updateMaze(mazeData[0], this.previewMarkers);
      return;
    }

    this.previewWindowManager.updateMaze(mazeData[0]);
  }

  /**
   * Apply current GUI settings to maze
   */
  private applyGUISettings(): void {
    const renderer = this.getRenderer();
    if (!renderer) {
      return;
    }
    renderer.setClearColor(this.guiController.settings.backgroundColor);
    this.requestRender();
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
    this.setPreviewVisible(!this.isPreviewVisible);
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

  // ========== MazeController Interface Implementation ==========

  public getRenderer(): WebGLRenderer {
    return this.maze.getRenderer();
  }

  public getMazeData(): number[][][] {
    return this.maze.getMazeData();
  }

  public getMazeMarkers(): MazeMarkers | null {
    return this.previewMarkers ? { ...this.previewMarkers } : null;
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
    this.maze.toggleEdges(showEdges);
  }

  public requestRender(): void {
    this.maze.requestRender();
  }

  /**
   * Cleanup app on destroyed
   */
  public destroy(): void {
    this.unregisterGlobalListeners();

    this.maze.destroy();
    this.guiController.destroy();
    this.previewWindowManager.destroy();
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }

    this.debugOverlay.destroy();
  }

  public setDebugOverlayVisible(visible: boolean): void {
    this.isDebugOverlayVisible = visible;
    this.debugOverlay.setVisible(visible);
  }

  public setPreviewVisible(visible: boolean): void {
    this.isPreviewVisible = visible;
    if (this.previewWindowManager.isWindowClosed()) {
      if (visible) {
        this.isPreviewVisible = false;
        this.guiController.updateSetting('showPreview', false);
      }
      return;
    }
    this.previewWindowManager.setVisible(visible);
  }

  private handlePreviewVisibilityChanged(visible: boolean): void {
    this.isPreviewVisible = visible;
    this.guiController.updateSetting('showPreview', visible);
  }

  private handlePreviewClosed(): void {
    this.isPreviewVisible = false;
    this.guiController.updateSetting('showPreview', false);
    this.guiController.setControllerEnabled('showPreview', false, t('gui.previewClosedTooltip'));
    this.emitPreviewWindowStatusChanged();
  }

  public reopenPreviewWindow(): void {
    this.previewWindowManager.reopen();
    this.isPreviewVisible = true;
    this.guiController.updateSetting('showPreview', true);
    this.guiController.setControllerEnabled('showPreview', true);
    this.updatePreview();
    this.emitPreviewWindowStatusChanged();
  }

  public canOpenNewPreviewWindow(): boolean {
    return this.previewWindowManager.canOpenNewWindow();
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

  private emitPreviewWindowStatusChanged(): void {
    window.dispatchEvent(
      new CustomEvent(MainApp.PREVIEW_STATUS_EVENT, {
        detail: { canOpenNewPreviewWindow: this.canOpenNewPreviewWindow() },
      })
    );
  }
}
