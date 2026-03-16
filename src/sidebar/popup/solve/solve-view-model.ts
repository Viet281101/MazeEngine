import type { MazeMarkers } from '../../../types/maze';
import {
  SOLVE_ALGORITHMS_BY_CATEGORY,
  type SolveAlgorithmCategory,
  type SolveAlgorithmDefinition,
} from '../../../solve/solve-catalog';
import { getSolveInsights } from '../../../i18n';
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

export interface AlgorithmInsight {
  timeComplexity: string;
  overview: string;
  pros: string[];
  cons: string[];
}

interface LocaleInsightDataset {
  templates: Record<string, AlgorithmInsight>;
  categoryDefaults: Record<SolveAlgorithmCategory, AlgorithmInsight>;
}

const ALGORITHM_TEMPLATE_KEY_BY_ID: Record<string, string> = {
  'chain-algorithm': 'chainAlgorithm',
  'dead-end-fill': 'deadEndFill',
  'dfs-wall-tracer': 'dfsWallTracer',
  'flood-fill': 'floodFill',
  lee: 'lee',
  'left-hand-rule': 'wallFollower',
  pledge: 'pledge',
  'random-mouse': 'randomMouse',
  'recursive-backtracking-solver': 'recursiveBacktrackingSolver',
  'right-hand-rule': 'wallFollower',
  tremaux: 'tremaux',
  'wall-follower': 'wallFollower',
  wavefront: 'wavefront',
  'bellman-ford': 'bellmanFord',
  bfs: 'bfs',
  'bidirectional-bfs': 'bidirectionalBfs',
  'bidirectional-dijkstra': 'bidirectionalDijkstra',
  dfs: 'dfs',
  dijkstra: 'dijkstra',
  'eppstein-k-shortest': 'kShortest',
  'floyd-warshall': 'floydWarshall',
  iddfs: 'iddfs',
  johnson: 'johnson',
  spfa: 'spfa',
  'uniform-cost-search': 'uniformCost',
  'yen-k-shortest': 'kShortest',
  'a-star': 'aStar',
  'anytime-repairing-a-star': 'anytimeAStar',
  'beam-search': 'beamSearch',
  'best-first-search': 'bestFirst',
  'bidirectional-a-star': 'aStar',
  'd-star-lite': 'dStarLite',
  'fringe-search': 'fringeSearch',
  'greedy-bfs': 'greedyBfs',
  'ida-star': 'idaStar',
  'jump-point-search': 'jumpPointSearch',
  'lifelong-planning-a-star': 'lifelongPlanningAStar',
  'theta-star': 'thetaStar',
  bug1: 'bug1',
  bug2: 'bug2',
  'potential-field': 'potentialField',
  'tangent-bug': 'tangentBug',
  'ant-colony': 'antColony',
  'genetic-search': 'geneticSearch',
  'q-learning': 'qLearning',
  'simulated-annealing': 'simulatedAnnealing',
};

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

export function getAlgorithmInsight(
  category: SolveAlgorithmCategory,
  algorithm: SolveAlgorithmDefinition | null
): AlgorithmInsight {
  const dataset = getSolveInsights() as LocaleInsightDataset;
  if (!algorithm) {
    return dataset.categoryDefaults[category];
  }

  const templateKey = ALGORITHM_TEMPLATE_KEY_BY_ID[algorithm.id];
  if (!templateKey) {
    return dataset.categoryDefaults[category];
  }

  return dataset.templates[templateKey] ?? dataset.categoryDefaults[category];
}
