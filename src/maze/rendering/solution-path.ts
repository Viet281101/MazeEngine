import * as THREE from 'three';
import { SOLUTION_PATH } from '../../constants/maze';
import type { SolutionPath } from '../../types/maze';

export function createSolutionPathLine(
  path: SolutionPath,
  maze: number[][][],
  cellSize: number,
  defaultLayerIndex: number,
  getLayerBaseY: (layerIndex: number) => number
): THREE.Line | null {
  const points: THREE.Vector3[] = [];

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
    points.push(new THREE.Vector3(x, y, z));
  });

  if (points.length < 2) {
    return null;
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: SOLUTION_PATH.COLOR,
    linewidth: SOLUTION_PATH.LINE_WIDTH,
    transparent: true,
    opacity: SOLUTION_PATH.OPACITY,
    depthTest: false,
  });
  const line = new THREE.Line(geometry, material);
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
