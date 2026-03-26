import type { MarkerPoint, MazeData, MazeMarkers } from '../../types/maze';

interface MazeMarkersInput {
  start?: MarkerPoint | null;
  end?: MarkerPoint | null;
}

type MazeApp = Window['mazeApp'];
type MazeAppResolved = NonNullable<MazeApp>;

export function getMazeAppBridge(): MazeAppResolved | null {
  const mazeApp = window.mazeApp;
  return mazeApp ?? null;
}

export function canUpdateMaze(mazeApp: MazeAppResolved | null): mazeApp is MazeAppResolved {
  return !!mazeApp && typeof mazeApp.updateMaze === 'function';
}

export function getMazeDataFromApp(mazeApp: MazeAppResolved | null): MazeData {
  if (!mazeApp) {
    return [];
  }
  if (typeof mazeApp.getMazeDataRef === 'function') {
    return mazeApp.getMazeDataRef();
  }
  if (typeof mazeApp.getMazeData === 'function') {
    return mazeApp.getMazeData();
  }
  return [];
}

export function getMazeMarkersFromApp(mazeApp: MazeAppResolved | null): MazeMarkers | null {
  if (!mazeApp || typeof mazeApp.getMazeMarkers !== 'function') {
    return null;
  }
  return mazeApp.getMazeMarkers();
}

export function updateMazePreservingCamera(
  mazeApp: MazeAppResolved,
  mazeData: MazeData,
  multiLayer: boolean,
  markers?: MazeMarkersInput
): boolean {
  if (!canUpdateMaze(mazeApp)) {
    return false;
  }

  mazeApp.updateMaze(mazeData, multiLayer, markers, {
    preserveCamera: true,
  });
  return true;
}
