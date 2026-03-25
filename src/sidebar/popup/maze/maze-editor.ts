import { MAZE_SIZE } from '../../../constants/maze';
import { t } from '../../../i18n';
import {
  applyMultiLayerStateToMaze,
  applyStateToMaze,
  clampMazeSize,
  loadCurrentMazeIntoState,
  loadCurrentMultiLayerMaze,
} from './maze-app-sync';
import {
  applyWheelZoom,
  createStaticLayerCache,
  drawMaze,
  getCellFromEvent,
  fitViewToCanvas,
  rebuildStaticLayer,
  resetView,
  updateStaticCell,
} from './maze-canvas-renderer';
import { applyToolAt, clearGrid, initGrid } from './maze-grid';
import type { CellPos, MazePopupState, MazePopupViewRefs, StairDirection, ToolMode } from './types';

const MULTI_LAYER_COUNT = {
  min: 2,
  max: 30,
} as const;
const STAIR_DIRECTIONS: readonly StairDirection[] = ['north', 'east', 'south', 'west'];

interface LayerSnapshot {
  grid: number[][];
  start: CellPos | null;
  end: CellPos | null;
}

export class MazeEditorController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly refs: MazePopupViewRefs;
  private readonly state: MazePopupState;
  private readonly staticLayer = createStaticLayerCache();
  private readonly disposers: Array<() => void> = [];
  private lastDragCell: CellPos | null = null;
  private drawFrameId: number | null = null;
  private destroyed = false;
  private readonly onContextMenu: EventListener;
  private readonly onMouseDown: EventListener;
  private readonly onMouseMove: EventListener;
  private readonly onMouseUp: EventListener;
  private readonly onMouseLeave: EventListener;
  private readonly onWheel: EventListener;
  private layerSnapshots: LayerSnapshot[] = [];
  private activeLayerIndex = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, refs: MazePopupViewRefs) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.refs = refs;
    this.state = {
      rows: this.refs.rowsInput.valueAsNumber,
      cols: this.refs.colsInput.valueAsNumber,
      grid: [],
      start: null,
      end: null,
      tool: 'pen',
      stairDirection: 'north',
      cellSize: 22,
      scale: 1,
      minScale: 0.35,
      maxScale: 6,
      offsetX: 0,
      offsetY: 0,
      isPanning: false,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
    };
    this.onContextMenu = e => (e as MouseEvent).preventDefault();
    this.onMouseDown = e => this.handleMouseDown(e as MouseEvent);
    this.onMouseMove = e => this.handleMouseMove(e as MouseEvent);
    this.onMouseUp = () => this.stopPointerActions();
    this.onMouseLeave = () => this.stopPointerActions();
    this.onWheel = e => this.handleWheel(e as WheelEvent);
  }

  public initialize(): void {
    if (this.destroyed) {
      return;
    }
    this.bindEvents();
    this.setTool('pen');
    this.updateStairDirectionPreview();
    this.rebuildFromInputs();
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.unbindEvents();
    this.stopPointerActions();
    if (this.drawFrameId !== null) {
      window.cancelAnimationFrame(this.drawFrameId);
      this.drawFrameId = null;
    }
    this.staticLayer.canvas.width = 0;
    this.staticLayer.canvas.height = 0;
  }

  private bindEvents(): void {
    this.addManagedEvent(this.refs.createBtn, 'click', () => this.rebuildFromInputs());
    this.addManagedEvent(this.refs.loadBtn, 'click', () => this.handleLoadCurrent());
    this.addManagedEvent(this.refs.clearBtn, 'click', () => this.handleClear());
    this.addManagedEvent(this.refs.applyBtn, 'click', () => this.handleApply());

    this.addManagedEvent(this.refs.toolButtons.pen, 'click', () => this.setTool('pen'));
    this.addManagedEvent(this.refs.toolButtons.eraser, 'click', () => this.setTool('eraser'));
    this.addManagedEvent(this.refs.toolButtons.start, 'click', () => this.setTool('start'));
    this.addManagedEvent(this.refs.toolButtons.end, 'click', () => this.setTool('end'));
    if (this.refs.layerTabsContainer) {
      this.addManagedEvent(this.refs.layerTabsContainer, 'scroll', () =>
        this.updateLayerTabsNavState()
      );
      this.addManagedEvent(
        this.refs.layerTabsContainer,
        'wheel',
        event => this.handleLayerTabsWheel(event as WheelEvent),
        { passive: false }
      );
    }
    if (this.refs.layerTabsPrevBtn) {
      this.addManagedEvent(this.refs.layerTabsPrevBtn, 'click', () => this.scrollLayerTabs(-1));
    }
    if (this.refs.layerTabsNextBtn) {
      this.addManagedEvent(this.refs.layerTabsNextBtn, 'click', () => this.scrollLayerTabs(1));
    }
    if (this.refs.stairsRotateLeftBtn) {
      this.addManagedEvent(this.refs.stairsRotateLeftBtn, 'click', () =>
        this.rotateStairDirection(-1)
      );
    }
    if (this.refs.stairsRotateRightBtn) {
      this.addManagedEvent(this.refs.stairsRotateRightBtn, 'click', () =>
        this.rotateStairDirection(1)
      );
    }
    if (this.refs.stairsDirectionShell) {
      this.addManagedEvent(this.refs.stairsDirectionShell, 'click', event =>
        this.pickStairDirectionFromCompass(event as MouseEvent)
      );
    }
    if (this.refs.stairsConfirmBtn) {
      this.addManagedEvent(this.refs.stairsConfirmBtn, 'click', () => this.confirmStairDirection());
    }

    this.addManagedEvent(this.canvas, 'contextmenu', this.onContextMenu);
    this.addManagedEvent(this.canvas, 'mousedown', this.onMouseDown);
    this.addManagedEvent(this.canvas, 'mousemove', this.onMouseMove);
    this.addManagedEvent(this.canvas, 'mouseup', this.onMouseUp);
    this.addManagedEvent(this.canvas, 'mouseleave', this.onMouseLeave);
    this.addManagedEvent(this.canvas, 'wheel', this.onWheel, { passive: false });
  }

  private unbindEvents(): void {
    while (this.disposers.length > 0) {
      const dispose = this.disposers.pop();
      if (dispose) {
        dispose();
      }
    }
  }

  private addManagedEvent(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.disposers.push(() => {
      target.removeEventListener(type, listener, options);
    });
  }

  private setTool(tool: ToolMode): void {
    this.state.tool = tool;
    Object.entries(this.refs.toolButtons).forEach(([key, btn]) => {
      btn.classList.toggle('is-active', key === tool);
    });
    if (this.refs.stairsBtn) {
      this.refs.stairsBtn.classList.toggle('is-active', tool === 'stairs');
    }
  }

  private rebuildFromInputs(): void {
    const rows = this.clampEditorValue(this.refs.rowsInput.valueAsNumber);
    const cols = this.clampEditorValue(this.refs.colsInput.valueAsNumber);
    const layerCount = this.getLayerCountFromInput();
    this.refs.rowsInput.valueAsNumber = rows;
    this.refs.colsInput.valueAsNumber = cols;
    this.initializeLayers(rows, cols, layerCount);
    this.activeLayerIndex = 0;
    this.state.rows = rows;
    this.state.cols = cols;
    this.state.grid = this.layerSnapshots[0].grid;
    this.state.start = null;
    this.state.end = null;
    this.renderLayerTabs();
    rebuildStaticLayer(this.staticLayer, this.state);
    resetView(this.state, this.canvas);
    this.drawNow();
  }

  private handleLoadCurrent(): void {
    if (this.refs.layersInput) {
      const loaded = loadCurrentMultiLayerMaze(MULTI_LAYER_COUNT.max);
      if (!loaded) {
        return;
      }
      this.refs.rowsInput.valueAsNumber = loaded.rows;
      this.refs.colsInput.valueAsNumber = loaded.cols;
      this.refs.layersInput.valueAsNumber = loaded.layers.length;
      this.layerSnapshots = loaded.layers;
      this.activeLayerIndex = 0;
      this.activateLayer(0);
      fitViewToCanvas(this.state, this.canvas);
      this.drawNow();
      return;
    }
    const loaded = loadCurrentMazeIntoState(this.state);
    if (!loaded) {
      return;
    }
    this.refs.rowsInput.valueAsNumber = loaded.rows;
    this.refs.colsInput.valueAsNumber = loaded.cols;
    const layerCount = this.getLayerCountFromInput();
    this.layerSnapshots = Array.from({ length: layerCount }, (_, index) =>
      index === 0
        ? {
            grid: this.state.grid,
            start: this.state.start ? { ...this.state.start } : null,
            end: this.state.end ? { ...this.state.end } : null,
          }
        : {
            grid: initGrid(loaded.rows, loaded.cols),
            start: null,
            end: null,
          }
    );
    this.activeLayerIndex = 0;
    this.renderLayerTabs();
    rebuildStaticLayer(this.staticLayer, this.state);
    fitViewToCanvas(this.state, this.canvas);
    this.drawNow();
  }

  private handleApply(): void {
    if (this.refs.layersInput) {
      this.syncActiveLayerSnapshot();
      applyMultiLayerStateToMaze(this.layerSnapshots, this.activeLayerIndex);
      return;
    }
    applyStateToMaze(this.state);
  }

  private handleClear(): void {
    clearGrid(this.state);
    this.syncActiveLayerSnapshot();
    rebuildStaticLayer(this.staticLayer, this.state);
    this.drawNow();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      this.state.isPanning = true;
      this.state.lastX = e.clientX;
      this.state.lastY = e.clientY;
      return;
    }
    if (e.button === 0) {
      if (this.shouldWarnNoUpperLayerForStairs()) {
        window.alert(t('maze.stairsNoUpperLayerAlert'));
        return;
      }
      this.state.isDrawing = true;
      this.lastDragCell = null;
      this.applyToolFromEvent(e);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastX;
      const dy = e.clientY - this.state.lastY;
      this.state.lastX = e.clientX;
      this.state.lastY = e.clientY;
      this.state.offsetX += dx;
      this.state.offsetY += dy;
      this.requestDraw();
      return;
    }
    if (this.state.isDrawing) {
      this.applyToolFromEvent(e);
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    applyWheelZoom(this.state, this.canvas, e.deltaY, e.clientX, e.clientY);
    this.requestDraw();
  }

  private applyToolFromEvent(e: MouseEvent): void {
    const cell = getCellFromEvent(this.state, this.canvas, e);
    if (!cell) {
      return;
    }
    if (
      this.lastDragCell &&
      this.lastDragCell.row === cell.row &&
      this.lastDragCell.col === cell.col
    ) {
      return;
    }
    this.lastDragCell = cell;
    if (applyToolAt(this.state, cell)) {
      this.syncActiveLayerSnapshot();
      updateStaticCell(this.staticLayer, this.state, cell.row, cell.col);
      this.requestDraw();
    }
  }

  private initializeLayers(rows: number, cols: number, layerCount: number): void {
    this.layerSnapshots = Array.from({ length: layerCount }, () => ({
      grid: initGrid(rows, cols),
      start: null,
      end: null,
    }));
  }

  private activateLayer(nextLayerIndex: number): void {
    const snapshot = this.layerSnapshots[nextLayerIndex];
    if (!snapshot) {
      return;
    }
    this.stopPointerActions();
    this.activeLayerIndex = nextLayerIndex;
    this.state.rows = snapshot.grid.length;
    this.state.cols = snapshot.grid[0]?.length ?? 0;
    this.state.grid = snapshot.grid;
    this.state.start = snapshot.start ? { ...snapshot.start } : null;
    this.state.end = snapshot.end ? { ...snapshot.end } : null;
    this.renderLayerTabs();
    rebuildStaticLayer(this.staticLayer, this.state);
    this.drawNow();
  }

  private syncActiveLayerSnapshot(): void {
    const snapshot = this.layerSnapshots[this.activeLayerIndex];
    if (!snapshot) {
      return;
    }
    snapshot.grid = this.state.grid;
    snapshot.start = this.state.start ? { ...this.state.start } : null;
    snapshot.end = this.state.end ? { ...this.state.end } : null;
  }

  private renderLayerTabs(): void {
    const container = this.refs.layerTabsContainer;
    if (!container) {
      return;
    }
    const totalLayers = this.layerSnapshots.length;
    const layerLabel = t('preview.layer');
    const useLongLabel = this.canUseLongLayerTabLabels(container, totalLayers, layerLabel);
    container.replaceChildren();
    for (let i = 0; i < totalLayers; i += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'maze-popup__layer-tab';
      button.textContent = useLongLabel ? `${layerLabel} ${i + 1}` : `L${i + 1}`;
      button.classList.toggle('is-active', i === this.activeLayerIndex);
      button.setAttribute('aria-pressed', i === this.activeLayerIndex ? 'true' : 'false');
      button.addEventListener('click', () => this.activateLayer(i));
      container.appendChild(button);
    }
    const activeTab = container.children[this.activeLayerIndex] as HTMLElement | undefined;
    activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    this.updateLayerTabsNavState();
  }

  private canUseLongLayerTabLabels(
    container: HTMLDivElement,
    totalLayers: number,
    layerLabel: string
  ): boolean {
    if (totalLayers <= 0) {
      return false;
    }
    const digitCount = String(totalLayers).length;
    const estimatedTabWidth = 16 + layerLabel.length * 7 + digitCount * 8;
    const estimatedGapWidth = 6;
    const estimatedNeededWidth =
      totalLayers * estimatedTabWidth + Math.max(0, totalLayers - 1) * estimatedGapWidth;
    return container.clientWidth >= estimatedNeededWidth;
  }

  private scrollLayerTabs(direction: -1 | 1): void {
    const container = this.refs.layerTabsContainer;
    if (!container) {
      return;
    }
    const amount = Math.max(80, Math.round(container.clientWidth * 0.55)) * direction;
    container.scrollBy({ left: amount, behavior: 'smooth' });
  }

  private handleLayerTabsWheel(event: WheelEvent): void {
    const container = this.refs.layerTabsContainer;
    if (!container) {
      return;
    }
    const dominantDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (dominantDelta === 0) {
      return;
    }
    event.preventDefault();
    container.scrollBy({ left: dominantDelta, behavior: 'auto' });
  }

  private updateLayerTabsNavState(): void {
    const container = this.refs.layerTabsContainer;
    if (!container) {
      return;
    }
    const prevBtn = this.refs.layerTabsPrevBtn;
    const nextBtn = this.refs.layerTabsNextBtn;
    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const epsilon = 1;
    if (prevBtn) {
      prevBtn.disabled = container.scrollLeft <= epsilon;
    }
    if (nextBtn) {
      nextBtn.disabled = container.scrollLeft >= maxScrollLeft - epsilon;
    }
  }

  private rotateStairDirection(delta: -1 | 1): void {
    const currentIndex = STAIR_DIRECTIONS.indexOf(this.state.stairDirection);
    const nextIndex = (currentIndex + delta + STAIR_DIRECTIONS.length) % STAIR_DIRECTIONS.length;
    this.state.stairDirection = STAIR_DIRECTIONS[nextIndex];
    this.updateStairDirectionPreview();
  }

  private pickStairDirectionFromCompass(event: MouseEvent): void {
    const shell = this.refs.stairsDirectionShell;
    if (!shell) {
      return;
    }
    const rect = shell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const deadZone = 4;
    if (Math.abs(dx) <= deadZone && Math.abs(dy) <= deadZone) {
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      this.state.stairDirection = dx > 0 ? 'east' : 'west';
    } else {
      this.state.stairDirection = dy > 0 ? 'south' : 'north';
    }
    this.updateStairDirectionPreview();
  }

  private confirmStairDirection(): void {
    this.setTool('stairs');
    if (!this.refs.stairsOverlay || !this.refs.stairsBtn) {
      return;
    }
    this.refs.stairsOverlay.hidden = true;
    this.refs.stairsBtn.classList.remove('is-open');
    this.refs.stairsBtn.setAttribute('aria-expanded', 'false');
  }

  private updateStairDirectionPreview(): void {
    if (!this.refs.stairsNavigateIcon) {
      return;
    }
    this.refs.stairsNavigateIcon.style.setProperty(
      '--maze-stairs-rotation',
      `${this.getStairDirectionAngle()}deg`
    );
  }

  private getStairDirectionAngle(): number {
    // navigate.png base orientation points to the right (east),
    // so rotate with a -90deg offset to make "north" point upward.
    if (this.state.stairDirection === 'north') {
      return -90;
    }
    if (this.state.stairDirection === 'east') {
      return 0;
    }
    if (this.state.stairDirection === 'south') {
      return 90;
    }
    return 180;
  }

  private getLayerCountFromInput(): number {
    const input = this.refs.layersInput;
    if (!input) {
      return 1;
    }
    const raw = input.valueAsNumber;
    const safe = Number.isFinite(raw) ? Math.floor(raw) : MULTI_LAYER_COUNT.min;
    const clamped = Math.max(MULTI_LAYER_COUNT.min, Math.min(MULTI_LAYER_COUNT.max, safe));
    input.valueAsNumber = clamped;
    return clamped;
  }

  private shouldWarnNoUpperLayerForStairs(): boolean {
    if (!this.refs.layersInput) {
      return false;
    }
    if (this.state.tool !== 'stairs') {
      return false;
    }
    return this.activeLayerIndex >= this.layerSnapshots.length - 1;
  }

  private stopPointerActions(): void {
    this.state.isPanning = false;
    this.state.isDrawing = false;
    this.lastDragCell = null;
  }

  private drawNow(): void {
    drawMaze(this.ctx, this.canvas, this.state, this.staticLayer, this.getGhostConnectorGrid());
  }

  private requestDraw(): void {
    if (this.destroyed) {
      return;
    }
    if (this.drawFrameId !== null) {
      return;
    }
    this.drawFrameId = window.requestAnimationFrame(() => {
      this.drawFrameId = null;
      if (!this.destroyed) {
        this.drawNow();
      }
    });
  }

  private clampEditorValue(value: number): number {
    if (!Number.isFinite(value)) {
      return MAZE_SIZE.DEFAULT_CUSTOM_EDITOR;
    }
    return clampMazeSize(value);
  }

  private getGhostConnectorGrid(): number[][] | null {
    if (!this.refs.layersInput) {
      return null;
    }
    if (this.activeLayerIndex <= 0) {
      return null;
    }
    return this.layerSnapshots[this.activeLayerIndex - 1]?.grid ?? null;
  }
}
