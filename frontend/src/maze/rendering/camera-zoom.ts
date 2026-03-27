import { CAMERA_ZOOM_LIMIT } from '../../constants/maze';

interface CameraZoomRange {
  minDistance: number;
  maxDistance: number;
}

interface CameraZoomUpdateResult extends CameraZoomRange {
  changed: boolean;
}

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

export function resolveCameraZoomRange(minDistance: number, maxDistance: number): CameraZoomRange {
  const normalizedMin = normalizeCameraZoomMinDistance(minDistance);
  const normalizedMax = Math.max(normalizedMin, normalizeCameraZoomMaxDistance(maxDistance));
  return {
    minDistance: normalizedMin,
    maxDistance: normalizedMax,
  };
}

export function updateCameraZoomRangeForMin(
  currentMinDistance: number,
  currentMaxDistance: number,
  nextMinDistance: number
): CameraZoomUpdateResult {
  const normalizedMin = normalizeCameraZoomMinDistance(nextMinDistance);
  if (Math.abs(currentMinDistance - normalizedMin) < 0.001) {
    return {
      changed: false,
      minDistance: currentMinDistance,
      maxDistance: currentMaxDistance,
    };
  }

  return {
    changed: true,
    minDistance: normalizedMin,
    maxDistance: Math.max(currentMaxDistance, normalizedMin),
  };
}

export function updateCameraZoomRangeForMax(
  currentMinDistance: number,
  currentMaxDistance: number,
  nextMaxDistance: number
): CameraZoomUpdateResult {
  const normalizedMax = normalizeCameraZoomMaxDistance(nextMaxDistance);
  if (Math.abs(currentMaxDistance - normalizedMax) < 0.001) {
    return {
      changed: false,
      minDistance: currentMinDistance,
      maxDistance: currentMaxDistance,
    };
  }

  return {
    changed: true,
    minDistance: Math.min(currentMinDistance, normalizedMax),
    maxDistance: normalizedMax,
  };
}
