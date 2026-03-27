import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ControlsEventHandlers {
  onChange: () => void;
  onStart: () => void;
  onEnd: () => void;
}

interface ConfigureControlsParams {
  controls: OrbitControls;
  onConfigureZoomLimits: () => void;
  handlers: ControlsEventHandlers;
}

export function configureControls(params: ConfigureControlsParams): void {
  params.controls.enableDamping = true;
  params.controls.dampingFactor = 0.05;
  params.onConfigureZoomLimits();

  params.controls.addEventListener('change', params.handlers.onChange);
  params.controls.addEventListener('start', params.handlers.onStart);
  params.controls.addEventListener('end', params.handlers.onEnd);
}
