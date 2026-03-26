import { MULTI_LAYER_MAZE } from '../../../constants/maze';
import { getIconPath } from '../../../constants/assets';
import type { CellPos, MazePopupState } from './types';

interface StaticLayerCache {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
interface HoverStyle {
  fill: string;
  stroke: string;
}

const FLOOR_COLOR = '#e6e6e6';
const WALL_COLOR = '#333';
const CONNECTOR_COLOR = '#6b90a3';
const BACKGROUND_COLOR = '#33566b';
const CONNECTOR_ARROW_ICON = new Image();
let isConnectorArrowIconReady = false;

CONNECTOR_ARROW_ICON.src = getIconPath('arrow.png');
CONNECTOR_ARROW_ICON.addEventListener('load', () => {
  isConnectorArrowIconReady = true;
});

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
      } else if (isConnectorCellValue(state.grid[r][c])) {
        cache.ctx.fillStyle = CONNECTOR_COLOR;
        cache.ctx.fillRect(c * state.cellSize, r * state.cellSize, state.cellSize, state.cellSize);
        cache.ctx.fillStyle = WALL_COLOR;
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
  if (state.grid[row][col] === 1) {
    cache.ctx.fillStyle = WALL_COLOR;
  } else if (isConnectorCellValue(state.grid[row][col])) {
    cache.ctx.fillStyle = CONNECTOR_COLOR;
  } else {
    cache.ctx.fillStyle = FLOOR_COLOR;
  }
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
  cache: StaticLayerCache,
  ghostConnectorGrid: number[][] | null = null
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
  if (ghostConnectorGrid) {
    drawGhostConnectorCells(ctx, state, ghostConnectorGrid);
  }

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

  if (state.hoverCell) {
    const hoverStyle = getHoverStyleByTool(state.tool);
    ctx.fillStyle = hoverStyle.fill;
    ctx.fillRect(
      state.hoverCell.col * state.cellSize,
      state.hoverCell.row * state.cellSize,
      state.cellSize,
      state.cellSize
    );
    ctx.strokeStyle = hoverStyle.stroke;
    ctx.lineWidth = 1 / state.scale;
    ctx.strokeRect(
      state.hoverCell.col * state.cellSize + 0.5 / state.scale,
      state.hoverCell.row * state.cellSize + 0.5 / state.scale,
      state.cellSize - 1 / state.scale,
      state.cellSize - 1 / state.scale
    );
  }

  drawConnectorDirections(ctx, state.grid, state, false);
  if (ghostConnectorGrid) {
    drawConnectorDirections(ctx, ghostConnectorGrid, state, true);
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

function getHoverStyleByTool(tool: MazePopupState['tool']): HoverStyle {
  if (tool === 'start') {
    return {
      fill: 'rgba(0, 200, 120, 0.4)',
      stroke: 'rgba(0, 128, 77, 0.75)',
    };
  }
  if (tool === 'end') {
    return {
      fill: 'rgba(220, 60, 60, 0.4)',
      stroke: 'rgba(140, 35, 35, 0.75)',
    };
  }
  if (tool === 'pen') {
    return {
      fill: 'rgba(51, 51, 51, 0.45)',
      stroke: 'rgba(15, 15, 15, 0.75)',
    };
  }
  if (tool === 'stairs') {
    return {
      fill: 'rgba(107, 144, 163, 0.45)',
      stroke: 'rgba(45, 78, 94, 0.75)',
    };
  }
  return {
    fill: 'rgba(230, 230, 230, 0.78)',
    stroke: 'rgba(102, 102, 102, 0.75)',
  };
}

function isConnectorCellValue(cell: number): boolean {
  return (
    cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  );
}

function drawConnectorDirections(
  ctx: CanvasRenderingContext2D,
  grid: number[][],
  state: MazePopupState,
  isGhost: boolean
): void {
  const radius = Math.max(2.5, state.cellSize * 0.13);
  const arrowLength = Math.max(4, state.cellSize * 0.33);
  const headSize = Math.max(2.5, state.cellSize * 0.12);
  const iconSize = Math.max(10, state.cellSize * 0.72);
  const strokeColor = isGhost ? 'rgba(0, 36, 58, 0.45)' : 'rgba(0, 36, 58, 0.95)';
  const dotColor = isGhost ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.95)';
  const lineWidth = Math.max(1, state.cellSize * 0.06);
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const direction = getDirectionVector(grid[row]?.[col] ?? -1);
      if (!direction) {
        continue;
      }
      const centerX = col * state.cellSize + state.cellSize / 2;
      const centerY = row * state.cellSize + state.cellSize / 2;
      const tipX = centerX + direction.dx * arrowLength;
      const tipY = centerY + direction.dy * arrowLength;
      const directionAngle = Math.atan2(direction.dy, direction.dx);

      if (isConnectorArrowIconReady) {
        ctx.save();
        if (isGhost) {
          ctx.globalAlpha = 0.45;
        }
        ctx.translate(centerX, centerY);
        ctx.rotate(directionAngle);
        ctx.drawImage(CONNECTOR_ARROW_ICON, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
        continue;
      }

      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      const headLeft = directionAngle + Math.PI * 0.82;
      const headRight = directionAngle - Math.PI * 0.82;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(headLeft) * headSize, tipY + Math.sin(headLeft) * headSize);
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + Math.cos(headRight) * headSize, tipY + Math.sin(headRight) * headSize);
      ctx.stroke();
    }
  }
}

function drawGhostConnectorCells(
  ctx: CanvasRenderingContext2D,
  state: MazePopupState,
  ghostConnectorGrid: number[][]
): void {
  ctx.fillStyle = 'rgba(107, 144, 163, 0.3)';
  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      if (!isConnectorCellValue(ghostConnectorGrid[row]?.[col])) {
        continue;
      }
      ctx.fillRect(col * state.cellSize, row * state.cellSize, state.cellSize, state.cellSize);
    }
  }
}

function getDirectionVector(cell: number): { dx: number; dy: number } | null {
  if (cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE) {
    return { dx: 0, dy: -1 };
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE) {
    return { dx: 1, dy: 0 };
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE) {
    return { dx: 0, dy: 1 };
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE) {
    return { dx: -1, dy: 0 };
  }
  return null;
}
