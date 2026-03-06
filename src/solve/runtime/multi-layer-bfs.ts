import { MULTI_LAYER_MAZE } from '../../constants/maze';
import type { MarkerPoint, SolutionPath } from '../../types/maze';

interface LayerCell {
  layerIndex: number;
  row: number;
  col: number;
}

interface CellOffset {
  row: number;
  col: number;
}

const LATERAL_DIRECTIONS: readonly CellOffset[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const CONNECTOR_DIRECTION_TO_OFFSET: Record<number, CellOffset> = {
  [MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE]: { row: -1, col: 0 },
  [MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE]: { row: 0, col: 1 },
  [MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE]: { row: 1, col: 0 },
  [MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE]: { row: 0, col: -1 },
};

function toNodeId(layerIndex: number, row: number, col: number): string {
  return `${layerIndex}:${row}:${col}`;
}

function fromNodeId(nodeId: string): LayerCell | null {
  const [layerText, rowText, colText] = nodeId.split(':');
  if (layerText === undefined || rowText === undefined || colText === undefined) {
    return null;
  }
  const layerIndex = Number.parseInt(layerText, 10);
  const row = Number.parseInt(rowText, 10);
  const col = Number.parseInt(colText, 10);
  if (!Number.isInteger(layerIndex) || !Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }
  return { layerIndex, row, col };
}

function isConnectorCellValue(cell: number): boolean {
  return (
    cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  );
}

function isWalkableCell(cell: number): boolean {
  return cell !== 1;
}

function isInBounds(mazeData: number[][][], layerIndex: number, row: number, col: number): boolean {
  const layer = mazeData[layerIndex];
  if (!layer || layer.length === 0) {
    return false;
  }
  const cols = layer[0]?.length ?? 0;
  return row >= 0 && row < layer.length && col >= 0 && col < cols;
}

function resolveLayerIndex(marker: MarkerPoint): number {
  if (typeof marker.layerIndex === 'number' && Number.isInteger(marker.layerIndex)) {
    return marker.layerIndex;
  }
  return 0;
}

function getConnectorExitTargets(
  mazeData: number[][][],
  upperLayerIndex: number,
  row: number,
  col: number
): LayerCell[] {
  if (!isInBounds(mazeData, upperLayerIndex, row, col)) {
    return [];
  }

  const upperLayer = mazeData[upperLayerIndex] as number[][];
  const connectorValue = upperLayer[row]?.[col];
  if (connectorValue === undefined || !isConnectorCellValue(connectorValue)) {
    return [];
  }

  if (connectorValue !== MULTI_LAYER_MAZE.OPENING_CELL_VALUE) {
    const offset = CONNECTOR_DIRECTION_TO_OFFSET[connectorValue];
    if (!offset) {
      return [];
    }
    const targetRow = row + offset.row;
    const targetCol = col + offset.col;
    if (!isInBounds(mazeData, upperLayerIndex, targetRow, targetCol)) {
      return [];
    }
    const targetCell = upperLayer[targetRow]?.[targetCol];
    if (targetCell === undefined || !isWalkableCell(targetCell)) {
      return [];
    }
    return [{ layerIndex: upperLayerIndex, row: targetRow, col: targetCol }];
  }

  const exits: LayerCell[] = [];
  for (const offset of LATERAL_DIRECTIONS) {
    const targetRow = row + offset.row;
    const targetCol = col + offset.col;
    if (!isInBounds(mazeData, upperLayerIndex, targetRow, targetCol)) {
      continue;
    }
    const targetCell = upperLayer[targetRow]?.[targetCol];
    if (targetCell === undefined || !isWalkableCell(targetCell)) {
      continue;
    }
    exits.push({ layerIndex: upperLayerIndex, row: targetRow, col: targetCol });
  }
  return exits;
}

export function solveMultiLayerMazeWithBfs(
  mazeData: number[][][],
  start: MarkerPoint,
  end: MarkerPoint
): SolutionPath | null {
  if (!Array.isArray(mazeData) || mazeData.length === 0) {
    return null;
  }

  const startLayer = resolveLayerIndex(start);
  const endLayer = resolveLayerIndex(end);
  if (
    !isInBounds(mazeData, startLayer, start.row, start.col) ||
    !isInBounds(mazeData, endLayer, end.row, end.col)
  ) {
    return null;
  }

  const startCell = mazeData[startLayer]?.[start.row]?.[start.col];
  const endCell = mazeData[endLayer]?.[end.row]?.[end.col];
  if (startCell === undefined || endCell === undefined) {
    return null;
  }
  if (!isWalkableCell(startCell) || !isWalkableCell(endCell)) {
    return null;
  }

  const startNode: LayerCell = { layerIndex: startLayer, row: start.row, col: start.col };
  const endNode: LayerCell = { layerIndex: endLayer, row: end.row, col: end.col };
  const endNodeId = toNodeId(endNode.layerIndex, endNode.row, endNode.col);
  const queue: LayerCell[] = [startNode];
  let queueHead = 0;
  const visited = new Set<string>([toNodeId(startNode.layerIndex, startNode.row, startNode.col)]);
  const previous = new Map<string, string>();

  while (queueHead < queue.length) {
    const current = queue[queueHead] as LayerCell;
    queueHead += 1;
    const currentId = toNodeId(current.layerIndex, current.row, current.col);

    if (currentId === endNodeId) {
      const path: SolutionPath = [];
      let cursorId: string | null = endNodeId;
      while (cursorId) {
        const cell = fromNodeId(cursorId);
        if (!cell) {
          return null;
        }
        path.push({ row: cell.row, col: cell.col, layerIndex: cell.layerIndex });
        cursorId = previous.get(cursorId) ?? null;
      }
      path.reverse();
      return path;
    }

    for (const direction of LATERAL_DIRECTIONS) {
      const nextRow = current.row + direction.row;
      const nextCol = current.col + direction.col;
      const nextLayerIndex = current.layerIndex;
      if (!isInBounds(mazeData, nextLayerIndex, nextRow, nextCol)) {
        continue;
      }
      const nextCell = mazeData[nextLayerIndex]?.[nextRow]?.[nextCol];
      if (nextCell === undefined || !isWalkableCell(nextCell)) {
        continue;
      }
      const nextId = toNodeId(nextLayerIndex, nextRow, nextCol);
      if (visited.has(nextId)) {
        continue;
      }
      visited.add(nextId);
      previous.set(nextId, currentId);
      queue.push({ layerIndex: nextLayerIndex, row: nextRow, col: nextCol });
    }

    const upLayerIndex = current.layerIndex + 1;
    if (upLayerIndex < mazeData.length) {
      const currentCellValue = mazeData[current.layerIndex]?.[current.row]?.[current.col];
      if (currentCellValue !== undefined && isWalkableCell(currentCellValue)) {
        const upTargets = getConnectorExitTargets(mazeData, upLayerIndex, current.row, current.col);
        upTargets.forEach(target => {
          const upId = toNodeId(target.layerIndex, target.row, target.col);
          if (visited.has(upId)) {
            return;
          }
          visited.add(upId);
          previous.set(upId, currentId);
          queue.push(target);
        });
      }
    }

    const downLayerIndex = current.layerIndex - 1;
    if (downLayerIndex >= 0) {
      for (const direction of LATERAL_DIRECTIONS) {
        const baseRow = current.row - direction.row;
        const baseCol = current.col - direction.col;
        if (
          !isInBounds(mazeData, current.layerIndex, baseRow, baseCol) ||
          !isInBounds(mazeData, downLayerIndex, baseRow, baseCol)
        ) {
          continue;
        }

        const lowerBaseCell = mazeData[downLayerIndex]?.[baseRow]?.[baseCol];
        if (lowerBaseCell === undefined || !isWalkableCell(lowerBaseCell)) {
          continue;
        }

        const exits = getConnectorExitTargets(mazeData, current.layerIndex, baseRow, baseCol);
        const hasExitToCurrent = exits.some(
          exitCell => exitCell.row === current.row && exitCell.col === current.col
        );
        if (!hasExitToCurrent) {
          continue;
        }

        const downId = toNodeId(downLayerIndex, baseRow, baseCol);
        if (visited.has(downId)) {
          continue;
        }
        visited.add(downId);
        previous.set(downId, currentId);
        queue.push({ layerIndex: downLayerIndex, row: baseRow, col: baseCol });
      }
    }
  }

  return null;
}
