import type * as THREE from 'three';
import type { MeshFactory } from '../../../resources/mesh-factory';
import type { ResourceManager } from '../../../resources/resource-manager';
import {
  decideAdaptiveQualityToggle,
  decideEdgeToggle,
  decideHideEdgesDuringInteractionChange,
} from '../settings/settings-controller';
import {
  decideCameraZoomLimitToggle,
  decideCameraZoomMaxDistance,
  decideCameraZoomMinDistance,
} from '../settings/camera-settings';
import { decideMeshMergeThreshold, decideMeshReductionToggle } from '../settings/mesh-settings';
import { applyFloorColor, applyFloorOpacity, applyWallColor, applyWallOpacity } from '../view';

interface MazeSettingsApiContext {
  wallColor: THREE.Color;
  floorColor: THREE.Color;
  meshFactory: MeshFactory;
  resourceManager: ResourceManager;
  maze: number[][][];

  getWallOpacity: () => number;
  setWallOpacity: (value: number) => void;
  getFloorOpacity: () => number;
  setFloorOpacity: (value: number) => void;

  getShowEdges: () => boolean;
  setShowEdges: (value: boolean) => void;
  getShowFloorGrid: () => boolean;
  setShowFloorGrid: (value: boolean) => void;

  getMeshReductionEnabled: () => boolean;
  setMeshReductionEnabled: (value: boolean) => void;
  getMeshMergeThreshold: () => number;
  setMeshMergeThreshold: (value: number) => void;

  getHideEdgesDuringInteractionEnabled: () => boolean;
  setHideEdgesDuringInteractionEnabled: (value: boolean) => void;
  getEdgesTemporarilyHidden: () => boolean;
  setEdgesTemporarilyHidden: (value: boolean) => void;
  getCurrentInteractionMode: () => boolean;
  hasEdgeObjects: () => boolean;

  getAdaptiveQualityEnabled: () => boolean;
  setAdaptiveQualityEnabled: (value: boolean) => void;

  getCameraZoomLimitEnabled: () => boolean;
  setCameraZoomLimitEnabled: (value: boolean) => void;
  getCameraZoomMinDistance: () => number;
  setCameraZoomMinDistance: (value: number) => void;
  getCameraZoomMaxDistance: () => number;
  setCameraZoomMaxDistance: (value: number) => void;

  updateMeshFactorySettings: (settings: { showEdges?: boolean; showFloorGrid?: boolean }) => void;
  rebuildEdges: () => void;
  setEdgeVisibility: (visible: boolean) => void;
  rebuildMazePreservingCamera: () => void;
  resetAdaptiveQualityMetrics: () => void;
  applyRendererSizeForCurrentMode: () => void;
  configureCameraZoomLimits: () => void;
  updateControls: () => void;
  requestRender: () => void;
}

interface CameraZoomDistanceDecision {
  changed: boolean;
  minDistance: number;
  maxDistance: number;
}

function applyCameraZoomDistanceDecision(
  context: MazeSettingsApiContext,
  decision: CameraZoomDistanceDecision
): void {
  if (!decision.changed) {
    return;
  }
  context.setCameraZoomMinDistance(decision.minDistance);
  context.setCameraZoomMaxDistance(decision.maxDistance);
  context.configureCameraZoomLimits();
  context.updateControls();
  context.requestRender();
}

export function updateWallColorApi(context: MazeSettingsApiContext, color: string): void {
  applyWallColor(color, context.wallColor, context.resourceManager, context.meshFactory);
  context.requestRender();
}

export function updateFloorColorApi(context: MazeSettingsApiContext, color: string): void {
  applyFloorColor(color, context.floorColor, context.resourceManager, context.meshFactory);
  context.requestRender();
}

export function updateWallOpacityApi(context: MazeSettingsApiContext, opacity: number): void {
  context.setWallOpacity(opacity);
  applyWallOpacity(opacity, context.resourceManager, context.meshFactory);
  context.requestRender();
}

export function updateFloorOpacityApi(context: MazeSettingsApiContext, opacity: number): void {
  context.setFloorOpacity(opacity);
  applyFloorOpacity(opacity, context.resourceManager, context.meshFactory);
  context.requestRender();
}

export function toggleEdgesApi(context: MazeSettingsApiContext, showEdges: boolean): void {
  const decision = decideEdgeToggle(
    context.getShowEdges(),
    showEdges,
    context.getHideEdgesDuringInteractionEnabled(),
    context.getCurrentInteractionMode(),
    context.hasEdgeObjects()
  );
  if (!decision.changed) {
    return;
  }

  context.setShowEdges(decision.showEdges);
  context.updateMeshFactorySettings({ showEdges: decision.showEdges });
  context.rebuildEdges();
  if (decision.shouldResetTemporarilyHidden) {
    context.setEdgesTemporarilyHidden(false);
  } else if (decision.shouldHideEdgesNow) {
    context.setEdgeVisibility(false);
    context.setEdgesTemporarilyHidden(true);
  }
}

export function setFloorGridEnabledApi(context: MazeSettingsApiContext, enabled: boolean): void {
  if (context.getShowFloorGrid() === enabled) {
    return;
  }
  context.setShowFloorGrid(enabled);
  context.updateMeshFactorySettings({ showFloorGrid: enabled });
  context.rebuildEdges();
}

export function setMeshReductionEnabledApi(
  context: MazeSettingsApiContext,
  enabled: boolean
): void {
  const decision = decideMeshReductionToggle(
    context.maze,
    context.getMeshReductionEnabled(),
    context.getMeshMergeThreshold(),
    enabled
  );
  if (!decision.changed) return;
  context.setMeshReductionEnabled(decision.enabled);
  if (decision.shouldRebuild) {
    context.rebuildMazePreservingCamera();
    return;
  }
  context.requestRender();
}

export function setMeshMergeThresholdApi(context: MazeSettingsApiContext, threshold: number): void {
  const decision = decideMeshMergeThreshold(
    context.maze,
    context.getMeshReductionEnabled(),
    context.getMeshMergeThreshold(),
    threshold
  );
  if (!decision.changed) return;
  context.setMeshMergeThreshold(decision.threshold);
  if (decision.shouldRebuild) {
    context.rebuildMazePreservingCamera();
    return;
  }
  context.requestRender();
}

export function setHideEdgesDuringInteractionEnabledApi(
  context: MazeSettingsApiContext,
  enabled: boolean
): void {
  context.setHideEdgesDuringInteractionEnabled(enabled);

  const decision = decideHideEdgesDuringInteractionChange(
    enabled,
    context.getShowEdges(),
    context.getCurrentInteractionMode(),
    context.hasEdgeObjects(),
    context.getEdgesTemporarilyHidden()
  );
  context.setEdgesTemporarilyHidden(decision.edgesTemporarilyHidden);

  if (decision.shouldRestoreEdgesNow) {
    context.setEdgeVisibility(true);
    context.requestRender();
    return;
  }

  if (decision.shouldHideEdgesNow) {
    context.setEdgeVisibility(false);
    context.requestRender();
  }
}

export function setAdaptiveQualityEnabledApi(
  context: MazeSettingsApiContext,
  enabled: boolean
): void {
  const decision = decideAdaptiveQualityToggle(
    context.getAdaptiveQualityEnabled(),
    enabled,
    context.getCurrentInteractionMode()
  );
  if (!decision.changed) {
    return;
  }
  context.setAdaptiveQualityEnabled(enabled);
  context.resetAdaptiveQualityMetrics();
  if (decision.shouldApplyRendererSizeImmediately) {
    context.applyRendererSizeForCurrentMode();
  }
  context.requestRender();
}

export function setCameraZoomLimitEnabledApi(
  context: MazeSettingsApiContext,
  enabled: boolean
): void {
  const decision = decideCameraZoomLimitToggle(context.getCameraZoomLimitEnabled(), enabled);
  if (!decision.changed) {
    return;
  }
  context.setCameraZoomLimitEnabled(decision.enabled);
  context.configureCameraZoomLimits();
  context.updateControls();
  context.requestRender();
}

export function setCameraZoomMinDistanceApi(
  context: MazeSettingsApiContext,
  distance: number
): void {
  const decision = decideCameraZoomMinDistance(
    context.getCameraZoomMinDistance(),
    context.getCameraZoomMaxDistance(),
    distance
  );
  applyCameraZoomDistanceDecision(context, decision);
}

export function setCameraZoomMaxDistanceApi(
  context: MazeSettingsApiContext,
  distance: number
): void {
  const decision = decideCameraZoomMaxDistance(
    context.getCameraZoomMinDistance(),
    context.getCameraZoomMaxDistance(),
    distance
  );
  applyCameraZoomDistanceDecision(context, decision);
}
