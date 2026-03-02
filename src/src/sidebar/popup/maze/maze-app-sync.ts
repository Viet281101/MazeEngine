import { MAZE_SIZE } from '../../../constants/maze';
import { t } from '../../i18n';
import type { MazePopupState } from './types';

export interface LoadedMazeSize {
  rows: number;
  cols: number;
}

export function clampMazeSize(value: number): number {
  return Math.max(MAZE_SIZE.MIN, Math.min(MAZE_SIZE.MAX, value));
}

export function loadCurrentMazeIntoState(state: MazePopupState): LoadedMazeSize | null {
  const mazeApp = window.mazeApp;
  if (!mazeApp || typeof mazeApp.getMazeData !== 'function') {
    console.warn('mazeApp.getMazeData not available');
    return null;
  }

  const data = mazeApp.getMazeData();
  const markers =
    mazeApp && typeof mazeApp.getMazeMarkers === 'function' ? mazeApp.getMazeMarkers() : null;
  if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
    console.warn('No maze data available to load');
    return null;
  }
  if (data.length !== 1) {
    console.warn('Current maze is not single-layer. Load is blocked.');
    window.alert(t('maze.singleLayerOnlyAlert'));
    return null;
  }
  const layer = data[0];
  if (!layer || layer.length === 0 || !Array.isArray(layer[0])) {
    console.warn('Maze layer is empty');
    return null;
  }

  const rows = layer.length;
  const cols = layer[0].length;
  const nextRows = clampMazeSize(rows);
  const nextCols = clampMazeSize(cols);
  if (rows !== nextRows || cols !== nextCols) {
    console.warn('Maze size exceeds popup limits, data will be clamped');
  }

  const reversed = layer.slice().reverse();
  const grid: number[][] = [];
  for (let r = 0; r < nextRows; r += 1) {
    const row: number[] = [];
    const srcRow = reversed[r] ?? [];
    for (let c = 0; c < nextCols; c += 1) {
      const cell = srcRow[c] ?? 1;
      row.push(cell === 0 ? 0 : 1);
    }
    grid.push(row);
  }

  state.rows = nextRows;
  state.cols = nextCols;
  state.grid = grid;
  state.start = null;
  state.end = null;

  if (markers) {
    if (markers.start) {
      const popupStartRow = nextRows - 1 - markers.start.row;
      if (
        popupStartRow >= 0 &&
        popupStartRow < nextRows &&
        markers.start.col >= 0 &&
        markers.start.col < nextCols
      ) {
        state.start = { row: popupStartRow, col: markers.start.col };
      }
    }
    if (markers.end) {
      const popupEndRow = nextRows - 1 - markers.end.row;
      if (
        popupEndRow >= 0 &&
        popupEndRow < nextRows &&
        markers.end.col >= 0 &&
        markers.end.col < nextCols
      ) {
        state.end = { row: popupEndRow, col: markers.end.col };
      }
    }
  }

  return { rows: nextRows, cols: nextCols };
}

export function applyStateToMaze(state: MazePopupState): void {
  const mazeData = [state.grid.map(row => row.slice()).reverse()];
  const mazeApp = window.mazeApp;
  if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
    console.warn('mazeApp.updateMaze not available');
    return;
  }
  const start = state.start
    ? { row: state.rows - 1 - state.start.row, col: state.start.col }
    : null;
  const end = state.end ? { row: state.rows - 1 - state.end.row, col: state.end.col } : null;
  mazeApp.updateMaze(mazeData, false, {
    start,
    end,
  });
}
