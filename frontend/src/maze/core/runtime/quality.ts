import { createAdaptiveQualityResetState, computeAdaptiveQualityUpdate } from '../../rendering';

export interface AdaptiveQualityRuntime {
  frameTimeEmaMs: number | null;
  lastRenderTimestampMs: number | null;
  lastAdaptiveAdjustmentMs: number;
  adaptiveQualityScale: number;
}

export function createAdaptiveQualityRuntime(): AdaptiveQualityRuntime {
  return createAdaptiveQualityResetState();
}

export function resetAdaptiveQualityRuntime(): AdaptiveQualityRuntime {
  return createAdaptiveQualityResetState();
}

export function updateAdaptiveQualityRuntime(
  runtime: AdaptiveQualityRuntime,
  adaptiveEnabled: boolean,
  nowMs: number
): { runtime: AdaptiveQualityRuntime; shouldApplyRendererSize: boolean } {
  const next = computeAdaptiveQualityUpdate({
    adaptiveEnabled,
    nowMs,
    lastRenderTimestampMs: runtime.lastRenderTimestampMs,
    frameTimeEmaMs: runtime.frameTimeEmaMs,
    lastAdaptiveAdjustmentMs: runtime.lastAdaptiveAdjustmentMs,
    adaptiveQualityScale: runtime.adaptiveQualityScale,
  });

  return {
    runtime: {
      frameTimeEmaMs: next.frameTimeEmaMs,
      lastRenderTimestampMs: next.lastRenderTimestampMs,
      lastAdaptiveAdjustmentMs: next.lastAdaptiveAdjustmentMs,
      adaptiveQualityScale: next.adaptiveQualityScale,
    },
    shouldApplyRendererSize: next.shouldApplyRendererSize,
  };
}
