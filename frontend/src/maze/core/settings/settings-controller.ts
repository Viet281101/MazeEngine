interface EdgeToggleDecision {
  changed: boolean;
  showEdges: boolean;
  shouldHideEdgesNow: boolean;
  shouldResetTemporarilyHidden: boolean;
}

interface HideEdgesInteractionDecision {
  shouldRestoreEdgesNow: boolean;
  shouldHideEdgesNow: boolean;
  edgesTemporarilyHidden: boolean;
}

interface AdaptiveQualityDecision {
  changed: boolean;
  shouldApplyRendererSizeImmediately: boolean;
}

function canHideEdgesInInteraction(
  showEdges: boolean,
  hideEdgesDuringInteractionEnabled: boolean,
  currentInteractionMode: boolean,
  hasEdgeObjects: boolean
): boolean {
  return showEdges && hideEdgesDuringInteractionEnabled && currentInteractionMode && hasEdgeObjects;
}

export function decideEdgeToggle(
  currentShowEdges: boolean,
  nextShowEdges: boolean,
  hideEdgesDuringInteractionEnabled: boolean,
  currentInteractionMode: boolean,
  hasEdgeObjects: boolean
): EdgeToggleDecision {
  if (currentShowEdges === nextShowEdges) {
    return {
      changed: false,
      showEdges: currentShowEdges,
      shouldHideEdgesNow: false,
      shouldResetTemporarilyHidden: false,
    };
  }

  if (!nextShowEdges) {
    return {
      changed: true,
      showEdges: nextShowEdges,
      shouldHideEdgesNow: false,
      shouldResetTemporarilyHidden: true,
    };
  }

  return {
    changed: true,
    showEdges: nextShowEdges,
    shouldHideEdgesNow: canHideEdgesInInteraction(
      nextShowEdges,
      hideEdgesDuringInteractionEnabled,
      currentInteractionMode,
      hasEdgeObjects
    ),
    shouldResetTemporarilyHidden: false,
  };
}

export function decideHideEdgesDuringInteractionChange(
  enabled: boolean,
  showEdges: boolean,
  currentInteractionMode: boolean,
  hasEdgeObjects: boolean,
  edgesTemporarilyHidden: boolean
): HideEdgesInteractionDecision {
  if (!enabled && edgesTemporarilyHidden) {
    return {
      shouldRestoreEdgesNow: true,
      shouldHideEdgesNow: false,
      edgesTemporarilyHidden: false,
    };
  }

  if (canHideEdgesInInteraction(showEdges, enabled, currentInteractionMode, hasEdgeObjects)) {
    return {
      shouldRestoreEdgesNow: false,
      shouldHideEdgesNow: true,
      edgesTemporarilyHidden: true,
    };
  }

  return {
    shouldRestoreEdgesNow: false,
    shouldHideEdgesNow: false,
    edgesTemporarilyHidden,
  };
}

export function decideAdaptiveQualityToggle(
  currentEnabled: boolean,
  nextEnabled: boolean,
  currentInteractionMode: boolean
): AdaptiveQualityDecision {
  if (currentEnabled === nextEnabled) {
    return {
      changed: false,
      shouldApplyRendererSizeImmediately: false,
    };
  }

  return {
    changed: true,
    shouldApplyRendererSizeImmediately: !currentInteractionMode,
  };
}
