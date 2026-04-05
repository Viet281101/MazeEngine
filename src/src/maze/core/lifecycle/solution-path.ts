import * as THREE from 'three';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import type { SolutionPath } from '../../../types/maze';
import { createSolutionPathLine, disposeSolutionPathLine } from '../../rendering';

interface UpsertSolutionPathLineParams {
  scene: THREE.Scene;
  currentLine: LineSegments2 | null;
  path: SolutionPath;
  layerIndex: number;
  maze: number[][][];
  cellSize: number;
  getLayerBaseY: (layerIndex: number) => number;
  lineWidth: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface UpsertSolutionPathLineResult {
  line: LineSegments2 | null;
}

export function clearSolutionPathLine(
  scene: THREE.Scene,
  line: LineSegments2 | null
): LineSegments2 | null {
  if (!line) {
    return null;
  }
  disposeSolutionPathLine(scene, line);
  return null;
}

export function upsertSolutionPathLine(
  params: UpsertSolutionPathLineParams
): UpsertSolutionPathLineResult {
  const clearedLine = clearSolutionPathLine(params.scene, params.currentLine);
  if (params.path.length < 2) {
    return { line: clearedLine };
  }

  if (!params.maze[params.layerIndex] || params.maze[params.layerIndex].length === 0) {
    return { line: clearedLine };
  }

  const nextLine = createSolutionPathLine(
    params.path,
    params.maze,
    params.cellSize,
    params.layerIndex,
    params.getLayerBaseY,
    params.lineWidth,
    params.viewportWidth,
    params.viewportHeight
  );
  if (!nextLine) {
    return { line: clearedLine };
  }

  params.scene.add(nextLine);
  return { line: nextLine };
}
