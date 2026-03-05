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
  setHideEdgesDuringInteractionEnabled(enabled: boolean): void;
  isHideEdgesDuringInteractionEnabled(): boolean;
  setFloorGridEnabled(enabled: boolean): void;
  isFloorGridEnabled(): boolean;
  setAdaptiveQualityEnabled(enabled: boolean): void;
  isAdaptiveQualityEnabled(): boolean;
  setEdgesVisible(enabled: boolean): void;
  isEdgesVisible(): boolean;
  setDebugOverlayVisible(visible: boolean): void;
  isDebugOverlayVisible(): boolean;
  setPreviewVisible(visible: boolean): void;
  isPreviewVisible(): boolean;
  isPreviewSupported(): boolean;
  setCameraZoomLimitEnabled(enabled: boolean): void;
  isCameraZoomLimitEnabled(): boolean;
  setCameraZoomMinDistance(distance: number): void;
  getCameraZoomMinDistance(): number;
  setCameraZoomMaxDistance(distance: number): void;
  getCameraZoomMaxDistance(): number;
  reopenPreviewWindow(): void;
  canOpenNewPreviewWindow(): boolean;
}
