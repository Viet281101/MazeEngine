import { CAMERA_ZOOM_LIMIT } from '../constants/maze';

export function normalizeCameraZoomMinDistance(value: number): number {
  if (!Number.isFinite(value)) {
    return CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
  }
  const clamped = Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value);
  return Math.min(CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX, clamped);
}

export function normalizeCameraZoomMaxDistance(value: number): number {
  if (!Number.isFinite(value)) {
    return CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;
  }
  return Math.min(
    CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX,
    Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value)
  );
}
