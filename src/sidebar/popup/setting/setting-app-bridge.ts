import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../../../constants/maze';
import {
  normalizeCameraZoomMaxDistance,
  normalizeCameraZoomMinDistance,
  normalizeMeshReductionThreshold,
} from '../../../utils/maze-normalizers';
import { getMazeAppBridge } from '../popup-maze-app-bridge';

interface InitialSettingsValues {
  meshReductionEnabled: boolean;
  meshReductionThreshold: number;
  hideEdgesDuringInteractionEnabled: boolean;
  floorGridEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  allowMultipleMazePopupPanels: boolean;
  toolbarTooltipsEnabled: boolean;
  edgesVisible: boolean;
  debugVisible: boolean;
  previewVisible: boolean;
  cameraZoomLimitEnabled: boolean;
  cameraZoomMinDistance: number;
  cameraZoomMaxDistance: number;
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
    allowMultipleMazePopupPanels:
      app && typeof app.isAllowMultipleMazePopupPanelsEnabled === 'function'
        ? app.isAllowMultipleMazePopupPanelsEnabled()
        : false,
    toolbarTooltipsEnabled:
      app && typeof app.isToolbarTooltipsEnabled === 'function'
        ? app.isToolbarTooltipsEnabled()
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
  const clamped = normalizeMeshReductionThreshold(rawValue);
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

export function setAllowMultipleMazePopupPanels(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setAllowMultipleMazePopupPanels === 'function') {
    app.setAllowMultipleMazePopupPanels(enabled);
  }
}

export function setToolbarTooltipsEnabled(enabled: boolean): void {
  const app = getMazeAppBridge();
  if (app && typeof app.setToolbarTooltipsEnabled === 'function') {
    app.setToolbarTooltipsEnabled(enabled);
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
  const clamped = normalizeCameraZoomMinDistance(rawValue);
  const app = getMazeAppBridge();
  if (app && typeof app.setCameraZoomMinDistance === 'function') {
    app.setCameraZoomMinDistance(clamped);
  }
  return clamped;
}

export function applyCameraZoomMaxDistance(rawValue: number): number {
  const clamped = normalizeCameraZoomMaxDistance(rawValue);
  const app = getMazeAppBridge();
  if (app && typeof app.setCameraZoomMaxDistance === 'function') {
    app.setCameraZoomMaxDistance(clamped);
  }
  return clamped;
}
