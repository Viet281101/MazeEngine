import { MULTI_LAYER_MAZE } from '../../../constants/maze';
import type { CellPos, MazePopupState } from './types';

export function initGrid(rows: number, cols: number): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < cols; c += 1) {
      const isBorder = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      row.push(isBorder ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

export function clearGrid(state: MazePopupState): void {
  state.grid = initGrid(state.rows, state.cols);
  state.start = null;
  state.end = null;
}

export function applyToolAt(state: MazePopupState, pos: CellPos | null): boolean {
  if (!pos) return false;
  const { row, col } = pos;
  if (state.tool === 'pen') {
    if (state.grid[row][col] === 1) {
      return false;
    }
    state.grid[row][col] = 1;
    return true;
  }
  if (state.tool === 'eraser') {
    const hadStart = !!(state.start && state.start.row === row && state.start.col === col);
    const hadEnd = !!(state.end && state.end.row === row && state.end.col === col);
    if (state.grid[row][col] === 0 && !hadStart && !hadEnd) {
      return false;
    }
    state.grid[row][col] = 0;
    if (hadStart) {
      state.start = null;
    }
    if (hadEnd) {
      state.end = null;
    }
    return true;
  }
  if (state.tool === 'start') {
    const alreadyStart = !!(state.start && state.start.row === row && state.start.col === col);
    if (alreadyStart && state.grid[row][col] === 0) {
      return false;
    }
    state.grid[row][col] = 0;
    state.start = { row, col };
    return true;
  }
  if (state.tool === 'stairs') {
    const nextValue = getStairCellValue(state.stairDirection);
    if (state.grid[row][col] === nextValue) {
      return false;
    }
    state.grid[row][col] = nextValue;
    if (state.start && state.start.row === row && state.start.col === col) {
      state.start = null;
    }
    if (state.end && state.end.row === row && state.end.col === col) {
      state.end = null;
    }
    return true;
  }
  const alreadyEnd = !!(state.end && state.end.row === row && state.end.col === col);
  if (alreadyEnd && state.grid[row][col] === 0) {
    return false;
  }
  state.grid[row][col] = 0;
  state.end = { row, col };
  return true;
}

function getStairCellValue(direction: MazePopupState['stairDirection']): number {
  if (direction === 'north') {
    return MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE;
  }
  if (direction === 'east') {
    return MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE;
  }
  if (direction === 'south') {
    return MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE;
  }
  return MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE;
}
