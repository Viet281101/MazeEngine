import { MAZE_SIZE, MULTI_LAYER_MAZE } from '../../../constants/maze';
import { t } from '../../../i18n';
import {
  getMazeAppBridge,
  getMazeDataFromApp,
  getMazeMarkersFromApp,
  updateMazePreservingCamera,
} from '../popup-maze-app-bridge';
import type { CellPos, MazePopupState } from './types';

export interface LoadedMazeSize {
  rows: number;
  cols: number;
}

export interface LayerSnapshotLike {
  grid: number[][];
  start: CellPos | null;
  end: CellPos | null;
}

export function clampMazeSize(value: number): number {
  return Math.max(MAZE_SIZE.MIN, Math.min(MAZE_SIZE.MAX, value));
}

export function loadCurrentMazeIntoState(state: MazePopupState): LoadedMazeSize | null {
  const mazeApp = getMazeAppBridge();
  if (
    !mazeApp ||
    (typeof mazeApp.getMazeDataRef !== 'function' && typeof mazeApp.getMazeData !== 'function')
  ) {
    console.warn('mazeApp.getMazeDataRef/getMazeData not available');
    return null;
  }

  const data = getMazeDataFromApp(mazeApp);
  const markers = getMazeMarkersFromApp(mazeApp);
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
  const mazeApp = getMazeAppBridge();
  if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
    console.warn('mazeApp.updateMaze not available');
    return;
  }
  const start = state.start
    ? { row: state.rows - 1 - state.start.row, col: state.start.col }
    : null;
  const end = state.end ? { row: state.rows - 1 - state.end.row, col: state.end.col } : null;

  if (isSameAsCurrentMaze(mazeApp, mazeData[0], start, end)) {
    return;
  }

  updateMazePreservingCamera(mazeApp, mazeData, false, { start, end });
}

export function loadCurrentMultiLayerMaze(maxLayerCount: number): {
  rows: number;
  cols: number;
  layers: LayerSnapshotLike[];
} | null {
  const mazeApp = getMazeAppBridge();
  if (
    !mazeApp ||
    (typeof mazeApp.getMazeDataRef !== 'function' && typeof mazeApp.getMazeData !== 'function')
  ) {
    console.warn('mazeApp.getMazeDataRef/getMazeData not available');
    return null;
  }

  const data = getMazeDataFromApp(mazeApp);
  const markers = getMazeMarkersFromApp(mazeApp);
  if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
    console.warn('No maze data available to load');
    return null;
  }

  const firstLayer = data[0];
  if (!firstLayer || firstLayer.length === 0 || !Array.isArray(firstLayer[0])) {
    console.warn('Maze layer is empty');
    return null;
  }

  const rows = clampMazeSize(firstLayer.length);
  const cols = clampMazeSize(firstLayer[0].length);
  const layerCount = Math.max(2, Math.min(Math.max(1, maxLayerCount), data.length || 1));

  const layers: LayerSnapshotLike[] = [];
  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    const layer = data[layerIndex];
    const reversed = Array.isArray(layer) ? layer.slice().reverse() : [];
    const nextGrid: number[][] = [];
    for (let r = 0; r < rows; r += 1) {
      const row: number[] = [];
      const srcRow = reversed[r] ?? [];
      for (let c = 0; c < cols; c += 1) {
        const cell = Number(srcRow[c] ?? 1);
        row.push(toPopupCellValueFromMaze(normalizeCellValue(cell)));
      }
      nextGrid.push(row);
    }
    layers.push({
      grid: nextGrid,
      start: null,
      end: null,
    });
  }

  if (markers?.start) {
    const startLayer = clampLayerIndex(markers.start.layerIndex, layers.length);
    const popupStartRow = rows - 1 - markers.start.row;
    if (isInBounds(popupStartRow, markers.start.col, rows, cols)) {
      layers[startLayer].start = { row: popupStartRow, col: markers.start.col };
    }
  }
  if (markers?.end) {
    const endLayer = clampLayerIndex(markers.end.layerIndex, layers.length);
    const popupEndRow = rows - 1 - markers.end.row;
    if (isInBounds(popupEndRow, markers.end.col, rows, cols)) {
      layers[endLayer].end = { row: popupEndRow, col: markers.end.col };
    }
  }

  const remappedLayerGrids = remapEngineConnectorsToPopupLayers(layers.map(layer => layer.grid));
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    layers[layerIndex].grid = remappedLayerGrids[layerIndex] ?? layers[layerIndex].grid;
  }

  return {
    rows,
    cols,
    layers,
  };
}

export function applyMultiLayerStateToMaze(
  layerSnapshots: LayerSnapshotLike[],
  activeLayerIndex: number
): void {
  if (!Array.isArray(layerSnapshots) || layerSnapshots.length === 0) {
    return;
  }
  const mazeApp = getMazeAppBridge();
  if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
    console.warn('mazeApp.updateMaze not available');
    return;
  }

  const mazeData = remapPopupConnectorsToEngineUpperLayers(
    layerSnapshots.map(layer =>
      layer.grid
        .map(row => row.map(cell => toMazeCellValueFromPopup(cell)))
        .reverse()
    )
  );
  const preferredLayer = clampLayerIndex(activeLayerIndex, layerSnapshots.length);
  const startMarker =
    mapLayerMarker(layerSnapshots[preferredLayer]?.start ?? null, preferredLayer, mazeData) ??
    findFirstLayerMarker(layerSnapshots, 'start', mazeData);
  const endMarker =
    mapLayerMarker(layerSnapshots[preferredLayer]?.end ?? null, preferredLayer, mazeData) ??
    findFirstLayerMarker(layerSnapshots, 'end', mazeData);

  updateMazePreservingCamera(mazeApp, mazeData, true, {
    start: startMarker,
    end: endMarker,
  });
}

function isSameAsCurrentMaze(
  mazeApp: Window['mazeApp'],
  nextLayer: number[][],
  nextStart: { row: number; col: number } | null,
  nextEnd: { row: number; col: number } | null
): boolean {
  if (
    !mazeApp ||
    (typeof mazeApp.getMazeDataRef !== 'function' && typeof mazeApp.getMazeData !== 'function')
  ) {
    return false;
  }

  const currentMazeData =
    typeof mazeApp.getMazeDataRef === 'function' ? mazeApp.getMazeDataRef() : mazeApp.getMazeData();
  if (!Array.isArray(currentMazeData) || currentMazeData.length !== 1) {
    return false;
  }

  const currentLayer = currentMazeData[0];
  if (!isSameLayer(currentLayer, nextLayer)) {
    return false;
  }

  if (typeof mazeApp.getMazeMarkers !== 'function') {
    return false;
  }

  const currentMarkers = mazeApp.getMazeMarkers();
  return (
    isSameMarker(currentMarkers?.start ?? null, nextStart) &&
    isSameMarker(currentMarkers?.end ?? null, nextEnd)
  );
}

function isSameLayer(currentLayer: number[][], nextLayer: number[][]): boolean {
  if (!Array.isArray(currentLayer) || currentLayer.length !== nextLayer.length) {
    return false;
  }

  for (let row = 0; row < nextLayer.length; row += 1) {
    const currentRow = currentLayer[row];
    const nextRow = nextLayer[row];
    if (!Array.isArray(currentRow) || currentRow.length !== nextRow.length) {
      return false;
    }
    for (let col = 0; col < nextRow.length; col += 1) {
      if (currentRow[col] !== nextRow[col]) {
        return false;
      }
    }
  }

  return true;
}

function isSameMarker(
  current: { row: number; col: number } | null,
  next: { row: number; col: number } | null
): boolean {
  if (!current && !next) {
    return true;
  }
  if (!current || !next) {
    return false;
  }
  return current.row === next.row && current.col === next.col;
}

function normalizeCellValue(cell: number): number {
  if (
    cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  ) {
    return cell;
  }
  return cell === 0 ? 0 : 1;
}

function clampLayerIndex(layerIndex: number | undefined, layerCount: number): number {
  const safeLayerIndex = Number.isInteger(layerIndex) ? Number(layerIndex) : 0;
  return Math.max(0, Math.min(layerCount - 1, safeLayerIndex));
}

function isInBounds(row: number, col: number, rows: number, cols: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function mapLayerMarker(
  marker: CellPos | null,
  layerIndex: number,
  mazeData: number[][][]
): { row: number; col: number; layerIndex: number } | null {
  if (!marker) {
    return null;
  }
  const layer = mazeData[layerIndex];
  if (!Array.isArray(layer) || layer.length === 0) {
    return null;
  }
  const rows = layer.length;
  return {
    row: rows - 1 - marker.row,
    col: marker.col,
    layerIndex,
  };
}

function findFirstLayerMarker(
  layerSnapshots: LayerSnapshotLike[],
  markerKey: 'start' | 'end',
  mazeData: number[][][]
): { row: number; col: number; layerIndex: number } | null {
  for (let layerIndex = 0; layerIndex < layerSnapshots.length; layerIndex += 1) {
    const marker = layerSnapshots[layerIndex]?.[markerKey] ?? null;
    const mapped = mapLayerMarker(marker, layerIndex, mazeData);
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

function remapPopupConnectorsToEngineUpperLayers(mazeData: number[][][]): number[][][] {
  if (!Array.isArray(mazeData) || mazeData.length < 2) {
    return mazeData;
  }
  const source = mazeData.map(layer => layer.map(row => row.slice()));
  const remapped = mazeData.map(layer => layer.map(row => row.slice()));

  for (let layerIndex = 0; layerIndex < source.length - 1; layerIndex += 1) {
    const lowerSource = source[layerIndex];
    const lowerTarget = remapped[layerIndex];
    const upperTarget = remapped[layerIndex + 1];
    if (!Array.isArray(lowerSource) || !Array.isArray(lowerTarget) || !Array.isArray(upperTarget)) {
      continue;
    }
    const rows = Math.min(lowerSource.length, lowerTarget.length, upperTarget.length);
    for (let row = 0; row < rows; row += 1) {
      const lowerSourceRow = lowerSource[row];
      const lowerTargetRow = lowerTarget[row];
      const upperTargetRow = upperTarget[row];
      if (
        !Array.isArray(lowerSourceRow) ||
        !Array.isArray(lowerTargetRow) ||
        !Array.isArray(upperTargetRow)
      ) {
        continue;
      }
      const cols = Math.min(lowerSourceRow.length, lowerTargetRow.length, upperTargetRow.length);
      for (let col = 0; col < cols; col += 1) {
        const cellValue = lowerSourceRow[col];
        if (!isConnectorCellValue(cellValue)) {
          continue;
        }
        upperTargetRow[col] = cellValue;
        lowerTargetRow[col] = 0;
      }
    }
  }
  return remapped;
}

function remapEngineConnectorsToPopupLayers(layers: number[][][]): number[][][] {
  if (!Array.isArray(layers) || layers.length < 2) {
    return layers;
  }
  const source = layers.map(layer => layer.map(row => row.slice()));
  const remapped = layers.map(layer => layer.map(row => row.slice()));

  for (let layerIndex = 1; layerIndex < source.length; layerIndex += 1) {
    const upperSource = source[layerIndex];
    const upperTarget = remapped[layerIndex];
    const lowerTarget = remapped[layerIndex - 1];
    if (!Array.isArray(upperSource) || !Array.isArray(upperTarget) || !Array.isArray(lowerTarget)) {
      continue;
    }
    const rows = Math.min(upperSource.length, upperTarget.length, lowerTarget.length);
    for (let row = 0; row < rows; row += 1) {
      const upperSourceRow = upperSource[row];
      const upperTargetRow = upperTarget[row];
      const lowerTargetRow = lowerTarget[row];
      if (
        !Array.isArray(upperSourceRow) ||
        !Array.isArray(upperTargetRow) ||
        !Array.isArray(lowerTargetRow)
      ) {
        continue;
      }
      const cols = Math.min(upperSourceRow.length, upperTargetRow.length, lowerTargetRow.length);
      for (let col = 0; col < cols; col += 1) {
        const cellValue = upperSourceRow[col];
        if (!isConnectorCellValue(cellValue)) {
          continue;
        }
        lowerTargetRow[col] = cellValue;
        upperTargetRow[col] = 0;
      }
    }
  }

  return remapped;
}

function isConnectorCellValue(cell: number | undefined): boolean {
  return (
    cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  );
}

function toMazeCellValueFromPopup(cell: number): number {
  if (cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE) {
    return MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE;
  }
  if (cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE) {
    return MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE;
  }
  return cell;
}

function toPopupCellValueFromMaze(cell: number): number {
  // Inverse mapping is identical for north/south swap.
  return toMazeCellValueFromPopup(cell);
}
