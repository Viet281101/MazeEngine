import './preview-window.css';
import { PREVIEW_COLORS } from './preview-constants';
import {
  computePreviewLayout,
  renderPreviewMaze,
  type PreviewLayout,
} from './preview-canvas-renderer';
import { computeMarkersFromLayer } from '../maze';
import { subscribeLanguageChange, t } from '../sidebar/i18n';
import type { MarkerPoint, MazeData, SolutionPath } from '../types/maze';

export interface PreviewWindowConfig {
  initialX?: number;
  initialY?: number;
  width?: number;
  height?: number;
  title?: string;
  onHide?: () => void;
  onClose?: () => void;
}

/**
 * PreviewWindow - Draggable 2D maze preview window
 */
export class PreviewWindow {
  private container: HTMLDivElement;
  private titleBar: HTMLDivElement;
  private titleText: HTMLSpanElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private closeButton: HTMLButtonElement;
  private hideButton: HTMLButtonElement;
  private gridToggleButton: HTMLButtonElement;
  private footer!: HTMLDivElement;
  private legend: HTMLDivElement;
  private legendWallLabel: HTMLSpanElement;
  private legendPathLabel: HTMLSpanElement;
  private legendConnectorLabel: HTMLSpanElement;
  private legendStartLabel: HTMLSpanElement;
  private legendEndLabel: HTMLSpanElement;
  private layerPrevButton: HTMLButtonElement;
  private layerNextButton: HTMLButtonElement;
  private layerLabel: HTMLSpanElement;
  private startCell: MarkerPoint | null = null;
  private endCell: MarkerPoint | null = null;
  private showGrid: boolean = false;
  private hasExplicitMarkers: boolean = false;
  private explicitStartCell: MarkerPoint | null = null;
  private explicitEndCell: MarkerPoint | null = null;
  private baseSolutionPath: SolutionPath = [];
  private activeLayerIndex: number = 0;
  private isClosed: boolean = false;
  private onHide?: () => void;
  private onClose?: () => void;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private windowX: number = 0;
  private windowY: number = 0;

  private width: number;
  private height: number;
  private readonly canvasWidth: number = 256;
  private readonly canvasHeight: number = 256;
  private readonly viewportMargin: number = 20;
  private lastViewportWidth: number;
  private lastViewportHeight: number;

  private isVisible: boolean = true;
  private isHiding: boolean = false;
  private hideTimeoutId: number | null = null;
  private readonly hideTransitionMs: number = 350;
  private mazeData: MazeData | null = null;
  private activeLayerData: number[][] | null = null;
  private solutionPath: SolutionPath = [];
  private layout: PreviewLayout | null = null;

  private onMouseMoveHandler: (e: MouseEvent) => void;
  private onMouseUpHandler: () => void;
  private onMouseDownHandler: (e: MouseEvent) => void;
  private onWheelHandler: (e: WheelEvent) => void;
  private onKeyDownHandler: (e: KeyboardEvent) => void;
  private onContainerMouseDownHandler: () => void;
  private dragListenersAttached: boolean = false;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor(config: PreviewWindowConfig = {}) {
    this.onHide = config.onHide;
    this.onClose = config.onClose;

    this.width = config.width ?? 300;
    this.height = config.height ?? 320;
    const defaultX = Math.max(this.viewportMargin, this.getAnchoredMaxX(window.innerWidth));
    const defaultY = Math.max(this.viewportMargin, this.getAnchoredMaxY(window.innerHeight));
    this.windowX = config.initialX ?? defaultX;
    this.windowY = config.initialY ?? defaultY;
    this.lastViewportWidth = window.innerWidth;
    this.lastViewportHeight = window.innerHeight;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'preview-window';
    this.container.tabIndex = 0;
    this.container.style.width = `${this.width}px`;
    this.container.style.height = `${this.height}px`;
    this.container.style.left = `${this.windowX}px`;
    this.container.style.top = `${this.windowY}px`;
    this.container.style.setProperty('--preview-bg', PREVIEW_COLORS.background);
    this.container.style.setProperty('--preview-surface', PREVIEW_COLORS.surface);
    this.container.style.setProperty('--preview-surface-top', PREVIEW_COLORS.surfaceTop);
    this.container.style.setProperty('--preview-wall', PREVIEW_COLORS.wall);
    this.container.style.setProperty('--preview-path', PREVIEW_COLORS.path);
    this.container.style.setProperty('--preview-connector', PREVIEW_COLORS.connector);
    this.container.style.setProperty('--preview-grid', PREVIEW_COLORS.grid);
    this.container.style.setProperty('--preview-border', PREVIEW_COLORS.border);
    this.container.style.setProperty('--preview-border-soft', PREVIEW_COLORS.borderSoft);
    this.container.style.setProperty('--preview-footer-border', PREVIEW_COLORS.footerBorder);
    this.container.style.setProperty('--preview-legend-bg', PREVIEW_COLORS.legendBg);
    this.container.style.setProperty('--preview-button-bg', PREVIEW_COLORS.buttonBg);
    this.container.style.setProperty('--preview-button-border', PREVIEW_COLORS.buttonBorder);
    this.container.style.setProperty('--preview-button-hover', PREVIEW_COLORS.buttonHover);
    this.container.style.setProperty('--preview-button-active', PREVIEW_COLORS.buttonActive);
    this.container.style.setProperty(
      '--preview-button-active-border',
      PREVIEW_COLORS.buttonActiveBorder
    );
    this.container.style.setProperty('--preview-close-active', PREVIEW_COLORS.closeActive);
    this.container.style.setProperty('--preview-resize-grip', PREVIEW_COLORS.resizeGrip);
    this.container.style.setProperty('--preview-start', PREVIEW_COLORS.markerStart);
    this.container.style.setProperty('--preview-end', PREVIEW_COLORS.markerEnd);
    this.container.style.setProperty('--preview-marker-both', PREVIEW_COLORS.markerBoth);
    this.container.style.setProperty('--preview-marker-stroke', PREVIEW_COLORS.markerStroke);
    this.container.style.setProperty('--preview-marker-text', PREVIEW_COLORS.markerText);
    this.container.style.setProperty('--preview-hide-duration', `${this.hideTransitionMs}ms`);

    // Create title bar
    this.titleBar = document.createElement('div');
    this.titleBar.className = 'preview-titlebar';
    this.titleText = document.createElement('span');
    this.titleText.className = 'preview-title-text';
    this.titleText.textContent = config.title ?? t('preview.title');

    // Create close button
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'preview-close-btn';
    this.closeButton.textContent = 'x';

    // Create hide button
    this.hideButton = document.createElement('button');
    this.hideButton.className = 'preview-hide-btn';
    this.hideButton.type = 'button';
    this.hideButton.setAttribute('title', t('preview.hide'));
    this.hideButton.textContent = '-';

    // Create grid toggle button
    this.gridToggleButton = document.createElement('button');
    this.gridToggleButton.className = 'preview-grid-btn';
    this.gridToggleButton.type = 'button';
    this.gridToggleButton.setAttribute('aria-pressed', String(this.showGrid));
    this.gridToggleButton.setAttribute('title', t('preview.toggleGrid'));
    this.gridToggleButton.textContent = t('preview.grid');
    this.gridToggleButton.classList.toggle('active', this.showGrid);

    // Create legend
    this.legend = document.createElement('div');
    this.legend.className = 'preview-legend';
    this.legendWallLabel = this.createLegendItem('wall', t('preview.wall'));
    this.legendPathLabel = this.createLegendItem('path', t('preview.path'));
    this.legendConnectorLabel = this.createLegendItem('connector', t('preview.connector'));
    this.legendStartLabel = this.createLegendItem('start', t('preview.start'));
    this.legendEndLabel = this.createLegendItem('end', t('preview.end'));

    // Create footer
    this.footer = document.createElement('div');
    this.footer.className = 'preview-footer';
    this.footer.appendChild(this.gridToggleButton);
    const layerControls = document.createElement('div');
    layerControls.className = 'preview-layer-controls';
    this.layerPrevButton = document.createElement('button');
    this.layerPrevButton.className = 'preview-layer-btn';
    this.layerPrevButton.type = 'button';
    this.layerPrevButton.textContent = '<';
    this.layerNextButton = document.createElement('button');
    this.layerNextButton.className = 'preview-layer-btn';
    this.layerNextButton.type = 'button';
    this.layerNextButton.textContent = '>';
    this.layerLabel = document.createElement('span');
    this.layerLabel.className = 'preview-layer-label';
    layerControls.appendChild(this.layerPrevButton);
    layerControls.appendChild(this.layerLabel);
    layerControls.appendChild(this.layerNextButton);
    this.footer.appendChild(layerControls);

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'preview-canvas';
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    // Assemble window
    const titleButtons = document.createElement('div');
    titleButtons.className = 'preview-title-actions';
    titleButtons.appendChild(this.hideButton);
    titleButtons.appendChild(this.closeButton);

    this.titleBar.appendChild(this.titleText);
    this.titleBar.appendChild(titleButtons);
    this.container.appendChild(this.titleBar);
    this.container.appendChild(this.legend);
    this.container.appendChild(this.canvas);
    this.container.appendChild(this.footer);
    document.body.appendChild(this.container);

    // Setup event listeners
    this.onMouseMoveHandler = e => this.onMouseMove(e);
    this.onMouseUpHandler = () => this.onMouseUp();
    this.onMouseDownHandler = e => this.onMouseDown(e);
    this.onWheelHandler = e => this.onWheel(e);
    this.onKeyDownHandler = e => this.onKeyDown(e);
    this.onContainerMouseDownHandler = () => {
      this.container.focus();
    };
    this.setupEventListeners();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.applyTranslations();

    // Initial render
    this.render();
  }

  /**
   * Setup event listeners for dragging and closing
   */
  private setupEventListeners(): void {
    // Close button
    this.closeButton.addEventListener('click', e => {
      e.stopPropagation();
      this.close();
    });

    // Hide button
    this.hideButton.addEventListener('click', e => {
      e.stopPropagation();
      this.hide();
    });
    // Grid toggle button
    this.gridToggleButton.addEventListener('click', e => {
      e.stopPropagation();
      this.showGrid = !this.showGrid;
      this.gridToggleButton.setAttribute('aria-pressed', String(this.showGrid));
      this.gridToggleButton.classList.toggle('active', this.showGrid);
      this.render();
    });
    this.layerPrevButton.addEventListener('click', e => {
      e.stopPropagation();
      this.setActiveLayer(this.activeLayerIndex - 1);
    });
    this.layerNextButton.addEventListener('click', e => {
      e.stopPropagation();
      this.setActiveLayer(this.activeLayerIndex + 1);
    });

    // Dragging
    this.titleBar.addEventListener('mousedown', this.onMouseDownHandler);
    this.canvas.addEventListener('wheel', this.onWheelHandler, { passive: false });
    this.container.addEventListener('keydown', this.onKeyDownHandler);
    this.container.addEventListener('mousedown', this.onContainerMouseDownHandler);

    // Prevent text selection while dragging
    this.titleBar.addEventListener('selectstart', e => e.preventDefault());
  }

  private attachDragListeners(): void {
    if (this.dragListenersAttached) {
      return;
    }
    document.addEventListener('mousemove', this.onMouseMoveHandler);
    document.addEventListener('mouseup', this.onMouseUpHandler);
    this.dragListenersAttached = true;
  }

  private detachDragListeners(): void {
    if (!this.dragListenersAttached) {
      return;
    }
    document.removeEventListener('mousemove', this.onMouseMoveHandler);
    document.removeEventListener('mouseup', this.onMouseUpHandler);
    this.dragListenersAttached = false;
  }

  private createLegendItem(
    typeClass: 'wall' | 'path' | 'connector' | 'start' | 'end',
    text: string
  ): HTMLSpanElement {
    const item = document.createElement('span');
    item.className = 'preview-legend-item';

    const swatch = document.createElement('i');
    swatch.className = `preview-swatch ${typeClass}`;

    const label = document.createElement('span');
    label.textContent = text;

    item.appendChild(swatch);
    item.appendChild(label);
    this.legend.appendChild(item);
    return label;
  }

  private applyTranslations(): void {
    this.titleText.textContent = t('preview.title');
    this.hideButton.setAttribute('title', t('preview.hide'));
    this.closeButton.setAttribute('title', t('preview.close'));
    this.gridToggleButton.setAttribute('title', t('preview.toggleGrid'));
    this.gridToggleButton.textContent = t('preview.grid');
    this.legendWallLabel.textContent = t('preview.wall');
    this.legendPathLabel.textContent = t('preview.path');
    this.legendConnectorLabel.textContent = t('preview.connector');
    this.legendStartLabel.textContent = t('preview.start');
    this.legendEndLabel.textContent = t('preview.end');
    this.layerPrevButton.setAttribute('title', t('preview.prevLayer'));
    this.layerNextButton.setAttribute('title', t('preview.nextLayer'));
    this.updateLayerControls();
  }

  /**
   * Mouse down handler - start dragging
   */
  private onMouseDown(e: MouseEvent): void {
    if (e.target === this.closeButton) return;

    this.isDragging = true;
    this.dragStartX = e.clientX - this.windowX;
    this.dragStartY = e.clientY - this.windowY;
    this.container.classList.add('dragging');
    this.attachDragListeners();
  }

  /**
   * Mouse move handler - update position
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    this.windowX = e.clientX - this.dragStartX;
    this.windowY = e.clientY - this.dragStartY;

    // Constrain to window bounds
    this.windowX = Math.max(0, Math.min(this.windowX, window.innerWidth - this.width));
    this.windowY = Math.max(0, Math.min(this.windowY, window.innerHeight - this.height));

    this.container.style.left = `${this.windowX}px`;
    this.container.style.top = `${this.windowY}px`;
  }

  /**
   * Mouse up handler - stop dragging
   */
  private onMouseUp(): void {
    if (!this.isDragging) {
      this.detachDragListeners();
      return;
    }
    this.isDragging = false;
    this.container.classList.remove('dragging');
    this.detachDragListeners();
  }

  private onWheel(event: WheelEvent): void {
    if ((this.mazeData?.length ?? 0) <= 1) {
      return;
    }
    event.preventDefault();
    if (event.deltaY > 0) {
      this.setActiveLayer(this.activeLayerIndex + 1);
      return;
    }
    if (event.deltaY < 0) {
      this.setActiveLayer(this.activeLayerIndex - 1);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if ((this.mazeData?.length ?? 0) <= 1) {
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      this.setActiveLayer(this.activeLayerIndex + 1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      this.setActiveLayer(this.activeLayerIndex - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.setActiveLayer(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.setActiveLayer((this.mazeData?.length ?? 1) - 1);
    }
  }

  /**
   * Update maze data and redraw
   */
  public updateMaze(
    mazeData: MazeData,
    markers?: {
      start?: MarkerPoint | null;
      end?: MarkerPoint | null;
    },
    solutionPath?: SolutionPath
  ): void {
    const previousPath = this.baseSolutionPath;
    const nextPath = solutionPath ? solutionPath.map(cell => ({ ...cell })) : [];
    const shouldAutoJump = this.hasPathChanged(previousPath, nextPath) && nextPath.length > 0;

    this.mazeData = mazeData;
    this.baseSolutionPath = nextPath;
    this.hasExplicitMarkers = !!markers;
    if (markers) {
      this.explicitStartCell = markers.start ? { ...markers.start } : null;
      this.explicitEndCell = markers.end ? { ...markers.end } : null;
    }

    if (shouldAutoJump) {
      const preferredLayerIndex = this.getPreferredLayerForPath(nextPath);
      if (preferredLayerIndex !== null) {
        this.setActiveLayer(preferredLayerIndex, true);
        return;
      }
    }

    this.setActiveLayer(this.activeLayerIndex, true);
  }

  /**
   * Render 2D maze on canvas
   */
  private render(): void {
    if (!this.activeLayerData || this.activeLayerData.length === 0) {
      this.ctx.fillStyle = PREVIEW_COLORS.background;
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      return;
    }

    if (!this.layout) {
      this.layout = computePreviewLayout(this.activeLayerData, this.canvasWidth, this.canvasHeight);
    }
    if (!this.layout) {
      return;
    }

    renderPreviewMaze({
      ctx: this.ctx,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      mazeData: this.activeLayerData,
      layout: this.layout,
      showGrid: this.showGrid,
      startCell: this.startCell,
      endCell: this.endCell,
      solutionPath: this.solutionPath,
    });
  }

  /**
   * Show the preview window
   */
  public show(): void {
    if (this.isClosed) return;
    this.isVisible = true;
    this.isHiding = false;
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    this.container.classList.remove('is-hiding');
    this.container.style.display = 'block';
  }

  /**
   * Hide the preview window
   */
  public hide(): void {
    if (this.isClosed || this.isHiding || !this.isVisible) return;
    this.isVisible = false;
    this.isHiding = true;
    if (this.onHide) {
      this.onHide();
    }

    const finalizeHide = () => {
      if (!this.isHiding || this.isClosed) return;
      this.isHiding = false;
      this.container.style.display = 'none';
      this.container.classList.remove('is-hiding');
      if (this.hideTimeoutId !== null) {
        window.clearTimeout(this.hideTimeoutId);
        this.hideTimeoutId = null;
      }
    };

    this.container.classList.add('is-hiding');
    this.hideTimeoutId = window.setTimeout(finalizeHide, this.hideTransitionMs + 40);
  }

  /**
   * Toggle visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if window is visible
   */
  public isWindowVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Re-clamp window position on viewport resize
   */
  public handleWindowResize(): void {
    const previousAnchoredX = this.getAnchoredMaxX(this.lastViewportWidth);
    const previousAnchoredY = this.getAnchoredMaxY(this.lastViewportHeight);
    const wasRightAligned = Math.abs(this.windowX - previousAnchoredX) <= 1;
    const wasBottomAligned = Math.abs(this.windowY - previousAnchoredY) <= 1;

    const maxX = Math.max(0, window.innerWidth - this.width);
    const maxY = Math.max(0, window.innerHeight - this.height);
    const anchoredX = this.getAnchoredMaxX(window.innerWidth);
    const anchoredY = this.getAnchoredMaxY(window.innerHeight);

    this.windowX = wasRightAligned ? anchoredX : Math.max(0, Math.min(this.windowX, maxX));
    this.windowY = wasBottomAligned ? anchoredY : Math.max(0, Math.min(this.windowY, maxY));
    this.lastViewportWidth = window.innerWidth;
    this.lastViewportHeight = window.innerHeight;

    this.container.style.left = `${this.windowX}px`;
    this.container.style.top = `${this.windowY}px`;
  }

  private getAnchoredMaxX(viewportWidth: number): number {
    return Math.max(0, viewportWidth - this.width - this.viewportMargin);
  }

  private getAnchoredMaxY(viewportHeight: number): number {
    return Math.max(0, viewportHeight - this.height - this.viewportMargin);
  }

  /**
   * Destroy the preview window
   */
  public close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.isVisible = false;
    this.isHiding = false;
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    if (this.onClose) {
      this.onClose();
    }
    this.destroy();
  }

  /**
   * Destroy the preview window
   */
  public destroy(): void {
    this.titleBar.removeEventListener('mousedown', this.onMouseDownHandler);
    this.canvas.removeEventListener('wheel', this.onWheelHandler);
    this.container.removeEventListener('keydown', this.onKeyDownHandler);
    this.container.removeEventListener('mousedown', this.onContainerMouseDownHandler);
    this.detachDragListeners();
    if (this.hideTimeoutId !== null) {
      window.clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }
    this.container.remove();
  }

  private setActiveLayer(nextIndex: number, forceRender: boolean = true): void {
    const layerCount = this.mazeData?.length ?? 0;
    if (layerCount === 0) {
      this.activeLayerIndex = 0;
      this.activeLayerData = null;
      this.layout = null;
      this.startCell = null;
      this.endCell = null;
      this.solutionPath = [];
      this.updateLayerControls();
      if (forceRender) {
        this.render();
      }
      return;
    }

    const clampedIndex = Math.max(0, Math.min(nextIndex, layerCount - 1));
    this.activeLayerIndex = clampedIndex;
    this.activeLayerData = this.mazeData?.[clampedIndex] ?? null;
    this.layout = this.activeLayerData
      ? computePreviewLayout(this.activeLayerData, this.canvasWidth, this.canvasHeight)
      : null;

    if (this.hasExplicitMarkers) {
      this.startCell = this.pickMarkerForLayer(this.explicitStartCell, clampedIndex);
      this.endCell = this.pickMarkerForLayer(this.explicitEndCell, clampedIndex);
    } else {
      const computed = computeMarkersFromLayer(this.activeLayerData ?? undefined);
      this.startCell = computed?.start ?? null;
      this.endCell = computed?.end ?? null;
    }

    this.solutionPath = this.baseSolutionPath
      .filter(cell => this.resolvePointLayerIndex(cell) === clampedIndex)
      .map(cell => ({ ...cell }));

    this.updateLayerControls();
    if (forceRender) {
      this.render();
    }
  }

  private updateLayerControls(): void {
    const layerCount = this.mazeData?.length ?? 0;
    const currentLayer = layerCount === 0 ? 0 : this.activeLayerIndex + 1;
    this.layerPrevButton.disabled = layerCount <= 1 || this.activeLayerIndex <= 0;
    this.layerNextButton.disabled = layerCount <= 1 || this.activeLayerIndex >= layerCount - 1;
    this.layerLabel.textContent = `${t('preview.layer')} ${currentLayer}/${Math.max(layerCount, 1)}`;
  }

  private pickMarkerForLayer(
    marker: MarkerPoint | null,
    activeLayerIndex: number
  ): MarkerPoint | null {
    if (!marker) {
      return null;
    }
    if (this.resolvePointLayerIndex(marker) !== activeLayerIndex) {
      return null;
    }
    return marker;
  }

  private resolvePointLayerIndex(point: MarkerPoint): number {
    if (typeof point.layerIndex === 'number' && Number.isInteger(point.layerIndex)) {
      return point.layerIndex;
    }
    return 0;
  }

  private hasPathChanged(previousPath: SolutionPath, nextPath: SolutionPath): boolean {
    if (previousPath.length !== nextPath.length) {
      return true;
    }

    for (let i = 0; i < nextPath.length; i += 1) {
      const prev = previousPath[i];
      const next = nextPath[i];
      if (!prev || !next) {
        return true;
      }
      if (
        prev.row !== next.row ||
        prev.col !== next.col ||
        this.resolvePointLayerIndex(prev) !== this.resolvePointLayerIndex(next)
      ) {
        return true;
      }
    }

    return false;
  }

  private getPreferredLayerForPath(path: SolutionPath): number | null {
    const firstPoint = path[0];
    if (!firstPoint || (this.mazeData?.length ?? 0) === 0) {
      return null;
    }
    const rawLayerIndex = this.resolvePointLayerIndex(firstPoint);
    const layerCount = this.mazeData?.length ?? 0;
    return Math.max(0, Math.min(rawLayerIndex, layerCount - 1));
  }
}
