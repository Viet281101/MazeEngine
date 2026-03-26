import type * as THREE from 'three';

export interface MazeConfig {
  wallHeight?: number;
  wallThickness?: number;
  cellSize?: number;
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface MazeCenter {
  x: number;
  z: number;
}

export interface RenderQualityInfo {
  pixelRatio: number;
  adaptiveScale: number;
  adaptiveEnabled: boolean;
}
