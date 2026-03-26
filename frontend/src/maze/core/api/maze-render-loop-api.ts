import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  beginRender,
  cancelAnimationLoop,
  completeRender,
  consumeRenderRequest,
  markRenderRequested,
  type RenderLoopRuntime,
} from '../lifecycle';

interface MazeRenderLoopApiContext {
  isDisposed: () => boolean;
  renderLoopRuntime: RenderLoopRuntime;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  updateAdaptiveQuality: (nowMs: number) => void;
  notifyRenderListeners: () => void;
  requestRender: () => void;
}

export function requestRenderApi(context: MazeRenderLoopApiContext): void {
  if (context.isDisposed()) return;
  markRenderRequested(context.renderLoopRuntime);
  if (!beginRender(context.renderLoopRuntime)) return;

  context.renderLoopRuntime.animationId = requestAnimationFrame(timestampMs => {
    if (context.isDisposed()) {
      completeRender(context.renderLoopRuntime);
      return;
    }

    if (!consumeRenderRequest(context.renderLoopRuntime)) {
      completeRender(context.renderLoopRuntime);
      return;
    }

    const needsMore = context.controls.update();
    context.renderer.render(context.scene, context.camera);
    context.updateAdaptiveQuality(timestampMs);
    context.notifyRenderListeners();
    completeRender(context.renderLoopRuntime);

    if (needsMore || context.renderLoopRuntime.needsRender) {
      context.requestRender();
    }
  });
}

export function stopAnimationApi(runtime: RenderLoopRuntime): void {
  runtime.animationId = cancelAnimationLoop(runtime.animationId);
}
