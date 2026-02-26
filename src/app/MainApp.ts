import { SingleLayerMaze } from '../maze/SingleLayerMaze';
import { MultiLayerMaze } from '../maze/MultiLayerMaze';
import { Toolbar } from '../sidebar/toolbar';
import { GUIController } from '../gui';
import { PreviewWindow } from '../preview/PreviewWindow';
import type { MazeController } from '../maze/MazeController';
import { computeMarkersFromLayer } from '../maze/markerUtils';
import { subscribeLanguageChange, t } from '../sidebar/i18n';

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
  private debugOverlay: HTMLDivElement | null = null;
  private debugRafId: number | null = null;
  private debugLastUpdate: number = 0;
  private debugLastRenderCount: number = 0;
  private readonly debugUpdateIntervalMs: number = 250;
  private renderCount: number = 0;
  private renderListener: () => void;
  private previewMarkers: {
    start: { row: number; col: number } | null;
    end: { row: number; col: number } | null;
  } | null = null;
  private isDebugOverlayVisible: boolean = true;
  private isPreviewVisible: boolean = true;
  private isPreviewClosed: boolean = false;
  private readonly mobileBreakpoint: number = 800;
  private unsubscribeLanguageChange: (() => void) | null = null;

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
    this.previewWindow = new PreviewWindow({
      title: t('preview.title'),
      width: 300,
      height: 320,
      onHide: () => this.handlePreviewHidden(),
      onClose: () => this.handlePreviewClosed(),
    });

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
    this.renderListener = () => {
      this.renderCount += 1;
    };
    this.maze.addRenderListener(this.renderListener);
    this.setupDebugOverlay();
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

    this.stopDebugLoop();
    if (this.debugOverlay && this.debugOverlay.parentNode) {
      this.debugOverlay.parentNode.removeChild(this.debugOverlay);
    }
  }

  public setDebugOverlayVisible(visible: boolean): void {
    this.isDebugOverlayVisible = visible;
    if (this.debugOverlay) {
      this.debugOverlay.style.display = visible ? 'block' : 'none';
    }
    if (visible) {
      this.startDebugLoop();
    } else {
      this.stopDebugLoop();
    }
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
  }

  private setupDebugOverlay(): void {
    this.renderCount = 0;

    const overlay = document.createElement('div');
    overlay.id = 'debug-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '8px',
      left: '58px',
      padding: '6px 8px',
      background: 'rgba(0, 0, 0, 0.6)',
      color: '#e6e6e6',
      fontFamily: 'monospace',
      fontSize: '12px',
      borderRadius: '4px',
      zIndex: '1000',
      pointerEvents: 'none',
      whiteSpace: 'pre',
    });
    document.body.appendChild(overlay);
    this.debugOverlay = overlay;

    this.startDebugLoop();
  }

  private startDebugLoop(): void {
    if (this.debugRafId !== null) {
      return;
    }

    this.debugLastUpdate = performance.now();
    this.debugLastRenderCount = this.renderCount;

    const tick = (now: number) => {
      if (!this.debugOverlay) {
        this.debugRafId = null;
        return;
      }

      if (now - this.debugLastUpdate >= this.debugUpdateIntervalMs) {
        const intervalSeconds = (now - this.debugLastUpdate) / 1000;
        const renders = this.renderCount - this.debugLastRenderCount;
        const fps = intervalSeconds > 0 ? renders / intervalSeconds : 0;
        const frameTimeMs =
          renders > 0 && intervalSeconds > 0 ? (intervalSeconds * 1000) / renders : 0;

        this.debugOverlay.textContent = `FPS: ${fps.toFixed(1)}\nFrame: ${frameTimeMs.toFixed(
          2
        )} ms`;

        this.debugLastUpdate = now;
        this.debugLastRenderCount = this.renderCount;
      }

      this.debugRafId = window.requestAnimationFrame(tick);
    };

    this.debugRafId = window.requestAnimationFrame(tick);
  }

  private stopDebugLoop(): void {
    if (this.debugRafId !== null) {
      window.cancelAnimationFrame(this.debugRafId);
      this.debugRafId = null;
    }
  }
}
