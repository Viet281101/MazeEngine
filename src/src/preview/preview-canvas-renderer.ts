import { PREVIEW_COLORS } from './preview-constants';
import { getIconPath } from '../constants/assets';
import { MULTI_LAYER_MAZE } from '../constants/maze';
import type { SolutionPath } from '../types/maze';

export interface PreviewLayout {
  rows: number;
  cols: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

interface MarkerCell {
  row: number;
  col: number;
}

interface RenderPreviewMazeParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  mazeData: number[][];
  layout: PreviewLayout;
  showGrid: boolean;
  startCell: MarkerCell | null;
  endCell: MarkerCell | null;
  solutionPath: SolutionPath;
}

interface DirectionVector {
  dx: number;
  dy: number;
}

const connectorArrowImage = new Image();
connectorArrowImage.decoding = 'async';
connectorArrowImage.src = getIconPath('arrow.png');

function isConnectorCellValue(cell: number): boolean {
  return (
    cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  );
}

function getConnectorDirection(cell: number): DirectionVector | null {
  // Canvas Y-axis points downward and maze rows are vertically flipped in preview.
  if (cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE) {
    return { dx: 0, dy: 1 };
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE) {
    return { dx: 1, dy: 0 };
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE) {
    return { dx: 0, dy: -1 };
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE) {
    return { dx: -1, dy: 0 };
  }
  return null;
}

export function computePreviewLayout(
  mazeData: number[][],
  canvasWidth: number,
  canvasHeight: number
): PreviewLayout | null {
  const rows = mazeData.length;
  if (rows === 0) {
    return null;
  }
  const cols = mazeData[0].length;

  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;
  const cellSize = Math.min(cellWidth, cellHeight);

  const offsetX = (canvasWidth - cellSize * cols) / 2;
  const offsetY = (canvasHeight - cellSize * rows) / 2;

  return { rows, cols, cellSize, offsetX, offsetY };
}

export function renderPreviewMaze(params: RenderPreviewMazeParams): void {
  const {
    ctx,
    canvasWidth,
    canvasHeight,
    mazeData,
    layout,
    showGrid,
    startCell,
    endCell,
    solutionPath,
  } = params;
  const { rows, cols, cellSize, offsetX, offsetY } = layout;

  ctx.fillStyle = PREVIEW_COLORS.background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const fillPad = showGrid ? 0 : 0.5;
  let currentFill: string | null = null;
  if (showGrid) {
    ctx.strokeStyle = PREVIEW_COLORS.grid;
    ctx.lineWidth = 1;
  }

  for (let row = 0; row < rows; row++) {
    const mazeRow = mazeData[row];
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * cellSize;
      const y = offsetY + (rows - 1 - row) * cellSize;

      const cell = mazeRow[col];
      let nextFill = PREVIEW_COLORS.path;
      if (cell === 1) {
        nextFill = PREVIEW_COLORS.wall;
      } else if (isConnectorCellValue(cell)) {
        nextFill = PREVIEW_COLORS.connector;
      }
      if (currentFill !== nextFill) {
        currentFill = nextFill;
        ctx.fillStyle = currentFill;
      }

      ctx.fillRect(x - fillPad, y - fillPad, cellSize + fillPad * 2, cellSize + fillPad * 2);

      if (showGrid) {
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
      drawConnectorDirectionArrow(ctx, cell, x, y, cellSize);
    }
  }

  drawSolutionPath(ctx, solutionPath, rows, cellSize, offsetX, offsetY);

  const hasSameCell =
    startCell && endCell && startCell.row === endCell.row && startCell.col === endCell.col;

  if (hasSameCell && startCell) {
    drawMarker(ctx, startCell, rows, cellSize, offsetX, offsetY, PREVIEW_COLORS.markerBoth);
    return;
  }

  if (startCell) {
    drawMarker(ctx, startCell, rows, cellSize, offsetX, offsetY, PREVIEW_COLORS.markerStart);
  }
  if (endCell) {
    drawMarker(ctx, endCell, rows, cellSize, offsetX, offsetY, PREVIEW_COLORS.markerEnd);
  }
}

function drawConnectorDirectionArrow(
  ctx: CanvasRenderingContext2D,
  cellValue: number,
  x: number,
  y: number,
  cellSize: number
): void {
  const direction = getConnectorDirection(cellValue);
  if (!direction) {
    return;
  }
  if (cellSize < 9 || !connectorArrowImage.complete || connectorArrowImage.naturalWidth === 0) {
    return;
  }

  const centerX = x + cellSize / 2;
  const centerY = y + cellSize / 2;
  const angle = Math.atan2(direction.dy, direction.dx);
  const iconSize = cellSize * 0.68;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.drawImage(connectorArrowImage, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  cell: MarkerCell,
  rows: number,
  cellSize: number,
  offsetX: number,
  offsetY: number,
  color: string
): void {
  const x = offsetX + cell.col * cellSize;
  const y = offsetY + (rows - 1 - cell.row) * cellSize;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, cellSize, cellSize);
}

function drawSolutionPath(
  ctx: CanvasRenderingContext2D,
  solutionPath: SolutionPath,
  rows: number,
  cellSize: number,
  offsetX: number,
  offsetY: number
): void {
  if (solutionPath.length < 2) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = PREVIEW_COLORS.solutionPath;
  ctx.lineWidth = Math.max(2, cellSize * 0.35);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  solutionPath.forEach((cell, index) => {
    const centerX = offsetX + cell.col * cellSize + cellSize / 2;
    const centerY = offsetY + (rows - 1 - cell.row) * cellSize + cellSize / 2;
    if (index === 0) {
      ctx.moveTo(centerX, centerY);
    } else {
      ctx.lineTo(centerX, centerY);
    }
  });

  ctx.stroke();
  ctx.restore();
}
