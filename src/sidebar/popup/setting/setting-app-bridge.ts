import { MESH_REDUCTION } from '../../../constants/maze';
import type { MazeAppBridge } from '../../../types/maze';

interface InitialSettingsValues {
  meshReductionEnabled: boolean;
  meshReductionThreshold: number;
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

export function getInitialSettingsValues(): InitialSettingsValues {
  const app = getMazeAppBridge();
  return {
    meshReductionEnabled:
      app && typeof app.isMeshReductionEnabled === 'function' ? app.isMeshReductionEnabled() : true,
    meshReductionThreshold:
      app && typeof app.getMeshReductionThreshold === 'function'
        ? app.getMeshReductionThreshold()
        : MESH_REDUCTION.DEFAULT_THRESHOLD,
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
