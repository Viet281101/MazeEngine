import * as THREE from 'three';
import type { SolutionPath } from '../../../types/maze';
import { createSolutionPathLine, disposeSolutionPathLine } from '../../rendering';

interface UpsertSolutionPathLineParams {
  scene: THREE.Scene;
  currentLine: THREE.Line | null;
  path: SolutionPath;
  layerIndex: number;
  maze: number[][][];
  cellSize: number;
  getLayerBaseY: (layerIndex: number) => number;
}

interface UpsertSolutionPathLineResult {
  line: THREE.Line | null;
}

export function clearSolutionPathLine(
  scene: THREE.Scene,
  line: THREE.Line | null
): THREE.Line | null {
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

  const targetLayer = params.maze[params.layerIndex];
  if (!targetLayer || targetLayer.length === 0) {
    return { line: clearedLine };
  }

  const nextLine = createSolutionPathLine(
    params.path,
    targetLayer,
    params.cellSize,
    params.getLayerBaseY(params.layerIndex)
  );
  if (!nextLine) {
    return { line: clearedLine };
  }

  params.scene.add(nextLine);
  return { line: nextLine };
}
