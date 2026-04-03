import * as THREE from 'three';
import { SOLUTION_PATH } from '../../constants/maze';
import type { SolutionPath } from '../../types/maze';

interface ResolvedPathCell {
  row: number;
  col: number;
  layerIndex: number;
  position: THREE.Vector3;
}

function cellKey(layerIndex: number, row: number, col: number): string {
  return `${layerIndex}:${row}:${col}`;
}

export function createSolutionPathLine(
  path: SolutionPath,
  maze: number[][][],
  cellSize: number,
  defaultLayerIndex: number,
  getLayerBaseY: (layerIndex: number) => number
): THREE.Line | null {
  const cellByKey = new Map<string, ResolvedPathCell>();

  path.forEach(cell => {
    const layerIndex =
      typeof cell.layerIndex === 'number' && Number.isInteger(cell.layerIndex)
        ? cell.layerIndex
        : defaultLayerIndex;
    const layer = maze[layerIndex];
    if (!layer || layer.length === 0) {
      return;
    }
    const rows = layer.length;
    const cols = layer[0]?.length ?? 0;
    if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) {
      return;
    }
    const x = cell.col * cellSize;
    const y = SOLUTION_PATH.Y_OFFSET + getLayerBaseY(layerIndex);
    const z = -cell.row * cellSize;
    cellByKey.set(cellKey(layerIndex, cell.row, cell.col), {
      row: cell.row,
      col: cell.col,
      layerIndex,
      position: new THREE.Vector3(x, y, z),
    });
  });

  if (cellByKey.size < 2) {
    return null;
  }

  const segmentPoints: THREE.Vector3[] = [];
  const neighborOffsets = [
    { dLayer: 0, dRow: 0, dCol: 1 },
    { dLayer: 0, dRow: 1, dCol: 0 },
    { dLayer: 1, dRow: 0, dCol: 0 },
  ] as const;

  cellByKey.forEach(from => {
    neighborOffsets.forEach(offset => {
      const to = cellByKey.get(
        cellKey(from.layerIndex + offset.dLayer, from.row + offset.dRow, from.col + offset.dCol)
      );
      if (!to) {
        return;
      }
      segmentPoints.push(from.position, to.position);
    });
  });

  if (segmentPoints.length < 2) {
    return null;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(segmentPoints);
  const material = new THREE.LineBasicMaterial({
    color: SOLUTION_PATH.COLOR,
    linewidth: SOLUTION_PATH.LINE_WIDTH,
    transparent: true,
    opacity: SOLUTION_PATH.OPACITY,
    depthTest: false,
  });
  const line = new THREE.LineSegments(geometry, material);
  line.renderOrder = 2;
  return line;
}

export function disposeSolutionPathLine(scene: THREE.Scene, line: THREE.Line): void {
  scene.remove(line);
  line.geometry.dispose();
  const material = line.material;
  if (Array.isArray(material)) {
    material.forEach(item => item.dispose());
  } else {
    material.dispose();
  }
}
