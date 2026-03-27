export interface RenderLoopRuntime {
  animationId: number | null;
  needsRender: boolean;
  isRendering: boolean;
}

export function createRenderLoopRuntime(): RenderLoopRuntime {
  return {
    animationId: null,
    needsRender: true,
    isRendering: false,
  };
}

export function markRenderRequested(runtime: RenderLoopRuntime): void {
  runtime.needsRender = true;
}

export function beginRender(runtime: RenderLoopRuntime): boolean {
  if (runtime.isRendering) {
    return false;
  }
  runtime.isRendering = true;
  return true;
}

export function completeRender(runtime: RenderLoopRuntime): void {
  runtime.isRendering = false;
}

export function consumeRenderRequest(runtime: RenderLoopRuntime): boolean {
  if (!runtime.needsRender) {
    return false;
  }
  runtime.needsRender = false;
  return true;
}
