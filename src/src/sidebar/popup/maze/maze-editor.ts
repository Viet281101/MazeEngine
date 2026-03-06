import { MAZE_SIZE } from '../../../constants/maze';
import { applyStateToMaze, clampMazeSize, loadCurrentMazeIntoState } from './maze-app-sync';
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
import { applyToolAt, clearGrid, rebuildGrid } from './maze-grid';
import type { CellPos, MazePopupState, MazePopupViewRefs, ToolMode } from './types';

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
    this.addManagedEvent(this.refs.applyBtn, 'click', () => applyStateToMaze(this.state));

    this.addManagedEvent(this.refs.toolButtons.pen, 'click', () => this.setTool('pen'));
    this.addManagedEvent(this.refs.toolButtons.eraser, 'click', () => this.setTool('eraser'));
    this.addManagedEvent(this.refs.toolButtons.start, 'click', () => this.setTool('start'));
    this.addManagedEvent(this.refs.toolButtons.end, 'click', () => this.setTool('end'));

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
  }

  private rebuildFromInputs(): void {
    const rows = this.clampEditorValue(this.refs.rowsInput.valueAsNumber);
    const cols = this.clampEditorValue(this.refs.colsInput.valueAsNumber);
    this.refs.rowsInput.valueAsNumber = rows;
    this.refs.colsInput.valueAsNumber = cols;
    rebuildGrid(this.state, rows, cols);
    rebuildStaticLayer(this.staticLayer, this.state);
    resetView(this.state, this.canvas);
    this.drawNow();
  }

  private handleLoadCurrent(): void {
    const loaded = loadCurrentMazeIntoState(this.state);
    if (!loaded) {
      return;
    }
    this.refs.rowsInput.valueAsNumber = loaded.rows;
    this.refs.colsInput.valueAsNumber = loaded.cols;
    rebuildStaticLayer(this.staticLayer, this.state);
    fitViewToCanvas(this.state, this.canvas);
    this.drawNow();
  }

  private handleClear(): void {
    clearGrid(this.state);
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
      updateStaticCell(this.staticLayer, this.state, cell.row, cell.col);
      this.requestDraw();
    }
  }

  private stopPointerActions(): void {
    this.state.isPanning = false;
    this.state.isDrawing = false;
    this.lastDragCell = null;
  }

  private drawNow(): void {
    drawMaze(this.ctx, this.canvas, this.state, this.staticLayer);
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
}
