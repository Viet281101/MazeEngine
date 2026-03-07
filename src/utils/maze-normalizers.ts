import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../constants/maze';

export function normalizeMeshReductionThreshold(
  value: number,
  fallback: number = MESH_REDUCTION.DEFAULT_THRESHOLD
): number {
  const source = Number.isFinite(value) ? value : fallback;
  const floored = Math.floor(source);
  return Math.max(
    MESH_REDUCTION.MIN_THRESHOLD,
    Math.min(MESH_REDUCTION.MAX_THRESHOLD, floored)
  );
}

export function normalizeCameraZoomDistance(value: number, fallback: number): number {
  const source = Number.isFinite(value) ? value : fallback;
  return Math.min(
    CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX,
    Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, source)
  );
}

export function normalizeCameraZoomMinDistance(value: number): number {
  return normalizeCameraZoomDistance(value, CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE);
}

export function normalizeCameraZoomMaxDistance(value: number): number {
  return normalizeCameraZoomDistance(value, CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE);
}
