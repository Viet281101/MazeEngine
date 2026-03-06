export interface MarkerCell {
  row: number;
  col: number;
}

export interface MazeMarkers {
  start: MarkerCell | null;
  end: MarkerCell | null;
}

export function computeMarkersFromLayer(layer?: number[][]): MazeMarkers | null {
  if (!layer || layer.length === 0 || !Array.isArray(layer[0])) {
    return null;
  }

  const rows = layer.length;
  const cols = layer[0].length;
  const boundary: MarkerCell[] = [];
  const paths: MarkerCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (layer[row][col] !== 0) continue;
      const cell = { row, col };
      paths.push(cell);
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        boundary.push(cell);
      }
    }
  }

  let start = boundary[0] ?? null;
  let end = boundary.length > 1 ? boundary[boundary.length - 1] : null;
  if (!start) start = paths[0] ?? null;
  if (!end) end = paths.length > 1 ? paths[paths.length - 1] : start;

  return { start, end };
}
