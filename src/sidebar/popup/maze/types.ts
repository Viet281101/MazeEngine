export type ToolMode = 'pen' | 'eraser' | 'start' | 'end' | 'stairs';
export type StairDirection = 'north' | 'east' | 'south' | 'west';

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
  stairDirection: StairDirection;
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
  rowsInput: HTMLInputElement;
  colsInput: HTMLInputElement;
  layersInput?: HTMLInputElement;
  layerTabsContainer?: HTMLDivElement;
  layerTabsPrevBtn?: HTMLButtonElement;
  layerTabsNextBtn?: HTMLButtonElement;
  stairsBtn?: HTMLButtonElement;
  stairsOverlay?: HTMLDivElement;
  stairsDirectionShell?: HTMLDivElement;
  stairsNavigateIcon?: HTMLImageElement;
  stairsRotateLeftBtn?: HTMLButtonElement;
  stairsRotateRightBtn?: HTMLButtonElement;
  stairsConfirmBtn?: HTMLButtonElement;
  toolButtons: Record<Exclude<ToolMode, 'stairs'>, HTMLButtonElement>;
  createBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  applyBtn: HTMLButtonElement;
  loadBtn: HTMLButtonElement;
}

export interface MazePopupViewBundle {
  controls: HTMLElement;
  accordionRows: HTMLDetailsElement[];
  singleLayerRow: HTMLDetailsElement;
  multiLayerRow?: HTMLDetailsElement;
  singleLayer: MazePopupViewRefs;
  multiLayer?: {
    refs: MazePopupViewRefs;
    canvas: HTMLCanvasElement;
  };
}
