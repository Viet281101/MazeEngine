import type { MarkerPoint, SolutionPath } from '../../types/maze';

interface Cell {
  row: number;
  col: number;
}

const DIRECTIONS: readonly Cell[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function isInBounds(row: number, col: number, rows: number, cols: number): boolean {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function toKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function solveSingleLayerMazeWithBfs(
  mazeLayer: number[][],
  start: MarkerPoint,
  end: MarkerPoint
): SolutionPath | null {
  const rows = mazeLayer.length;
  if (rows === 0) {
    return null;
  }
  const cols = mazeLayer[0]?.length ?? 0;
  if (cols === 0) {
    return null;
  }

  if (!isInBounds(start.row, start.col, rows, cols) || !isInBounds(end.row, end.col, rows, cols)) {
    return null;
  }

  if (mazeLayer[start.row][start.col] !== 0 || mazeLayer[end.row][end.col] !== 0) {
    return null;
  }

  const queue: Cell[] = [{ row: start.row, col: start.col }];
  const visited = new Set<string>([toKey(start.row, start.col)]);
  const previous = new Map<string, string | null>();
  previous.set(toKey(start.row, start.col), null);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.row === end.row && current.col === end.col) {
      const path: SolutionPath = [];
      let cursorKey: string | null = toKey(end.row, end.col);

      while (cursorKey) {
        const [rowToken, colToken] = cursorKey.split(',');
        path.push({ row: Number(rowToken), col: Number(colToken) });
        cursorKey = previous.get(cursorKey) ?? null;
      }

      path.reverse();
      return path;
    }

    for (const direction of DIRECTIONS) {
      const nextRow = current.row + direction.row;
      const nextCol = current.col + direction.col;
      const nextKey = toKey(nextRow, nextCol);

      if (!isInBounds(nextRow, nextCol, rows, cols)) {
        continue;
      }
      if (mazeLayer[nextRow][nextCol] !== 0) {
        continue;
      }
      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);
      previous.set(nextKey, toKey(current.row, current.col));
      queue.push({ row: nextRow, col: nextCol });
    }
  }

  return null;
}
