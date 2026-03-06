import type { MazeData } from '../types/maze';

export function createInitialMazeData(): MazeData {
  return [
    [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
      [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  ];
}

/**
 * Multi-layer maze example
 * Staircase from top to bottom
 *
 * 1 = wall
 *
 * 2 = connector + auto infer direction
 *
 * 3 = north
 *
 * 4 = east
 *
 * 5 = south
 *
 * 6 = west
 */
export function createSampleMultiLayerMazeData(): MazeData {
  return [
    [
      [1, 0, 1, 1, 1, 1],
      [1, 0, 0, 1, 0, 1],
      [1, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1],
    ],
    [
      [1, 0, 1, 1, 1, 1],
      [1, 0, 4, 0, 0, 1],
      [1, 0, 0, 1, 1, 1],
      [1, 0, 0, 6, 0, 1],
      [1, 1, 1, 1, 1, 1],
    ],
  ];
}

export function createSampleSingleLayerMazeData(): MazeData {
  return [
    [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ],
  ];
}
