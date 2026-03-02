import './preview-window.css';
import { PREVIEW_COLORS } from './preview-constants';
import { computeMarkersFromLayer } from '../maze/marker-utils';
import { subscribeLanguageChange, t } from '../sidebar/i18n';
import type { SolutionPath } from '../types/maze';

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
  private legendStartLabel: HTMLSpanElement;
  private legendEndLabel: HTMLSpanElement;
  private startCell: { row: number; col: number } | null = null;
  private endCell: { row: number; col: number } | null = null;
  private showGrid: boolean = false;
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

  private isVisible: boolean = true;
  private isHiding: boolean = false;
  private hideTimeoutId: number | null = null;
  private readonly hideTransitionMs: number = 350;
  private mazeData: number[][] | null = null;
  private solutionPath: SolutionPath = [];
  private layout: {
    rows: number;
    cols: number;
    cellSize: number;
    offsetX: number;
    offsetY: number;
  } | null = null;

  private onMouseMoveHandler: (e: MouseEvent) => void;
  private onMouseUpHandler: () => void;
  private onMouseDownHandler: (e: MouseEvent) => void;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor(config: PreviewWindowConfig = {}) {
    this.onHide = config.onHide;
    this.onClose = config.onClose;

    this.width = config.width ?? 300;
    this.height = config.height ?? 320;
    const margin = 20;
    const defaultX = Math.max(margin, window.innerWidth - this.width - margin);
    const defaultY = Math.max(margin, window.innerHeight - this.height - margin);
    this.windowX = config.initialX ?? defaultX;
    this.windowY = config.initialY ?? defaultY;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'preview-window';
    this.container.style.width = `${this.width}px`;
    this.container.style.height = `${this.height}px`;
    this.container.style.left = `${this.windowX}px`;
    this.container.style.top = `${this.windowY}px`;
    this.container.style.setProperty('--preview-bg', PREVIEW_COLORS.background);
    this.container.style.setProperty('--preview-surface', PREVIEW_COLORS.surface);
    this.container.style.setProperty('--preview-surface-top', PREVIEW_COLORS.surfaceTop);
    this.container.style.setProperty('--preview-wall', PREVIEW_COLORS.wall);
    this.container.style.setProperty('--preview-path', PREVIEW_COLORS.path);
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
    this.legendStartLabel = this.createLegendItem('start', t('preview.start'));
    this.legendEndLabel = this.createLegendItem('end', t('preview.end'));

    // Create footer
    this.footer = document.createElement('div');
    this.footer.className = 'preview-footer';
    this.footer.appendChild(this.gridToggleButton);

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

    // Dragging
    this.titleBar.addEventListener('mousedown', this.onMouseDownHandler);
    document.addEventListener('mousemove', this.onMouseMoveHandler);
    document.addEventListener('mouseup', this.onMouseUpHandler);

    // Prevent text selection while dragging
    this.titleBar.addEventListener('selectstart', e => e.preventDefault());
  }

  private createLegendItem(
    typeClass: 'wall' | 'path' | 'start' | 'end',
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
    this.legendStartLabel.textContent = t('preview.start');
    this.legendEndLabel.textContent = t('preview.end');
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
    this.isDragging = false;
    this.container.classList.remove('dragging');
  }

  /**
   * Update maze data and redraw
   */
  public updateMaze(
    mazeData: number[][],
    markers?: {
      start?: { row: number; col: number } | null;
      end?: { row: number; col: number } | null;
    },
    solutionPath?: SolutionPath
  ): void {
    this.mazeData = mazeData;
    this.solutionPath = solutionPath ? solutionPath.map(cell => ({ ...cell })) : [];
    if (markers) {
      this.startCell = markers.start ?? null;
      this.endCell = markers.end ?? null;
    } else {
      const computed = computeMarkersFromLayer(mazeData);
      const start = computed?.start ?? null;
      const end = computed?.end ?? null;
      this.startCell = start;
      this.endCell = end;
    }
    this.layout = this.computeLayout(mazeData);
    this.render();
  }

  /**
   * Render 2D maze on canvas
   */
  private render(): void {
    this.ctx.fillStyle = PREVIEW_COLORS.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (!this.mazeData || this.mazeData.length === 0) {
      return;
    }

    if (!this.layout) {
      this.layout = this.computeLayout(this.mazeData);
    }
    if (!this.layout) {
      return;
    }

    const { rows, cols, cellSize, offsetX, offsetY } = this.layout;
    const mazeData = this.mazeData;

    // Draw cells
    const fillPad = this.showGrid ? 0 : 0.5;
    let currentFill: string | null = null;
    if (this.showGrid) {
      this.ctx.strokeStyle = PREVIEW_COLORS.grid;
      this.ctx.lineWidth = 1;
    }
    for (let row = 0; row < rows; row++) {
      const mazeRow = mazeData[row];
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * cellSize;
        const y = offsetY + (rows - 1 - row) * cellSize;

        const nextFill = mazeRow[col] === 1 ? PREVIEW_COLORS.wall : PREVIEW_COLORS.path;
        if (currentFill !== nextFill) {
          currentFill = nextFill;
          this.ctx.fillStyle = currentFill;
        }

        this.ctx.fillRect(x - fillPad, y - fillPad, cellSize + fillPad * 2, cellSize + fillPad * 2);

        // Draw grid lines
        if (this.showGrid) {
          this.ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }

    this.drawSolutionPath(rows, cellSize, offsetX, offsetY);

    const hasSameCell =
      this.startCell &&
      this.endCell &&
      this.startCell.row === this.endCell.row &&
      this.startCell.col === this.endCell.col;

    if (hasSameCell && this.startCell) {
      this.drawMarker(this.startCell, rows, cellSize, offsetX, offsetY, PREVIEW_COLORS.markerBoth);
    } else {
      if (this.startCell) {
        this.drawMarker(
          this.startCell,
          rows,
          cellSize,
          offsetX,
          offsetY,
          PREVIEW_COLORS.markerStart
        );
      }
      if (this.endCell) {
        this.drawMarker(this.endCell, rows, cellSize, offsetX, offsetY, PREVIEW_COLORS.markerEnd);
      }
    }
  }

  private computeLayout(mazeData: number[][]): {
    rows: number;
    cols: number;
    cellSize: number;
    offsetX: number;
    offsetY: number;
  } | null {
    const rows = mazeData.length;
    if (rows === 0) {
      return null;
    }
    const cols = mazeData[0].length;

    const cellWidth = this.canvasWidth / cols;
    const cellHeight = this.canvasHeight / rows;
    const cellSize = Math.min(cellWidth, cellHeight);

    const offsetX = (this.canvasWidth - cellSize * cols) / 2;
    const offsetY = (this.canvasHeight - cellSize * rows) / 2;

    return { rows, cols, cellSize, offsetX, offsetY };
  }

  private drawMarker(
    cell: { row: number; col: number },
    rows: number,
    cellSize: number,
    offsetX: number,
    offsetY: number,
    color: string
  ): void {
    const x = offsetX + cell.col * cellSize;
    const y = offsetY + (rows - 1 - cell.row) * cellSize;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, cellSize, cellSize);
  }

  private drawSolutionPath(rows: number, cellSize: number, offsetX: number, offsetY: number): void {
    if (this.solutionPath.length < 2) {
      return;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.strokeStyle = PREVIEW_COLORS.solutionPath;
    this.ctx.lineWidth = Math.max(2, cellSize * 0.35);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.solutionPath.forEach((cell, index) => {
      const centerX = offsetX + cell.col * cellSize + cellSize / 2;
      const centerY = offsetY + (rows - 1 - cell.row) * cellSize + cellSize / 2;
      if (index === 0) {
        this.ctx.moveTo(centerX, centerY);
      } else {
        this.ctx.lineTo(centerX, centerY);
      }
    });

    this.ctx.stroke();
    this.ctx.restore();
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
    const maxX = Math.max(0, window.innerWidth - this.width);
    const maxY = Math.max(0, window.innerHeight - this.height);

    this.windowX = Math.max(0, Math.min(this.windowX, maxX));
    this.windowY = Math.max(0, Math.min(this.windowY, maxY));

    this.container.style.left = `${this.windowX}px`;
    this.container.style.top = `${this.windowY}px`;
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
    document.removeEventListener('mousemove', this.onMouseMoveHandler);
    document.removeEventListener('mouseup', this.onMouseUpHandler);
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
}
