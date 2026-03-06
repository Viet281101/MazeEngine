import { ADAPTIVE_QUALITY, ADAPTIVE_QUALITY_DEFAULT_SCALE } from '../../constants/maze';

interface RendererSizeParams {
  isInteraction: boolean;
  adaptiveEnabled: boolean;
  adaptiveScale: number;
  devicePixelRatio: number;
  maxTextureSize: number;
  canvasClientWidth: number;
  canvasClientHeight: number;
}

export interface RendererSize {
  width: number;
  height: number;
  pixelRatio: number;
}

interface AdaptiveQualityUpdateParams {
  adaptiveEnabled: boolean;
  nowMs: number;
  lastRenderTimestampMs: number | null;
  frameTimeEmaMs: number | null;
  lastAdaptiveAdjustmentMs: number;
  adaptiveQualityScale: number;
}

interface AdaptiveQualityUpdateResult {
  lastRenderTimestampMs: number | null;
  frameTimeEmaMs: number | null;
  lastAdaptiveAdjustmentMs: number;
  adaptiveQualityScale: number;
  shouldApplyRendererSize: boolean;
}

export function calculateRendererSize(params: RendererSizeParams): RendererSize {
  const dynamicCap = params.isInteraction
    ? ADAPTIVE_QUALITY.INTERACTION_PIXEL_RATIO_CAP
    : ADAPTIVE_QUALITY.STABLE_PIXEL_RATIO_CAP;
  const adaptiveScale = params.adaptiveEnabled ? params.adaptiveScale : 1;
  const adaptiveCap = dynamicCap * adaptiveScale;
  const pixelRatio = Math.max(
    ADAPTIVE_QUALITY.MIN_PIXEL_RATIO,
    Math.min(params.devicePixelRatio, adaptiveCap)
  );
  const maxDimension = Math.floor(params.maxTextureSize / pixelRatio);
  const canvasWidth = Math.max(Math.floor(params.canvasClientWidth), 1);
  const canvasHeight = Math.max(Math.floor(params.canvasClientHeight), 1);
  const width = Math.min(canvasWidth, maxDimension);
  const height = Math.min(canvasHeight, maxDimension);
  return { width, height, pixelRatio };
}

export function computeAdaptiveQualityUpdate(
  params: AdaptiveQualityUpdateParams
): AdaptiveQualityUpdateResult {
  if (!params.adaptiveEnabled) {
    return {
      lastRenderTimestampMs: params.lastRenderTimestampMs,
      frameTimeEmaMs: params.frameTimeEmaMs,
      lastAdaptiveAdjustmentMs: params.lastAdaptiveAdjustmentMs,
      adaptiveQualityScale: params.adaptiveQualityScale,
      shouldApplyRendererSize: false,
    };
  }

  if (params.lastRenderTimestampMs === null) {
    return {
      lastRenderTimestampMs: params.nowMs,
      frameTimeEmaMs: params.frameTimeEmaMs,
      lastAdaptiveAdjustmentMs: params.lastAdaptiveAdjustmentMs,
      adaptiveQualityScale: params.adaptiveQualityScale,
      shouldApplyRendererSize: false,
    };
  }

  const deltaMs = params.nowMs - params.lastRenderTimestampMs;
  if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 200) {
    return {
      lastRenderTimestampMs: params.nowMs,
      frameTimeEmaMs: params.frameTimeEmaMs,
      lastAdaptiveAdjustmentMs: params.lastAdaptiveAdjustmentMs,
      adaptiveQualityScale: params.adaptiveQualityScale,
      shouldApplyRendererSize: false,
    };
  }

  const frameTimeEmaMs =
    params.frameTimeEmaMs === null
      ? deltaMs
      : params.frameTimeEmaMs + (deltaMs - params.frameTimeEmaMs) * ADAPTIVE_QUALITY.EMA_ALPHA;

  if (params.nowMs - params.lastAdaptiveAdjustmentMs < ADAPTIVE_QUALITY.UPDATE_COOLDOWN_MS) {
    return {
      lastRenderTimestampMs: params.nowMs,
      frameTimeEmaMs,
      lastAdaptiveAdjustmentMs: params.lastAdaptiveAdjustmentMs,
      adaptiveQualityScale: params.adaptiveQualityScale,
      shouldApplyRendererSize: false,
    };
  }

  let nextScale = params.adaptiveQualityScale;
  if (frameTimeEmaMs > ADAPTIVE_QUALITY.HIGH_FRAME_TIME_MS) {
    nextScale = Math.max(
      ADAPTIVE_QUALITY.MIN_SCALE,
      params.adaptiveQualityScale - ADAPTIVE_QUALITY.DECREASE_STEP
    );
  } else if (frameTimeEmaMs < ADAPTIVE_QUALITY.LOW_FRAME_TIME_MS) {
    nextScale = Math.min(
      ADAPTIVE_QUALITY.MAX_SCALE,
      params.adaptiveQualityScale + ADAPTIVE_QUALITY.INCREASE_STEP
    );
  }

  if (Math.abs(nextScale - params.adaptiveQualityScale) < 0.001) {
    return {
      lastRenderTimestampMs: params.nowMs,
      frameTimeEmaMs,
      lastAdaptiveAdjustmentMs: params.lastAdaptiveAdjustmentMs,
      adaptiveQualityScale: params.adaptiveQualityScale,
      shouldApplyRendererSize: false,
    };
  }

  return {
    lastRenderTimestampMs: params.nowMs,
    frameTimeEmaMs,
    lastAdaptiveAdjustmentMs: params.nowMs,
    adaptiveQualityScale: nextScale,
    shouldApplyRendererSize: true,
  };
}

export function createAdaptiveQualityResetState(): {
  frameTimeEmaMs: number | null;
  lastRenderTimestampMs: number | null;
  lastAdaptiveAdjustmentMs: number;
  adaptiveQualityScale: number;
} {
  return {
    frameTimeEmaMs: null,
    lastRenderTimestampMs: null,
    lastAdaptiveAdjustmentMs: 0,
    adaptiveQualityScale: ADAPTIVE_QUALITY_DEFAULT_SCALE,
  };
}
