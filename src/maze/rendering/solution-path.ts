import * as THREE from 'three';
import { SOLUTION_PATH } from '../../constants/maze';
import type { SolutionPath } from '../../types/maze';

export function createSolutionPathLine(
  path: SolutionPath,
  targetLayer: number[][],
  cellSize: number,
  layerBaseY: number
): THREE.Line | null {
  const rows = targetLayer.length;
  const cols = targetLayer[0]?.length ?? 0;
  const points: THREE.Vector3[] = [];

  path.forEach(cell => {
    if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) {
      return;
    }
    const x = cell.col * cellSize;
    const y = SOLUTION_PATH.Y_OFFSET + layerBaseY;
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
