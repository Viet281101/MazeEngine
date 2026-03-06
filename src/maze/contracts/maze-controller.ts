import type { WebGLRenderer } from 'three';

/**
 * Interface for MazeController
 */
export interface MazeController {
  getRenderer(): WebGLRenderer;
  setBackgroundColor(color: string): void;
  updateWallColor(color: string): void;
  updateFloorColor(color: string): void;
  updateWallOpacity(opacity: number): void;
  updateFloorOpacity(opacity: number): void;
  toggleEdges(showEdges: boolean): void;
  requestRender(): void;
  setDebugOverlayVisible(visible: boolean): void;
  setPreviewVisible(visible: boolean): void;
}
