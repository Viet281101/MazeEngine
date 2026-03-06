export interface InteractionRuntime {
  currentInteractionMode: boolean;
  edgesTemporarilyHidden: boolean;
  interactionRestoreTimer: number | null;
  initialQualityUpgradeTimer: number | null;
}

interface InteractionVisibilityContext {
  showEdges: boolean;
  hideEdgesDuringInteractionEnabled: boolean;
  hasEdgeObjects: boolean;
}

export function createInteractionRuntime(): InteractionRuntime {
  return {
    currentInteractionMode: false,
    edgesTemporarilyHidden: false,
    interactionRestoreTimer: null,
    initialQualityUpgradeTimer: null,
  };
}

export function clearTimer(timer: number | null): number | null {
  if (timer === null) {
    return null;
  }
  window.clearTimeout(timer);
  return null;
}

export function shouldHideEdgesOnInteractionStart(context: InteractionVisibilityContext): boolean {
  return context.hideEdgesDuringInteractionEnabled && context.showEdges && context.hasEdgeObjects;
}

export function shouldRestoreEdgesAfterInteraction(
  edgesTemporarilyHidden: boolean,
  showEdges: boolean
): boolean {
  return edgesTemporarilyHidden && showEdges;
}
