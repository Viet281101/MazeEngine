export type ToolMode = 'pen' | 'eraser' | 'start' | 'end';

export interface CellPos {
  row: number;
  col: number;
}

export interface MazePopupState {
  rows: number;
  cols: number;
  grid: number[][];
  start: CellPos | null;
  end: CellPos | null;
  tool: ToolMode;
  cellSize: number;
  scale: number;
  minScale: number;
  maxScale: number;
  offsetX: number;
  offsetY: number;
  isPanning: boolean;
  isDrawing: boolean;
  lastX: number;
  lastY: number;
}

export interface MazePopupViewRefs {
  controls: HTMLElement;
  rowsInput: HTMLInputElement;
  colsInput: HTMLInputElement;
  toolButtons: Record<ToolMode, HTMLButtonElement>;
  createBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  applyBtn: HTMLButtonElement;
  loadBtn: HTMLButtonElement;
}
