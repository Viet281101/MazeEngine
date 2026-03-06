import { MAZE_SIZE, MULTI_LAYER_MAZE } from '../../constants/maze';
import type { ShaftDensity } from '../core/types';

export interface MazeMarker {
  row: number;
  col: number;
  layerIndex?: number;
}

export interface GeneratedMazeResult {
  maze: number[][][];
  markers: {
    start: MazeMarker;
    end: MazeMarker;
  };
}

interface GridCell {
  row: number;
  col: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createWallGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));
}

function isWalkable(cell: number | undefined): boolean {
  return cell !== undefined && cell !== 1;
}

function normalizeLayerCount(value: number | undefined): number {
  const parsed = Number.isFinite(value) ? Math.floor(value as number) : 1;
  return clamp(parsed, 1, 30);
}

function normalizeShaftDensity(value: ShaftDensity | undefined): ShaftDensity {
  if (value === 'sparse' || value === 'dense') {
    return value;
  }
  return 'normal';
}

/**
 * Generate a single-layer perfect maze using Binary Tree algorithm.
 */
export interface BinaryTreeOptions {
  /**
   * Probability to carve toward North when both directions are possible.
   * 0 means always carve East, 1 means always carve North.
   */
  northBias?: number;
  layers?: number;
  shaftDensity?: ShaftDensity;
}

function carveBinaryTreeLayer(
  rows: number,
  cols: number,
  northBias: number,
  options: { openStartEntrance: boolean; openEndExit: boolean }
): number[][] {
  const layer = createWallGrid(rows, cols);

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (row % 2 === 0 || col % 2 === 0) {
        continue;
      }

      layer[row][col] = 0;
      const canCarveNorth = row > 1;
      const canCarveEast = col < cols - 2;

      if (!canCarveNorth && !canCarveEast) {
        continue;
      }
      if (!canCarveNorth) {
        layer[row][col + 1] = 0;
        continue;
      }
      if (!canCarveEast) {
        layer[row - 1][col] = 0;
        continue;
      }

      if (Math.random() < northBias) {
        layer[row - 1][col] = 0;
      } else {
        layer[row][col + 1] = 0;
      }
    }
  }

  if (options.openStartEntrance) {
    layer[rows - 1][1] = 0;
    layer[rows - 2][1] = 0;
  }
  if (options.openEndExit) {
    layer[0][cols - 2] = 0;
    layer[1][cols - 2] = 0;
  }

  return layer;
}

function collectTransitionCandidates(
  lowerLayer: number[][],
  upperLayer: number[][],
  excluded: Set<string>
): GridCell[] {
  const rows = Math.min(lowerLayer.length, upperLayer.length);
  const cols = Math.min(lowerLayer[0]?.length ?? 0, upperLayer[0]?.length ?? 0);
  const candidates: GridCell[] = [];

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (excluded.has(`${row},${col}`)) {
        continue;
      }
      if (!isWalkable(lowerLayer[row]?.[col]) || !isWalkable(upperLayer[row]?.[col])) {
        continue;
      }
      candidates.push({ row, col });
    }
  }

  return candidates;
}

function findFallbackConnectorCandidate(
  lowerLayer: number[][],
  upperLayer: number[][],
  excluded: Set<string>
): GridCell | null {
  const rows = Math.min(lowerLayer.length, upperLayer.length);
  const cols = Math.min(lowerLayer[0]?.length ?? 0, upperLayer[0]?.length ?? 0);

  const hasUpperWalkableNeighbor = (row: number, col: number): boolean =>
    isWalkable(upperLayer[row - 1]?.[col]) ||
    isWalkable(upperLayer[row + 1]?.[col]) ||
    isWalkable(upperLayer[row]?.[col - 1]) ||
    isWalkable(upperLayer[row]?.[col + 1]);

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (excluded.has(`${row},${col}`)) {
        continue;
      }
      if (!isWalkable(lowerLayer[row]?.[col])) {
        continue;
      }
      if (hasUpperWalkableNeighbor(row, col)) {
        return { row, col };
      }
    }
  }

  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (excluded.has(`${row},${col}`)) {
        continue;
      }
      if (!isWalkable(lowerLayer[row]?.[col])) {
        continue;
      }
      upperLayer[row][col] = 0;
      if (col + 1 < cols - 1) {
        upperLayer[row][col + 1] = 0;
      } else if (col - 1 > 0) {
        upperLayer[row][col - 1] = 0;
      } else if (row + 1 < rows - 1) {
        upperLayer[row + 1][col] = 0;
      } else if (row - 1 > 0) {
        upperLayer[row - 1][col] = 0;
      }
      return { row, col };
    }
  }

  return null;
}

function pickRandomUnique<T>(items: T[], count: number): T[] {
  if (count <= 0 || items.length === 0) {
    return [];
  }

  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i] as T;
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp;
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function resolveConnectorDirection(upperLayer: number[][], row: number, col: number): number {
  const directionCandidates: Array<{ value: number; row: number; col: number }> = [
    { value: MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE, row: row - 1, col },
    { value: MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE, row, col: col + 1 },
    { value: MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE, row: row + 1, col },
    { value: MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE, row, col: col - 1 },
  ];
  const walkableNeighbors = directionCandidates.filter(candidate =>
    isWalkable(upperLayer[candidate.row]?.[candidate.col])
  );

  if (walkableNeighbors.length === 0) {
    return MULTI_LAYER_MAZE.OPENING_CELL_VALUE;
  }

  const randomIndex = Math.floor(Math.random() * walkableNeighbors.length);
  return (walkableNeighbors[randomIndex] as { value: number }).value;
}

function applyVerticalConnectors(
  layers: number[][][],
  shaftDensity: ShaftDensity,
  markers: { start: MazeMarker; end: MazeMarker }
): void {
  if (layers.length < 2) {
    return;
  }

  const ratioByDensity: Record<ShaftDensity, number> = {
    sparse: 0.015,
    normal: 0.03,
    dense: 0.06,
  };
  const ratio = ratioByDensity[shaftDensity];

  for (let layerIndex = 1; layerIndex < layers.length; layerIndex += 1) {
    const lowerLayer = layers[layerIndex - 1] as number[][];
    const upperLayer = layers[layerIndex] as number[][];
    const excluded = new Set<string>();

    if (markers.start.layerIndex === layerIndex - 1 || markers.start.layerIndex === layerIndex) {
      excluded.add(`${markers.start.row},${markers.start.col}`);
    }
    if (markers.end.layerIndex === layerIndex - 1 || markers.end.layerIndex === layerIndex) {
      excluded.add(`${markers.end.row},${markers.end.col}`);
    }

    const candidates = collectTransitionCandidates(lowerLayer, upperLayer, excluded);
    if (candidates.length === 0) {
      const fallback = findFallbackConnectorCandidate(lowerLayer, upperLayer, excluded);
      if (fallback) {
        candidates.push(fallback);
      } else {
        continue;
      }
    }

    const connectorCount = clamp(Math.round(candidates.length * ratio), 1, 8);
    const chosen = pickRandomUnique(candidates, connectorCount);
    chosen.forEach(cell => {
      upperLayer[cell.row][cell.col] = resolveConnectorDirection(upperLayer, cell.row, cell.col);
      if (!isWalkable(lowerLayer[cell.row]?.[cell.col])) {
        lowerLayer[cell.row][cell.col] = 0;
      }
    });
  }
}

export function generateBinaryTreeMaze(
  inputRows: number,
  inputCols: number,
  options: BinaryTreeOptions = {}
): GeneratedMazeResult {
  const rows = clamp(Math.floor(inputRows), MAZE_SIZE.MIN, MAZE_SIZE.MAX);
  const cols = clamp(Math.floor(inputCols), MAZE_SIZE.MIN, MAZE_SIZE.MAX);
  const northBias = clamp(
    Number.isFinite(options.northBias) ? (options.northBias as number) : 0.5,
    0,
    1
  );
  const layerCount = normalizeLayerCount(options.layers);
  const shaftDensity = normalizeShaftDensity(options.shaftDensity);

  const layers: number[][][] = [];
  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    const biasJitter = (Math.random() - 0.5) * 0.36;
    const layerBias = clamp(northBias + biasJitter, 0.05, 0.95);
    layers.push(
      carveBinaryTreeLayer(rows, cols, layerBias, {
        openStartEntrance: layerIndex === 0,
        openEndExit: layerIndex === layerCount - 1,
      })
    );
  }

  const start: MazeMarker = { row: rows - 1, col: 1, layerIndex: 0 };
  const end: MazeMarker = { row: 0, col: cols - 2, layerIndex: layerCount - 1 };
  layers[start.layerIndex ?? 0][start.row][start.col] = 0;
  layers[end.layerIndex ?? 0][end.row][end.col] = 0;

  applyVerticalConnectors(layers, shaftDensity, { start, end });

  return {
    maze: layers,
    markers: {
      start,
      end,
    },
  };
}
