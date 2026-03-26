import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { calculateRendererSize, resolveCameraZoomRange } from '../../rendering';

export interface RenderSizeRuntime {
  width: number;
  height: number;
  pixelRatio: number;
}

interface ApplyRendererSizeParams {
  runtime: RenderSizeRuntime;
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  isInteraction: boolean;
  adaptiveEnabled: boolean;
  adaptiveScale: number;
}

interface CameraZoomLimitParams {
  controls: OrbitControls;
  enabled: boolean;
  minDistance: number;
  maxDistance: number;
}

interface CameraZoomLimitResult {
  minDistance: number;
  maxDistance: number;
}

export function createRenderSizeRuntime(): RenderSizeRuntime {
  return {
    width: 0,
    height: 0,
    pixelRatio: 0,
  };
}

export function applyRendererSizeForRuntime(params: ApplyRendererSizeParams): RenderSizeRuntime {
  const { width, height, pixelRatio } = calculateRendererSize({
    isInteraction: params.isInteraction,
    adaptiveEnabled: params.adaptiveEnabled,
    adaptiveScale: params.adaptiveScale,
    devicePixelRatio: window.devicePixelRatio,
    maxTextureSize: params.renderer.capabilities.maxTextureSize,
    canvasClientWidth: params.canvas.clientWidth,
    canvasClientHeight: params.canvas.clientHeight,
  });

  if (
    width === params.runtime.width &&
    height === params.runtime.height &&
    Math.abs(pixelRatio - params.runtime.pixelRatio) < 0.001
  ) {
    return params.runtime;
  }

  params.renderer.setPixelRatio(pixelRatio);
  params.renderer.setSize(width, height, false);

  return {
    width,
    height,
    pixelRatio,
  };
}

export function configureCameraZoomLimitsForControls(
  params: CameraZoomLimitParams
): CameraZoomLimitResult {
  if (!params.enabled) {
    params.controls.minDistance = 0;
    params.controls.maxDistance = Infinity;
    return {
      minDistance: params.minDistance,
      maxDistance: params.maxDistance,
    };
  }

  const range = resolveCameraZoomRange(params.minDistance, params.maxDistance);
  params.controls.minDistance = range.minDistance;
  params.controls.maxDistance = range.maxDistance;
  return range;
}
