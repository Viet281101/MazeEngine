import { shouldMergeWallsForConfig, shouldRebuildForMeshConfig } from '../../builders';
import { normalizeMeshReductionThreshold } from '../../../utils/maze-normalizers';

interface MeshReductionToggleDecision {
  changed: boolean;
  enabled: boolean;
  shouldRebuild: boolean;
}

interface MeshMergeThresholdDecision {
  changed: boolean;
  threshold: number;
  shouldRebuild: boolean;
}

export function decideMeshReductionToggle(
  maze: number[][][],
  currentEnabled: boolean,
  currentThreshold: number,
  nextEnabled: boolean
): MeshReductionToggleDecision {
  if (currentEnabled === nextEnabled) {
    return {
      changed: false,
      enabled: currentEnabled,
      shouldRebuild: false,
    };
  }

  return {
    changed: true,
    enabled: nextEnabled,
    shouldRebuild: shouldRebuildForMeshConfig(
      maze,
      currentEnabled,
      currentThreshold,
      nextEnabled,
      currentThreshold
    ),
  };
}

export function decideMeshMergeThreshold(
  maze: number[][][],
  currentEnabled: boolean,
  currentThreshold: number,
  rawThreshold: number
): MeshMergeThresholdDecision {
  const threshold = normalizeMeshReductionThreshold(rawThreshold, currentThreshold);
  if (currentThreshold === threshold) {
    return {
      changed: false,
      threshold: currentThreshold,
      shouldRebuild: false,
    };
  }

  return {
    changed: true,
    threshold,
    shouldRebuild: shouldRebuildForMeshConfig(
      maze,
      currentEnabled,
      currentThreshold,
      currentEnabled,
      threshold
    ),
  };
}

export function shouldMergeWallsForMeshSettings(
  rows: number,
  cols: number,
  enabled: boolean,
  threshold: number
): boolean {
  return shouldMergeWallsForConfig(rows, cols, enabled, threshold);
}
