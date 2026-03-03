import type { MazeMarkers } from '../../../types/maze';
import {
  SOLVE_ALGORITHMS_BY_CATEGORY,
  type SolveAlgorithmCategory,
  type SolveAlgorithmDefinition,
} from '../../../solve/solve-catalog';
import type { SolveTopology } from './solve-runtime';

type MarkerStatusKey =
  | 'solve.markers.ready'
  | 'solve.markers.missingBoth'
  | 'solve.markers.missingStart'
  | 'solve.markers.missingEnd';

export interface MazeInfoSnapshot {
  topology: SolveTopology;
  rows: number;
  cols: number;
  layers: number;
  hasReadyMarkers: boolean;
  markerStatusKey: MarkerStatusKey;
}

export function createMazeInfoSnapshot(
  topology: SolveTopology,
  mazeData: number[][][],
  markers: MazeMarkers | null
): MazeInfoSnapshot {
  const firstLayer = mazeData[0];
  const rows = firstLayer?.length ?? 0;
  const cols = firstLayer?.[0]?.length ?? 0;
  const layers = mazeData.length;

  const hasStart = !!markers?.start;
  const hasEnd = !!markers?.end;
  let markerStatusKey: MarkerStatusKey;
  if (hasStart && hasEnd) {
    markerStatusKey = 'solve.markers.ready';
  } else if (!hasStart && !hasEnd) {
    markerStatusKey = 'solve.markers.missingBoth';
  } else if (!hasStart) {
    markerStatusKey = 'solve.markers.missingStart';
  } else {
    markerStatusKey = 'solve.markers.missingEnd';
  }

  return {
    topology,
    rows,
    cols,
    layers,
    hasReadyMarkers: hasStart && hasEnd,
    markerStatusKey,
  };
}

export function getAlgorithmsForCategory(
  category: SolveAlgorithmCategory
): readonly SolveAlgorithmDefinition[] {
  return SOLVE_ALGORITHMS_BY_CATEGORY[category];
}

export function findAlgorithmById(
  category: SolveAlgorithmCategory,
  id: string
): SolveAlgorithmDefinition | null {
  return getAlgorithmsForCategory(category).find(algorithm => algorithm.id === id) ?? null;
}
