import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
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
  getLayerBaseY: (layerIndex: number) => number,
  lineWidth: number,
  viewportWidth: number,
  viewportHeight: number
): LineSegments2 | null {
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

  const positions: number[] = [];
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
      positions.push(
        from.position.x,
        from.position.y,
        from.position.z,
        to.position.x,
        to.position.y,
        to.position.z
      );
    });
  });

  if (positions.length < 6) {
    return null;
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color: SOLUTION_PATH.COLOR,
    linewidth: lineWidth,
    transparent: true,
    opacity: SOLUTION_PATH.OPACITY,
    depthTest: false,
  });
  material.resolution.set(Math.max(1, viewportWidth), Math.max(1, viewportHeight));

  const line = new LineSegments2(geometry, material);
  line.computeLineDistances();
  line.frustumCulled = false;
  line.renderOrder = 2;
  return line;
}

export function setSolutionPathLineWidth(line: LineSegments2, width: number): void {
  (line.material as LineMaterial).linewidth = width;
}

export function updateSolutionPathLineResolution(
  line: LineSegments2,
  viewportWidth: number,
  viewportHeight: number
): void {
  (line.material as LineMaterial).resolution.set(
    Math.max(1, viewportWidth),
    Math.max(1, viewportHeight)
  );
}

export function disposeSolutionPathLine(scene: THREE.Scene, line: LineSegments2): void {
  scene.remove(line);
  (line.geometry as LineSegmentsGeometry).dispose();
  (line.material as LineMaterial).dispose();
}
