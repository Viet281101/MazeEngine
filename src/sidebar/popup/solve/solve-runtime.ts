import type { MazeTopologyId } from '../../../generator';
import type { MazeAppBridge } from '../../../types/maze';
import { solveMultiLayerMazeWithBfs } from '../../../solve/runtime/multi-layer-bfs';
import { solveSingleLayerMazeWithBfs } from '../../../solve/runtime/single-layer-bfs';

export type SolveTopology = MazeTopologyId | 'unknown';

export type SolveRunResult =
  | { status: 'appUnavailable' }
  | { status: 'unsupportedTopology' }
  | { status: 'markersMissing' }
  | { status: 'noPath' }
  | { status: 'solved'; pathLength: number };

export function getMazeAppBridge(): MazeAppBridge | null {
  return window.mazeApp ?? null;
}

export function detectTopology(mazeData: number[][][]): SolveTopology {
  if (!Array.isArray(mazeData) || mazeData.length === 0) {
    return 'unknown';
  }
  if (mazeData.length > 1) {
    return 'multiLayerRect';
  }

  const firstLayer = mazeData[0];
  if (!Array.isArray(firstLayer) || firstLayer.length === 0 || !Array.isArray(firstLayer[0])) {
    return 'unknown';
  }

  const cols = firstLayer[0].length;
  const isRect = firstLayer.every(row => Array.isArray(row) && row.length === cols);
  return isRect ? 'singleLayerRect' : 'unknown';
}

function normalizeMarkerLayerIndex(marker: {
  row: number;
  col: number;
  layerIndex?: number;
}): number {
  if (typeof marker.layerIndex === 'number' && Number.isInteger(marker.layerIndex)) {
    return marker.layerIndex;
  }
  return 0;
}

export function runMazeSolve(selectedAlgorithmId: string): SolveRunResult {
  const mazeApp = getMazeAppBridge();
  if (!mazeApp) {
    return { status: 'appUnavailable' };
  }

  const mazeData =
    typeof mazeApp.getMazeDataRef === 'function' ? mazeApp.getMazeDataRef() : mazeApp.getMazeData();
  const markers = mazeApp.getMazeMarkers();
  const topology = detectTopology(mazeData);
  if (topology !== 'singleLayerRect' && topology !== 'multiLayerRect') {
    mazeApp.clearSolutionPath();
    return { status: 'unsupportedTopology' };
  }

  if (!markers?.start || !markers?.end || mazeData.length === 0) {
    mazeApp.clearSolutionPath();
    return { status: 'markersMissing' };
  }

  const path =
    topology === 'singleLayerRect'
      ? solveSingleLayerMazeWithBfs(mazeData[0] ?? [], markers.start, markers.end)
      : solveMultiLayerMazeWithBfs(
          mazeData,
          { ...markers.start, layerIndex: normalizeMarkerLayerIndex(markers.start) },
          { ...markers.end, layerIndex: normalizeMarkerLayerIndex(markers.end) }
        );
  if (!path) {
    mazeApp.clearSolutionPath();
    return { status: 'noPath' };
  }

  mazeApp.setSolutionPath(path);
  console.info(
    `[solve] Solved with BFS runtime (selected: ${selectedAlgorithmId}, topology: ${topology}) path length=${path.length}`
  );
  return { status: 'solved', pathLength: path.length };
}
