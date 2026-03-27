import * as THREE from 'three';
import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../../../constants/maze';
import type { MazeConfig } from './types';

interface MazeGeometryDefaults {
  wallHeight: number;
  wallThickness: number;
  cellSize: number;
}

interface MazeVisualDefaults {
  wallColor: THREE.Color;
  floorColor: THREE.Color;
  wallOpacity: number;
  floorOpacity: number;
  showEdges: boolean;
  showFloorGrid: boolean;
}

interface MazeFeatureDefaults {
  meshReductionEnabled: boolean;
  meshMergeThreshold: number;
  cameraZoomLimitEnabled: boolean;
  cameraZoomMinDistance: number;
  cameraZoomMaxDistance: number;
}

export function resolveGeometryDefaults(config: MazeConfig): MazeGeometryDefaults {
  return {
    wallHeight: config.wallHeight ?? 1,
    wallThickness: config.wallThickness ?? 0.1,
    cellSize: config.cellSize ?? 1,
  };
}

export function createVisualDefaults(): MazeVisualDefaults {
  return {
    wallColor: new THREE.Color(0x808080),
    floorColor: new THREE.Color(0xc0c0c0),
    wallOpacity: 1.0,
    floorOpacity: 1.0,
    showEdges: true,
    showFloorGrid: false,
  };
}

export function createFeatureDefaults(): MazeFeatureDefaults {
  return {
    meshReductionEnabled: MESH_REDUCTION.DEFAULT_ENABLED,
    meshMergeThreshold: MESH_REDUCTION.DEFAULT_THRESHOLD,
    cameraZoomLimitEnabled: CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED,
    cameraZoomMinDistance: CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE,
    cameraZoomMaxDistance: CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE,
  };
}
