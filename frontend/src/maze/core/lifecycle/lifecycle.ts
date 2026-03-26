import * as THREE from 'three';
import { DisposalHelper } from '../../../resources/disposal-helper';

interface ContextLifecycleHandlers {
  onLost: (event: Event) => void;
  onRestored: () => void;
}

export function cancelAnimationLoop(animationId: number | null): number | null {
  if (animationId === null) {
    return null;
  }
  cancelAnimationFrame(animationId);
  return null;
}

export function attachWebGLContextLifecycle(
  canvas: HTMLCanvasElement,
  handlers: ContextLifecycleHandlers
): void {
  canvas.addEventListener('webglcontextlost', handlers.onLost);
  canvas.addEventListener('webglcontextrestored', handlers.onRestored);
}

export function detachWebGLContextLifecycle(
  canvas: HTMLCanvasElement,
  handlers: ContextLifecycleHandlers
): void {
  canvas.removeEventListener('webglcontextlost', handlers.onLost);
  canvas.removeEventListener('webglcontextrestored', handlers.onRestored);
}

export function disposeMazeLayers(scene: THREE.Scene, layers: THREE.Object3D[]): void {
  layers.forEach(layer => {
    DisposalHelper.disposeObject(layer);
    scene.remove(layer);
  });
}
