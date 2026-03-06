import type { MarkerPoint } from '../../types/maze';

interface MazeMarkersInput {
  start?: MarkerPoint | null;
  end?: MarkerPoint | null;
}

export function updateMazePreservingCamera(
  mazeApp: Window['mazeApp'],
  mazeData: number[][][],
  multiLayer: boolean,
  markers?: MazeMarkersInput
): boolean {
  if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
    return false;
  }

  mazeApp.updateMaze(mazeData, multiLayer, markers, {
    preserveCamera: true,
  });
  return true;
}
