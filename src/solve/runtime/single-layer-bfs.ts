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

function toCellId(row: number, col: number, cols: number): number {
  return row * cols + col;
}

function fromCellId(cellId: number, cols: number): Cell {
  return {
    row: Math.floor(cellId / cols),
    col: cellId % cols,
  };
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
  let queueHead = 0;
  const startId = toCellId(start.row, start.col, cols);
  const endId = toCellId(end.row, end.col, cols);
  const visited = new Set<number>([startId]);
  const previous = new Map<number, number>();

  while (queueHead < queue.length) {
    const current = queue[queueHead] as Cell;
    queueHead += 1;

    if (current.row === end.row && current.col === end.col) {
      const path: SolutionPath = [];
      let cursorId: number | null = endId;

      while (cursorId !== null) {
        path.push(fromCellId(cursorId, cols));
        cursorId = previous.has(cursorId) ? (previous.get(cursorId) as number) : null;
      }

      path.reverse();
      return path;
    }

    for (const direction of DIRECTIONS) {
      const nextRow = current.row + direction.row;
      const nextCol = current.col + direction.col;

      if (!isInBounds(nextRow, nextCol, rows, cols)) {
        continue;
      }
      if (mazeLayer[nextRow][nextCol] !== 0) {
        continue;
      }
      const nextId = toCellId(nextRow, nextCol, cols);
      if (visited.has(nextId)) {
        continue;
      }

      visited.add(nextId);
      previous.set(nextId, toCellId(current.row, current.col, cols));
      queue.push({ row: nextRow, col: nextCol });
    }
  }

  return null;
}
