import type { MazeTopologyId } from '../../../generator';
import type { MazeAppBridge } from '../../../types/maze';
import { solveSingleLayerMazeWithBfs } from '../../../solve/runtime/single-layer-bfs';

export type SolveTopology = MazeTopologyId | 'unknown';

export type SolveRunResult =
  | { status: 'appUnavailable' }
  | { status: 'singleLayerOnly' }
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

export function runSingleLayerSolve(selectedAlgorithmId: string): SolveRunResult {
  const mazeApp = getMazeAppBridge();
  if (!mazeApp) {
    return { status: 'appUnavailable' };
  }

  const mazeData =
    typeof mazeApp.getMazeDataRef === 'function' ? mazeApp.getMazeDataRef() : mazeApp.getMazeData();
  const markers = mazeApp.getMazeMarkers();
  const topology = detectTopology(mazeData);
  if (topology !== 'singleLayerRect') {
    mazeApp.clearSolutionPath();
    return { status: 'singleLayerOnly' };
  }

  if (!markers?.start || !markers?.end || mazeData.length === 0) {
    mazeApp.clearSolutionPath();
    return { status: 'markersMissing' };
  }

  const layer = mazeData[0];
  const path = solveSingleLayerMazeWithBfs(layer, markers.start, markers.end);
  if (!path) {
    mazeApp.clearSolutionPath();
    return { status: 'noPath' };
  }

  mazeApp.setSolutionPath(path);
  console.info(
    `[solve] Solved with BFS runtime (selected: ${selectedAlgorithmId}) path length=${path.length}`
  );
  return { status: 'solved', pathLength: path.length };
}
