import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { configureControls } from '../view';

interface MazeLifecycleInitApiContext {
  controls: OrbitControls;
  applyRendererSizeForMode: (isInteraction: boolean) => void;
  scheduleInitialQualityUpgrade: () => void;
  configureCameraZoomLimits: () => void;
  requestRender: () => void;
  handleInteractionStart: () => void;
  handleInteractionEnd: () => void;
  createMaze: () => void;
  refreshEdgeVisibilityRuntime: () => void;
}

interface MazeLifecycleDestroyApiContext {
  isDisposed: () => boolean;
  setDisposed: (value: boolean) => void;
  stopAnimation: () => void;
  clearInteractionRestoreTimer: () => void;
  clearInitialQualityUpgradeTimer: () => void;
  detachWebGLContextLifecycle: () => void;
  deleteMaze: () => void;
  disposeControls: () => void;
  disposeResourceManager: () => void;
  disposeScene: () => void;
  disposeRenderer: () => void;
}

export function initMazeLifecycleApi(context: MazeLifecycleInitApiContext): void {
  context.applyRendererSizeForMode(true);
  context.scheduleInitialQualityUpgrade();

  configureControls({
    controls: context.controls,
    onConfigureZoomLimits: () => context.configureCameraZoomLimits(),
    handlers: {
      onChange: () => context.requestRender(),
      onStart: () => context.handleInteractionStart(),
      onEnd: () => context.handleInteractionEnd(),
    },
  });

  context.createMaze();
  context.refreshEdgeVisibilityRuntime();
  context.requestRender();
}

export function destroyMazeLifecycleApi(context: MazeLifecycleDestroyApiContext): void {
  if (context.isDisposed()) return;

  context.setDisposed(true);
  context.stopAnimation();
  context.clearInteractionRestoreTimer();
  context.clearInitialQualityUpgradeTimer();
  context.detachWebGLContextLifecycle();
  context.deleteMaze();
  context.disposeControls();
  context.disposeResourceManager();
  context.disposeScene();
  context.disposeRenderer();
}
