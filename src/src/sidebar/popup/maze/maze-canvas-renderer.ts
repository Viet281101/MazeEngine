import type { CellPos, MazePopupState } from './types';

interface StaticLayerCache {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const FLOOR_COLOR = '#e6e6e6';
const WALL_COLOR = '#333';
const BACKGROUND_COLOR = '#33566b';

export function createStaticLayerCache(): StaticLayerCache {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create static layer cache context');
  }
  return { canvas, ctx };
}

export function rebuildStaticLayer(cache: StaticLayerCache, state: MazePopupState): void {
  const width = state.cols * state.cellSize;
  const height = state.rows * state.cellSize;
  cache.canvas.width = width;
  cache.canvas.height = height;

  cache.ctx.fillStyle = FLOOR_COLOR;
  cache.ctx.fillRect(0, 0, width, height);

  cache.ctx.fillStyle = WALL_COLOR;
  for (let r = 0; r < state.rows; r += 1) {
    for (let c = 0; c < state.cols; c += 1) {
      if (state.grid[r][c] === 1) {
        cache.ctx.fillRect(c * state.cellSize, r * state.cellSize, state.cellSize, state.cellSize);
      }
    }
  }
}

export function updateStaticCell(
  cache: StaticLayerCache,
  state: MazePopupState,
  row: number,
  col: number
): void {
  cache.ctx.fillStyle = state.grid[row][col] === 1 ? WALL_COLOR : FLOOR_COLOR;
  cache.ctx.fillRect(col * state.cellSize, row * state.cellSize, state.cellSize, state.cellSize);
}

export function resetView(state: MazePopupState, canvas: HTMLCanvasElement): void {
  const gridWidth = state.cols * state.cellSize;
  const gridHeight = state.rows * state.cellSize;
  state.scale = 1;
  state.offsetX = (canvas.width - gridWidth) / 2;
  state.offsetY = (canvas.height - gridHeight) / 2;
}

export function fitViewToCanvas(state: MazePopupState, canvas: HTMLCanvasElement): void {
  const gridWidth = state.cols * state.cellSize;
  const gridHeight = state.rows * state.cellSize;
  const padding = 24;
  const availableWidth = Math.max(1, canvas.width - padding * 2);
  const availableHeight = Math.max(1, canvas.height - padding * 2);
  const fitScale = Math.min(availableWidth / gridWidth, availableHeight / gridHeight);
  const defaultInteractiveMinScale = 0.35;
  const autoFitMinScale = 0.05;
  const nextScale = clamp(Math.min(1, fitScale), autoFitMinScale, state.maxScale);

  // Keep existing behavior for small mazes and only auto-zoom out when needed.
  // Auto-fit can go below default minScale so very large mazes still fit the preview.
  // Allow wheel-zoom to return back to this overview scale after zooming in.
  state.minScale = Math.min(defaultInteractiveMinScale, nextScale);
  state.scale = nextScale;
  state.offsetX = (canvas.width - gridWidth * state.scale) / 2;
  state.offsetY = (canvas.height - gridHeight * state.scale) / 2;
}

export function drawMaze(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: MazePopupState,
  cache: StaticLayerCache
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(state.offsetX, state.offsetY);
  ctx.scale(state.scale, state.scale);

  const gridWidth = state.cols * state.cellSize;
  const gridHeight = state.rows * state.cellSize;

  ctx.drawImage(cache.canvas, 0, 0);

  if (state.start) {
    ctx.fillStyle = 'rgba(0, 200, 120, 0.85)';
    ctx.fillRect(
      state.start.col * state.cellSize,
      state.start.row * state.cellSize,
      state.cellSize,
      state.cellSize
    );
  }

  if (state.end) {
    ctx.fillStyle = 'rgba(220, 60, 60, 0.85)';
    ctx.fillRect(
      state.end.col * state.cellSize,
      state.end.row * state.cellSize,
      state.cellSize,
      state.cellSize
    );
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1 / state.scale;
  for (let c = 0; c <= state.cols; c += 1) {
    const x = c * state.cellSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gridHeight);
    ctx.stroke();
  }
  for (let r = 0; r <= state.rows; r += 1) {
    const y = r * state.cellSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(gridWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}

export function getCellFromEvent(
  state: MazePopupState,
  canvas: HTMLCanvasElement,
  e: MouseEvent
): CellPos | null {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - state.offsetX) / state.scale;
  const y = (e.clientY - rect.top - state.offsetY) / state.scale;
  const col = Math.floor(x / state.cellSize);
  const row = Math.floor(y / state.cellSize);
  if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) {
    return null;
  }
  return { row, col };
}

export function applyWheelZoom(
  state: MazePopupState,
  canvas: HTMLCanvasElement,
  deltaY: number,
  clientX: number,
  clientY: number
): void {
  const rect = canvas.getBoundingClientRect();
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;

  const zoomFactor = Math.exp(-deltaY * 0.0015);
  const nextScale = clamp(state.scale * zoomFactor, state.minScale, state.maxScale);

  const worldX = (mouseX - state.offsetX) / state.scale;
  const worldY = (mouseY - state.offsetY) / state.scale;

  state.scale = nextScale;
  state.offsetX = mouseX - worldX * state.scale;
  state.offsetY = mouseY - worldY * state.scale;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
