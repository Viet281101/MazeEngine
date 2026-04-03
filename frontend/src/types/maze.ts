export type MazeData = number[][][];

export type MarkerPoint = {
  row: number;
  col: number;
  layerIndex?: number;
  // Marks the first point of a manually drawn stroke so renderers can avoid
  // connecting it to the previous stroke.
  strokeStart?: boolean;
};
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
  getMazeDataRef(): MazeData;
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
  setAllowMultipleMazePopupPanels(enabled: boolean): void;
  isAllowMultipleMazePopupPanelsEnabled(): boolean;
  setToolbarTooltipsEnabled(enabled: boolean): void;
  isToolbarTooltipsEnabled(): boolean;
  setActionBarVisible(visible: boolean): void;
  isActionBarVisible(): boolean;
  setSolutionPathLineWidth(width: number): void;
  getSolutionPathLineWidth(): number;
  setEdgesVisible(enabled: boolean): void;
  isEdgesVisible(): boolean;
  setDebugOverlayVisible(visible: boolean): void;
  isDebugOverlayVisible(): boolean;
  setPreviewVisible(visible: boolean): void;
  isPreviewVisible(): boolean;
  setCameraZoomLimitEnabled(enabled: boolean): void;
  isCameraZoomLimitEnabled(): boolean;
  setCameraZoomMinDistance(distance: number): void;
  getCameraZoomMinDistance(): number;
  setCameraZoomMaxDistance(distance: number): void;
  getCameraZoomMaxDistance(): number;
  reopenPreviewWindow(): void;
  canOpenNewPreviewWindow(): boolean;
}
