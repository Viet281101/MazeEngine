import { updateCameraZoomRangeForMax, updateCameraZoomRangeForMin } from '../../rendering';

interface CameraZoomLimitToggleDecision {
  changed: boolean;
  enabled: boolean;
}

interface CameraZoomDistanceDecision {
  changed: boolean;
  minDistance: number;
  maxDistance: number;
}

type CameraZoomRangeUpdateResult = ReturnType<typeof updateCameraZoomRangeForMin>;
type CameraZoomRangeUpdater = (
  currentMinDistance: number,
  currentMaxDistance: number,
  nextDistance: number
) => CameraZoomRangeUpdateResult;

function decideCameraZoomDistance(
  updater: CameraZoomRangeUpdater,
  currentMinDistance: number,
  currentMaxDistance: number,
  nextDistance: number
): CameraZoomDistanceDecision {
  const next = updater(currentMinDistance, currentMaxDistance, nextDistance);
  return {
    changed: next.changed,
    minDistance: next.minDistance,
    maxDistance: next.maxDistance,
  };
}

export function decideCameraZoomLimitToggle(
  currentEnabled: boolean,
  nextEnabled: boolean
): CameraZoomLimitToggleDecision {
  if (currentEnabled === nextEnabled) {
    return {
      changed: false,
      enabled: currentEnabled,
    };
  }

  return {
    changed: true,
    enabled: nextEnabled,
  };
}

export function decideCameraZoomMinDistance(
  currentMinDistance: number,
  currentMaxDistance: number,
  nextDistance: number
): CameraZoomDistanceDecision {
  return decideCameraZoomDistance(
    updateCameraZoomRangeForMin,
    currentMinDistance,
    currentMaxDistance,
    nextDistance
  );
}

export function decideCameraZoomMaxDistance(
  currentMinDistance: number,
  currentMaxDistance: number,
  nextDistance: number
): CameraZoomDistanceDecision {
  return decideCameraZoomDistance(
    updateCameraZoomRangeForMax,
    currentMinDistance,
    currentMaxDistance,
    nextDistance
  );
}
