export type MazeData = number[][][];

export type MarkerPoint = { row: number; col: number };
export type SolutionPath = MarkerPoint[];

export type MazeMarkers = { start: MarkerPoint | null; end: MarkerPoint | null };

export interface UpdateMazeOptions {
  preserveCamera?: boolean;
}

export interface MazeAppBridge {
  updateMaze(
    newMaze: MazeData,
    multiLayer?: boolean,
    markers?: {
      start?: MarkerPoint | null;
      end?: MarkerPoint | null;
    },
    options?: UpdateMazeOptions
  ): void;
  getMazeData(): MazeData;
  getMazeMarkers(): MazeMarkers | null;
  setSolutionPath(path: SolutionPath): void;
  clearSolutionPath(): void;
  setMeshReductionThreshold(threshold: number): void;
  getMeshReductionThreshold(): number;
  setMeshReductionEnabled(enabled: boolean): void;
  isMeshReductionEnabled(): boolean;
  reopenPreviewWindow(): void;
  canOpenNewPreviewWindow(): boolean;
}
