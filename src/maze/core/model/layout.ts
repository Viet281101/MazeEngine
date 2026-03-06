import type { MazeCenter } from './types';

export interface LayerMetrics {
  rows: number;
  cols: number;
  center: MazeCenter;
}

export function computeLayerMetrics(
  layer: number[][] | undefined,
  cellSize: number
): LayerMetrics | null {
  const rows = layer?.length ?? 0;
  const cols = layer?.[0]?.length ?? 0;
  if (rows <= 0 || cols <= 0) {
    return null;
  }

  return {
    rows,
    cols,
    center: {
      x: (cols * cellSize) / 2 - cellSize / 2,
      z: -(rows * cellSize) / 2 + cellSize / 2,
    },
  };
}
