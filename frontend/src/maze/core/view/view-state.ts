import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { ResourceManager } from '../../../resources/resource-manager';
import type { MeshFactory } from '../../../resources/mesh-factory';
import type { CameraState } from '../model';

interface BackgroundUpdateResult {
  changed: boolean;
  alpha: number;
}

export function readCameraState(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): CameraState {
  return {
    position: camera.position.clone(),
    target: controls.target.clone(),
  };
}

export function applyCameraState(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  state: CameraState
): void {
  camera.position.copy(state.position);
  controls.target.copy(state.target);
  controls.update();
  controls.saveState();
}

export function applyWallColor(
  color: string,
  wallColor: THREE.Color,
  resourceManager: ResourceManager,
  meshFactory: MeshFactory
): void {
  wallColor.set(color);
  resourceManager.updateMaterialColor('wall', wallColor);
  meshFactory.updateSettings({ wallColor });
}

export function applyFloorColor(
  color: string,
  floorColor: THREE.Color,
  resourceManager: ResourceManager,
  meshFactory: MeshFactory
): void {
  floorColor.set(color);
  resourceManager.updateMaterialColor('floor', floorColor);
  meshFactory.updateSettings({ floorColor });
}

export function applyWallOpacity(
  opacity: number,
  resourceManager: ResourceManager,
  meshFactory: MeshFactory
): void {
  resourceManager.updateMaterialOpacity('wall', opacity);
  meshFactory.updateSettings({ wallOpacity: opacity });
}

export function applyFloorOpacity(
  opacity: number,
  resourceManager: ResourceManager,
  meshFactory: MeshFactory
): void {
  resourceManager.updateMaterialOpacity('floor', opacity);
  meshFactory.updateSettings({ floorOpacity: opacity });
}

export function applyBackgroundColor(
  renderer: THREE.WebGLRenderer,
  backgroundColor: THREE.Color,
  currentAlpha: number,
  color: THREE.ColorRepresentation,
  alpha: number
): BackgroundUpdateResult {
  const nextAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  const previousHex = backgroundColor.getHex();
  backgroundColor.set(color);
  const colorChanged = backgroundColor.getHex() !== previousHex;
  const alphaChanged = Math.abs(currentAlpha - nextAlpha) > 0.0001;

  if (!colorChanged && !alphaChanged) {
    return {
      changed: false,
      alpha: currentAlpha,
    };
  }

  renderer.setClearColor(backgroundColor, nextAlpha);
  return {
    changed: true,
    alpha: nextAlpha,
  };
}
