import { MAZE_SIZE } from '../constants/maze';

export interface MazeMarker {
  row: number;
  col: number;
}

export interface GeneratedMazeResult {
  maze: number[][][];
  markers: {
    start: MazeMarker;
    end: MazeMarker;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createWallGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));
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

  const start: MazeMarker = { row: rows - 1, col: 1 };
  const end: MazeMarker = { row: 0, col: cols - 2 };
  layer[rows - 1][1] = 0;
  layer[rows - 2][1] = 0;
  layer[0][cols - 2] = 0;
  layer[1][cols - 2] = 0;

  return {
    maze: [layer],
    markers: {
      start,
      end,
    },
  };
}
