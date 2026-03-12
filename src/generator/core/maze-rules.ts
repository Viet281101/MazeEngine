import { MULTI_LAYER_MAZE } from '../../constants/maze';
import { solveMultiLayerMazeWithBfs } from '../../solve/runtime/multi-layer-bfs';
import { solveSingleLayerMazeWithBfs } from '../../solve/runtime/single-layer-bfs';
import type { MarkerPoint } from '../../types/maze';
import type { MazeComplexity, MazeTopologyId } from './types';

type RuleScope = 'single' | 'multi' | 'both';

interface RuleContext {
  complexity: MazeComplexity;
}

interface MazeRule {
  id: string;
  scope: RuleScope;
  fix?: (
    maze: number[][][],
    markers: { start: MarkerPoint; end: MarkerPoint },
    context: RuleContext
  ) => void;
  validate?: (
    maze: number[][][],
    markers: { start: MarkerPoint; end: MarkerPoint },
    context: RuleContext
  ) => boolean;
}

export interface GeneratedMazeLike {
  maze: number[][][];
  markers: { start: MarkerPoint; end: MarkerPoint };
}

const CONNECTOR_VALUES = new Set<number>([
  MULTI_LAYER_MAZE.OPENING_CELL_VALUE,
  MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE,
  MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE,
  MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE,
  MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE,
]);

const CONNECTOR_OFFSETS: Record<number, { row: number; col: number } | null> = {
  [MULTI_LAYER_MAZE.OPENING_CELL_VALUE]: null,
  [MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE]: { row: -1, col: 0 },
  [MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE]: { row: 0, col: 1 },
  [MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE]: { row: 1, col: 0 },
  [MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE]: { row: 0, col: -1 },
};

function isWalkable(cell: number | undefined): boolean {
  return cell !== undefined && cell !== 1;
}

function isConnector(cell: number | undefined): boolean {
  return cell !== undefined && CONNECTOR_VALUES.has(cell);
}

function resolveLayerIndex(marker: MarkerPoint): number {
  return typeof marker.layerIndex === 'number' && Number.isInteger(marker.layerIndex)
    ? marker.layerIndex
    : 0;
}

function isInBounds(maze: number[][][], layerIndex: number, row: number, col: number): boolean {
  const layer = maze[layerIndex];
  if (!layer || layer.length === 0) {
    return false;
  }
  const cols = layer[0]?.length ?? 0;
  return row >= 0 && row < layer.length && col >= 0 && col < cols;
}

function applyOuterWalls(
  maze: number[][][],
  markers: { start: MarkerPoint; end: MarkerPoint }
): void {
  const startLayer = resolveLayerIndex(markers.start);
  const endLayer = resolveLayerIndex(markers.end);

  maze.forEach((layer, layerIndex) => {
    const rows = layer.length;
    if (rows === 0) {
      return;
    }
    const cols = layer[0]?.length ?? 0;
    if (cols === 0) {
      return;
    }

    const isStart = (row: number, col: number): boolean =>
      layerIndex === startLayer && markers.start.row === row && markers.start.col === col;
    const isEnd = (row: number, col: number): boolean =>
      layerIndex === endLayer && markers.end.row === row && markers.end.col === col;

    const setBorderCell = (row: number, col: number): void => {
      if (isStart(row, col) || isEnd(row, col)) {
        layer[row][col] = 0;
      } else {
        layer[row][col] = 1;
      }
    };

    for (let col = 0; col < cols; col += 1) {
      setBorderCell(0, col);
      setBorderCell(rows - 1, col);
    }
    for (let row = 0; row < rows; row += 1) {
      setBorderCell(row, 0);
      setBorderCell(row, cols - 1);
    }
  });
}

function ensureMarkerCellsWalkable(
  maze: number[][][],
  markers: { start: MarkerPoint; end: MarkerPoint }
): void {
  const startLayer = resolveLayerIndex(markers.start);
  const endLayer = resolveLayerIndex(markers.end);

  if (isInBounds(maze, startLayer, markers.start.row, markers.start.col)) {
    maze[startLayer][markers.start.row][markers.start.col] = 0;
  }
  if (isInBounds(maze, endLayer, markers.end.row, markers.end.col)) {
    maze[endLayer][markers.end.row][markers.end.col] = 0;
  }
}

function normalizeComplexity(value: MazeComplexity | undefined): MazeComplexity {
  if (value === 'low' || value === 'high') {
    return value;
  }
  return 'normal';
}

function getSolutionPathLength(
  maze: number[][][],
  markers: { start: MarkerPoint; end: MarkerPoint }
): number | null {
  if (!Array.isArray(maze) || maze.length === 0) {
    return null;
  }
  if (!markers.start || !markers.end) {
    return null;
  }
  if (maze.length === 1) {
    const layer = maze[0];
    if (!layer) {
      return null;
    }
    const path = solveSingleLayerMazeWithBfs(layer, markers.start, markers.end);
    return path ? path.length : null;
  }
  const path = solveMultiLayerMazeWithBfs(maze, markers.start, markers.end);
  return path ? path.length : null;
}

function hasReachablePath(
  maze: number[][][],
  markers: { start: MarkerPoint; end: MarkerPoint }
): boolean {
  return getSolutionPathLength(maze, markers) !== null;
}

function hasMinimumSingleLayerPathLength(
  maze: number[][][],
  markers: { start: MarkerPoint; end: MarkerPoint },
  context: RuleContext
): boolean {
  if (maze.length !== 1) {
    return true;
  }
  const layer = maze[0];
  if (!layer || layer.length === 0) {
    return false;
  }
  const cols = layer[0]?.length ?? 0;
  if (cols === 0) {
    return false;
  }

  const pathLength = getSolutionPathLength(maze, markers);
  if (pathLength === null) {
    return false;
  }

  const rows = layer.length;
  const ratioByComplexity: Record<MazeComplexity, number> = {
    low: 0.2,
    normal: 0.35,
    high: 0.5,
  };
  const ratio = ratioByComplexity[context.complexity] ?? 0.35;
  const minLength = Math.max(6, Math.floor((rows + cols) * ratio));
  return pathLength >= minLength;
}

function connectorsNotAdjacent(maze: number[][][]): boolean {
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (let layerIndex = 0; layerIndex < maze.length; layerIndex += 1) {
    const layer = maze[layerIndex];
    if (!layer || layer.length === 0) {
      continue;
    }
    const rows = layer.length;
    const cols = layer[0]?.length ?? 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!isConnector(layer[row]?.[col])) {
          continue;
        }
        for (const dir of directions) {
          const nextRow = row + dir.row;
          const nextCol = col + dir.col;
          if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
            continue;
          }
          if (isConnector(layer[nextRow]?.[nextCol])) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

function connectorsHaveValidExits(maze: number[][][]): boolean {
  for (let layerIndex = 0; layerIndex < maze.length; layerIndex += 1) {
    const layer = maze[layerIndex];
    if (!layer || layer.length === 0) {
      continue;
    }
    const rows = layer.length;
    const cols = layer[0]?.length ?? 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cellValue = layer[row]?.[col];
        if (!isConnector(cellValue)) {
          continue;
        }

        if (layerIndex === 0) {
          return false;
        }
        const lowerLayer = maze[layerIndex - 1];
        if (!lowerLayer || !isWalkable(lowerLayer[row]?.[col])) {
          return false;
        }

        const offset = CONNECTOR_OFFSETS[cellValue as number] ?? null;
        if (offset) {
          const targetRow = row + offset.row;
          const targetCol = col + offset.col;
          if (targetRow < 0 || targetRow >= rows || targetCol < 0 || targetCol >= cols) {
            return false;
          }
          if (!isWalkable(layer[targetRow]?.[targetCol])) {
            return false;
          }
        } else {
          const hasNeighbor =
            (row > 0 && isWalkable(layer[row - 1]?.[col])) ||
            (row + 1 < rows && isWalkable(layer[row + 1]?.[col])) ||
            (col > 0 && isWalkable(layer[row]?.[col - 1])) ||
            (col + 1 < cols && isWalkable(layer[row]?.[col + 1]));
          if (!hasNeighbor) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

const RULES: readonly MazeRule[] = [
  {
    id: 'outer-walls',
    scope: 'both',
    fix: applyOuterWalls,
  },
  {
    id: 'marker-walkable',
    scope: 'both',
    fix: ensureMarkerCellsWalkable,
  },
  {
    id: 'path-exists',
    scope: 'both',
    validate: hasReachablePath,
  },
  {
    id: 'min-single-layer-path-length',
    scope: 'single',
    validate: hasMinimumSingleLayerPathLength,
  },
  {
    id: 'connectors-not-adjacent',
    scope: 'multi',
    validate: connectorsNotAdjacent,
  },
  {
    id: 'connector-exits-valid',
    scope: 'multi',
    validate: connectorsHaveValidExits,
  },
];

export const DEFAULT_GENERATION_ATTEMPTS = 6;

export function applyCommonMazeRules(
  output: GeneratedMazeLike,
  topology: MazeTopologyId,
  context?: Partial<RuleContext>
): { ok: boolean; failedRuleIds: string[] } {
  const maze = output.maze;
  const markers = output.markers;
  if (!maze || maze.length === 0) {
    return { ok: false, failedRuleIds: ['empty-maze'] };
  }
  if (!markers?.start || !markers?.end) {
    return { ok: false, failedRuleIds: ['missing-markers'] };
  }

  const inferredScope: RuleScope =
    maze.length > 1 || topology === 'multiLayerRect' ? 'multi' : 'single';

  const failed: string[] = [];
  const resolvedContext: RuleContext = {
    complexity: normalizeComplexity(context?.complexity),
  };

  RULES.forEach(rule => {
    if (rule.scope !== 'both' && rule.scope !== inferredScope) {
      return;
    }
    if (rule.fix) {
      rule.fix(maze, markers, resolvedContext);
    }
  });

  RULES.forEach(rule => {
    if (rule.scope !== 'both' && rule.scope !== inferredScope) {
      return;
    }
    if (rule.validate && !rule.validate(maze, markers, resolvedContext)) {
      failed.push(rule.id);
    }
  });

  return { ok: failed.length === 0, failedRuleIds: failed };
}
