import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../../../constants/maze';
import type { MazeAppBridge } from '../../../types/maze';

interface InitialSettingsValues {
  meshReductionEnabled: boolean;
  meshReductionThreshold: number;
  hideEdgesDuringInteractionEnabled: boolean;
  floorGridEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  edgesVisible: boolean;
  debugVisible: boolean;
  previewVisible: boolean;
  cameraZoomLimitEnabled: boolean;
  cameraZoomMinDistance: number;
  cameraZoomMaxDistance: number;
}

function getMazeAppBridge(): MazeAppBridge | null {
  return window.mazeApp ?? null;
}

function clampThreshold(value: number): number {
  return Math.max(
    MESH_REDUCTION.MIN_THRESHOLD,
    Math.min(
      MESH_REDUCTION.MAX_THRESHOLD,
      Number.isFinite(value) ? Math.floor(value) : MESH_REDUCTION.DEFAULT_THRESHOLD
    )
  );
}

function clampZoomMinDistance(value: number): number {
  if (!Number.isFinite(value)) {
    return CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
  }
  const clamped = Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value);
  return Math.min(CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX, clamped);
}

function clampZoomMaxDistance(value: number): number {
  if (!Number.isFinite(value)) {
    return CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;
  }
  return Math.min(
    CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX,
    Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value)
  );
}

export function getInitialSettingsValues(): InitialSettingsValues {
  const app = getMazeAppBridge();
  return {
    meshReductionEnabled:
      app && typeof app.isMeshReductionEnabled === 'function' ? app.isMeshReductionEnabled() : true,
    meshReductionThreshold:
      app && typeof app.getMeshReductionThreshold === 'function'
        ? app.getMeshReductionThreshold()
        : MESH_REDUCTION.DEFAULT_THRESHOLD,
    hideEdgesDuringInteractionEnabled:
      app && typeof app.isHideEdgesDuringInteractionEnabled === 'function'
        ? app.isHideEdgesDuringInteractionEnabled()
        : false,
    floorGridEnabled:
      app && typeof app.isFloorGridEnabled === 'function' ? app.isFloorGridEnabled() : true,
    adaptiveQualityEnabled:
      app && typeof app.isAdaptiveQualityEnabled === 'function'
        ? app.isAdaptiveQualityEnabled()
        : true,
    edgesVisible: app && typeof app.isEdgesVisible === 'function' ? app.isEdgesVisible() : true,
    debugVisible:
      app && typeof app.isDebugOverlayVisible === 'function' ? app.isDebugOverlayVisible() : true,
    previewVisible:
      app && typeof app.isPreviewVisible === 'function' ? app.isPreviewVisible() : true,
    cameraZoomLimitEnabled:
      app && typeof app.isCameraZoomLimitEnabled === 'function'
        ? app.isCameraZoomLimitEnabled()
        : CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED,
    cameraZoomMinDistance:
      app && typeof app.getCameraZoomMinDistance === 'function'
        ? app.getCameraZoomMinDistance()
        : CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE,
    cameraZoomMaxDistance:
      app && typeof app.getCameraZoomMaxDistance === 'function'
        ? app.getCameraZoomMaxDistance()
        : CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE,
  };
}

export function canOpenPreviewWindow(): boolean {
  const app = getMazeAppBridge();
  return (
    !!app &&
    typeof app.reopenPreviewWindow === 'function' &&
    typeof app.canOpenNewPreviewWindow === 'function' &&
    app.canOpenNewPreviewWindow()
  );
}

export function reopenPreviewWindow(): void {
  const app = getMazeAppBridge();
  if (app && typeof app.reopenPreviewWindow === 'function') {
    app.reopenPreviewWindow();
  }
}

export function setMeshReductionEnabled(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setMeshReductionEnabled === 'function') {
    app.setMeshReductionEnabled(enabled);
  }
}

export function applyMeshReductionThreshold(rawValue: number): number {
  const clamped = clampThreshold(rawValue);
  const app = getMazeAppBridge();
  if (app && typeof app.setMeshReductionThreshold === 'function') {
    app.setMeshReductionThreshold(clamped);
  }
  return clamped;
}

export function setHideEdgesDuringInteractionEnabled(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setHideEdgesDuringInteractionEnabled === 'function') {
    app.setHideEdgesDuringInteractionEnabled(enabled);
  }
}

export function setAdaptiveQualityEnabled(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setAdaptiveQualityEnabled === 'function') {
    app.setAdaptiveQualityEnabled(enabled);
  }
}

export function setEdgesVisible(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setEdgesVisible === 'function') {
    app.setEdgesVisible(enabled);
  }
}

export function setDebugVisible(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setDebugOverlayVisible === 'function') {
    app.setDebugOverlayVisible(enabled);
  }
}

export function setPreviewVisible(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setPreviewVisible === 'function') {
    app.setPreviewVisible(enabled);
  }
}

export function isPreviewVisible(): boolean {
  const app = getMazeAppBridge();
  if (app && typeof app.isPreviewVisible === 'function') {
    return app.isPreviewVisible();
  }
  return true;
}

export function setFloorGridEnabled(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setFloorGridEnabled === 'function') {
    app.setFloorGridEnabled(enabled);
  }
}

export function setCameraZoomLimitEnabled(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setCameraZoomLimitEnabled === 'function') {
    app.setCameraZoomLimitEnabled(enabled);
  }
}

export function applyCameraZoomMinDistance(rawValue: number): number {
  const clamped = clampZoomMinDistance(rawValue);
  const app = getMazeAppBridge();
  if (app && typeof app.setCameraZoomMinDistance === 'function') {
    app.setCameraZoomMinDistance(clamped);
  }
  return clamped;
}

export function applyCameraZoomMaxDistance(rawValue: number): number {
  const clamped = clampZoomMaxDistance(rawValue);
  const app = getMazeAppBridge();
  if (app && typeof app.setCameraZoomMaxDistance === 'function') {
    app.setCameraZoomMaxDistance(clamped);
  }
  return clamped;
}
