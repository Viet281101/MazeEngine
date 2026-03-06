import {
  clearTimer,
  shouldHideEdgesOnInteractionStart,
  shouldRestoreEdgesAfterInteraction,
  type InteractionRuntime,
} from '../runtime';

interface MazeInteractionApiContext {
  interactionRuntime: InteractionRuntime;
  isDisposed: () => boolean;
  getShowEdges: () => boolean;
  hideEdgesDuringInteractionEnabled: boolean;
  hasEdgeObjects: () => boolean;
  setEdgeVisibility: (visible: boolean) => void;
  applyRendererSizeForMode: (isInteraction: boolean) => void;
  requestRender: () => void;
}

export function clearInteractionRestoreTimerApi(context: MazeInteractionApiContext): void {
  context.interactionRuntime.interactionRestoreTimer = clearTimer(
    context.interactionRuntime.interactionRestoreTimer
  );
}

export function clearInitialQualityUpgradeTimerApi(context: MazeInteractionApiContext): void {
  context.interactionRuntime.initialQualityUpgradeTimer = clearTimer(
    context.interactionRuntime.initialQualityUpgradeTimer
  );
}

export function scheduleInitialQualityUpgradeApi(
  context: MazeInteractionApiContext,
  delayMs: number
): void {
  clearInitialQualityUpgradeTimerApi(context);
  context.interactionRuntime.initialQualityUpgradeTimer = window.setTimeout(() => {
    context.interactionRuntime.initialQualityUpgradeTimer = null;
    if (context.isDisposed()) {
      return;
    }
    context.applyRendererSizeForMode(false);
    context.requestRender();
  }, delayMs);
}

export function handleInteractionStartApi(context: MazeInteractionApiContext): void {
  clearInteractionRestoreTimerApi(context);
  clearInitialQualityUpgradeTimerApi(context);
  if (
    shouldHideEdgesOnInteractionStart({
      showEdges: context.getShowEdges(),
      hideEdgesDuringInteractionEnabled: context.hideEdgesDuringInteractionEnabled,
      hasEdgeObjects: context.hasEdgeObjects(),
    })
  ) {
    context.setEdgeVisibility(false);
    context.interactionRuntime.edgesTemporarilyHidden = true;
  }
  context.applyRendererSizeForMode(true);
  context.requestRender();
}

export function handleInteractionEndApi(context: MazeInteractionApiContext, delayMs: number): void {
  clearInteractionRestoreTimerApi(context);
  context.interactionRuntime.interactionRestoreTimer = window.setTimeout(() => {
    context.interactionRuntime.interactionRestoreTimer = null;
    if (
      shouldRestoreEdgesAfterInteraction(
        context.interactionRuntime.edgesTemporarilyHidden,
        context.getShowEdges()
      )
    ) {
      context.setEdgeVisibility(true);
    }
    context.interactionRuntime.edgesTemporarilyHidden = false;
    context.applyRendererSizeForMode(false);
    context.requestRender();
  }, delayMs);
}
