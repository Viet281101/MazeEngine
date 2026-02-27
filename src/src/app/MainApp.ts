import { SingleLayerMaze } from '../maze/SingleLayerMaze';
import { MultiLayerMaze } from '../maze/MultiLayerMaze';
import { Toolbar } from '../sidebar/toolbar';
import { GUIController } from '../gui';
import { PreviewWindow } from '../preview/PreviewWindow';
import type { MazeController } from '../maze/MazeController';
import { computeMarkersFromLayer } from '../maze/markerUtils';
import { subscribeLanguageChange, t } from '../sidebar/i18n';
import { DebugOverlay } from '../debug/DebugOverlay';
import { MESH_REDUCTION } from '../constants/maze';
import { PREVIEW_WINDOW, UI_BREAKPOINTS } from '../constants/ui';

/**
 * MainApp - Application entry point & lifecycle manager
 */
export class MainApp implements MazeController {
  private canvas: HTMLCanvasElement;
  private toolbar: Toolbar;
  private maze: SingleLayerMaze | MultiLayerMaze;
  private guiController: GUIController;
  private previewWindow: PreviewWindow | null;
  private resizeHandler: () => void;
  private debugOverlay: DebugOverlay;
  private renderListener: () => void;
  private previewMarkers: {
    start: { row: number; col: number } | null;
    end: { row: number; col: number } | null;
  } | null = null;
  private isDebugOverlayVisible: boolean = true;
  private isPreviewVisible: boolean = true;
  private isPreviewClosed: boolean = false;
  private readonly mobileBreakpoint: number = UI_BREAKPOINTS.MOBILE;
  private meshReductionThreshold: number = MESH_REDUCTION.DEFAULT_THRESHOLD;
  private meshReductionEnabled: boolean = MESH_REDUCTION.DEFAULT_ENABLED;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private static readonly PREVIEW_STATUS_EVENT = 'maze:preview-window-status-changed';

  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('mazeCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element "mazeCanvas" not found');
    }

    // Initialize toolbar
    this.toolbar = new Toolbar();

    // Create initial maze
    this.maze = this.createInitialMaze();
    this.maze.setMeshMergeThreshold(this.meshReductionThreshold);
    this.maze.setMeshReductionEnabled(this.meshReductionEnabled);
    const initialData = this.maze.getMazeData();
    this.previewMarkers = computeMarkersFromLayer(initialData?.[0]);

    // Initialize GUI
    this.guiController = new GUIController(this, {
      scale: 1.4,
      mobileBreakpoint: this.mobileBreakpoint,
      autoHide: true,
    });

    const isMobile = window.innerWidth <= this.mobileBreakpoint;
    this.isDebugOverlayVisible = !isMobile;
    this.isPreviewVisible = !isMobile;
    this.guiController.updateSetting('showDebug', this.isDebugOverlayVisible);
    this.guiController.updateSetting('showPreview', this.isPreviewVisible);

    // Initialize preview window
    this.previewWindow = this.createPreviewWindow();

    this.unsubscribeLanguageChange = subscribeLanguageChange(() => {
      if (this.isPreviewClosed) {
        this.guiController.setControllerEnabled(
          'showPreview',
          false,
          t('gui.previewClosedTooltip')
        );
      }
    });

    // Initialize debug overlay
    this.debugOverlay = new DebugOverlay({
      getMazeData: () => this.maze.getMazeData(),
    });
    this.renderListener = () => {
      this.debugOverlay.recordRender();
    };
    this.maze.addRenderListener(this.renderListener);
    this.setDebugOverlayVisible(this.isDebugOverlayVisible);
    this.setPreviewVisible(this.isPreviewVisible);

    // Set initial background color
    this.getRenderer().setClearColor(this.guiController.settings.backgroundColor);

    // Update preview with initial maze
    this.updatePreview();

    // Setup event listeners
    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);

    // Add keyboard shortcut to toggle preview (P key)
    window.addEventListener('keydown', e => {
      if (e.key === 'p' || e.key === 'P') {
        this.setPreviewVisible(!this.isPreviewVisible);
      }
    });
  }

  /**
   * Create initial maze configuration
   */
  private createInitialMaze(): SingleLayerMaze {
    const initialMazeData = [
      [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ],
    ];

    return new SingleLayerMaze(this.canvas, initialMazeData);
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    this.toolbar.resizeToolbar();
    this.maze.resize();
    this.guiController.checkWindowSize();
    this.previewWindow?.handleWindowResize();

    const isMobile = window.innerWidth <= this.mobileBreakpoint;
    const nextDebugVisible = !isMobile;
    const nextPreviewVisible = !isMobile;
    const effectivePreviewVisible = nextPreviewVisible && !this.isPreviewClosed;

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
      start?: { row: number; col: number } | null;
      end?: { row: number; col: number } | null;
    }
  ): void {
    const canReuseSingle = !multiLayer && this.maze instanceof SingleLayerMaze;
    const canReuseMulti = multiLayer && this.maze instanceof MultiLayerMaze;

    if (canReuseSingle || canReuseMulti) {
      this.maze.updateMazeData(newMaze);
    } else {
      // Destroy old maze completely
      this.maze.removeRenderListener(this.renderListener);
      this.maze.destroy();

      // Create new maze
      if (multiLayer) {
        this.maze = new MultiLayerMaze(this.canvas, newMaze);
      } else {
        this.maze = new SingleLayerMaze(this.canvas, newMaze);
      }

      // Apply GUI settings to new maze
      this.applyGUISettings();
      this.maze.setMeshMergeThreshold(this.meshReductionThreshold);
      this.maze.setMeshReductionEnabled(this.meshReductionEnabled);

      // Re-attach render listener for debug overlay
      this.maze.addRenderListener(this.renderListener);
    }

    if (markers) {
      this.previewMarkers = { start: markers.start ?? null, end: markers.end ?? null };
    } else {
      const currentData = this.maze.getMazeData();
      this.previewMarkers = computeMarkersFromLayer(currentData?.[0]);
    }

    // Update preview
    this.updatePreview();
  }

  /**
   * Update preview window with current maze data
   */
  private updatePreview(): void {
    // Get first layer of maze for 2D preview
    const mazeData = this.maze['maze'];
    if (mazeData && mazeData.length > 0) {
      if (this.previewMarkers) {
        this.previewWindow?.updateMaze(mazeData[0], this.previewMarkers);
      } else {
        this.previewWindow?.updateMaze(mazeData[0]);
      }
    }
  }

  /**
   * Apply current GUI settings to maze
   */
  private applyGUISettings(): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.setClearColor(this.guiController.settings.backgroundColor);
      this.requestRender();
    }
  }

  /**
   * Create multi-layer maze example
   */
  public createMultiLayerMaze(): void {
    const multiLayerData = [
      [
        [1, 0, 1, 1, 1, 1],
        [1, 0, 0, 1, 0, 1],
        [1, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1],
      ],
      [
        [1, 0, 1, 1, 1, 1],
        [1, 0, 0, 1, 0, 1],
        [1, 0, 0, 1, 1, 1],
        [1, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1],
      ],
    ];

    this.updateMaze(multiLayerData, true);
  }

  /**
   * Create single-layer maze example
   */
  public createSingleLayerMaze(): void {
    const singleLayerData = [
      [
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 1, 1, 1, 1],
      ],
    ];

    this.updateMaze(singleLayerData, false);
  }

  /**
   * Toggle preview window visibility
   */
  public togglePreview(): void {
    this.setPreviewVisible(!this.isPreviewVisible);
  }

  public setMeshReductionThreshold(threshold: number): void {
    const normalized = Math.max(MESH_REDUCTION.MIN_THRESHOLD, Math.floor(threshold));
    this.meshReductionThreshold = normalized;
    this.maze.setMeshMergeThreshold(normalized);
    this.updatePreview();
  }

  public getMeshReductionThreshold(): number {
    return this.meshReductionThreshold;
  }

  public setMeshReductionEnabled(enabled: boolean): void {
    this.meshReductionEnabled = enabled;
    this.maze.setMeshReductionEnabled(enabled);
    this.updatePreview();
  }

  public isMeshReductionEnabled(): boolean {
    return this.meshReductionEnabled;
  }

  // ========== MazeController Interface Implementation ==========

  public getRenderer(): any {
    return this.maze.getRenderer();
  }

  public getMazeData(): number[][][] {
    return this.maze.getMazeData();
  }

  public getMazeMarkers():
    | { start: { row: number; col: number } | null; end: { row: number; col: number } | null }
    | null {
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
    // Remove event listeners
    window.removeEventListener('resize', this.resizeHandler);

    // Destroy components
    this.maze.destroy();
    this.guiController.destroy();
    this.previewWindow?.destroy();
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
    if (this.isPreviewClosed || !this.previewWindow) {
      if (visible) {
        this.isPreviewVisible = false;
        this.guiController.updateSetting('showPreview', false);
      }
      return;
    }
    if (visible) {
      this.previewWindow.show();
    } else {
      this.previewWindow.hide();
    }
  }

  private handlePreviewHidden(): void {
    this.isPreviewVisible = false;
    this.guiController.updateSetting('showPreview', false);
  }

  private handlePreviewClosed(): void {
    this.isPreviewVisible = false;
    this.isPreviewClosed = true;
    this.previewWindow = null;
    this.guiController.updateSetting('showPreview', false);
    this.guiController.setControllerEnabled(
      'showPreview',
      false,
      t('gui.previewClosedTooltip')
    );
    this.emitPreviewWindowStatusChanged();
  }

  public reopenPreviewWindow(): void {
    if (this.previewWindow) {
      this.isPreviewClosed = false;
      this.setPreviewVisible(true);
      this.guiController.updateSetting('showPreview', true);
      this.guiController.setControllerEnabled('showPreview', true);
      this.updatePreview();
      this.emitPreviewWindowStatusChanged();
      return;
    }

    this.previewWindow = this.createPreviewWindow();
    this.isPreviewClosed = false;
    this.isPreviewVisible = true;
    this.guiController.updateSetting('showPreview', true);
    this.guiController.setControllerEnabled('showPreview', true);
    this.updatePreview();
    this.previewWindow.show();
    this.emitPreviewWindowStatusChanged();
  }

  public canOpenNewPreviewWindow(): boolean {
    return this.previewWindow === null;
  }

  private createPreviewWindow(): PreviewWindow {
    return new PreviewWindow({
      title: t('preview.title'),
      width: PREVIEW_WINDOW.DEFAULT_WIDTH,
      height: PREVIEW_WINDOW.DEFAULT_HEIGHT,
      onHide: () => this.handlePreviewHidden(),
      onClose: () => this.handlePreviewClosed(),
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
