import { PREVIEW_COLORS } from './preview-constants';

export interface PreviewTitleBarElements {
  titleBar: HTMLDivElement;
  titleText: HTMLSpanElement;
  closeButton: HTMLButtonElement;
  hideButton: HTMLButtonElement;
}

export interface PreviewFooterElements {
  footer: HTMLDivElement;
  gridToggleButton: HTMLButtonElement;
  layerPrevButton: HTMLButtonElement;
  layerLabel: HTMLSpanElement;
  layerNextButton: HTMLButtonElement;
}

interface PreviewButtonOptions {
  className: string;
  text: string;
  title?: string;
  ariaPressed?: string;
}

export function createPreviewButton(options: PreviewButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.className;
  button.textContent = options.text;
  if (options.title) {
    button.setAttribute('title', options.title);
  }
  if (options.ariaPressed !== undefined) {
    button.setAttribute('aria-pressed', options.ariaPressed);
  }
  return button;
}

export function createPreviewContainer(options: {
  width: number;
  height: number;
  x: number;
  y: number;
  hideTransitionMs: number;
}): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'preview-window';
  container.tabIndex = 0;
  container.style.width = `${options.width}px`;
  container.style.height = `${options.height}px`;
  container.style.left = `${options.x}px`;
  container.style.top = `${options.y}px`;

  const cssVars = {
    '--preview-bg': PREVIEW_COLORS.background,
    '--preview-surface': PREVIEW_COLORS.surface,
    '--preview-surface-top': PREVIEW_COLORS.surfaceTop,
    '--preview-wall': PREVIEW_COLORS.wall,
    '--preview-path': PREVIEW_COLORS.path,
    '--preview-connector': PREVIEW_COLORS.connector,
    '--preview-grid': PREVIEW_COLORS.grid,
    '--preview-border': PREVIEW_COLORS.border,
    '--preview-border-soft': PREVIEW_COLORS.borderSoft,
    '--preview-footer-border': PREVIEW_COLORS.footerBorder,
    '--preview-legend-bg': PREVIEW_COLORS.legendBg,
    '--preview-button-bg': PREVIEW_COLORS.buttonBg,
    '--preview-button-border': PREVIEW_COLORS.buttonBorder,
    '--preview-button-hover': PREVIEW_COLORS.buttonHover,
    '--preview-button-active': PREVIEW_COLORS.buttonActive,
    '--preview-button-active-border': PREVIEW_COLORS.buttonActiveBorder,
    '--preview-close-active': PREVIEW_COLORS.closeActive,
    '--preview-resize-grip': PREVIEW_COLORS.resizeGrip,
    '--preview-start': PREVIEW_COLORS.markerStart,
    '--preview-end': PREVIEW_COLORS.markerEnd,
    '--preview-marker-both': PREVIEW_COLORS.markerBoth,
    '--preview-marker-stroke': PREVIEW_COLORS.markerStroke,
    '--preview-marker-text': PREVIEW_COLORS.markerText,
    '--preview-hide-duration': `${options.hideTransitionMs}ms`,
  } as const;

  Object.entries(cssVars).forEach(([key, value]) => {
    container.style.setProperty(key, value);
  });
  return container;
}

export function createPreviewTitleBar(options: {
  title: string;
  hideTitle: string;
}): PreviewTitleBarElements {
  const titleBar = document.createElement('div');
  titleBar.className = 'preview-titlebar';

  const titleText = document.createElement('span');
  titleText.className = 'preview-title-text';
  titleText.textContent = options.title;

  const closeButton = createPreviewButton({
    className: 'preview-close-btn',
    text: 'x',
  });
  const hideButton = createPreviewButton({
    className: 'preview-hide-btn',
    text: '-',
    title: options.hideTitle,
  });

  const actions = document.createElement('div');
  actions.className = 'preview-title-actions';
  actions.appendChild(hideButton);
  actions.appendChild(closeButton);

  titleBar.appendChild(titleText);
  titleBar.appendChild(actions);

  return { titleBar, titleText, closeButton, hideButton };
}

export function createPreviewFooter(options: {
  showGrid: boolean;
  gridLabel: string;
  gridTitle: string;
}): PreviewFooterElements {
  const footer = document.createElement('div');
  footer.className = 'preview-footer';

  const gridToggleButton = createPreviewButton({
    className: 'preview-grid-btn',
    text: options.gridLabel,
    title: options.gridTitle,
    ariaPressed: String(options.showGrid),
  });
  gridToggleButton.classList.toggle('active', options.showGrid);

  const layerControls = document.createElement('div');
  layerControls.className = 'preview-layer-controls';
  const layerPrevButton = createPreviewButton({
    className: 'preview-layer-btn',
    text: '<',
  });
  const layerNextButton = createPreviewButton({
    className: 'preview-layer-btn',
    text: '>',
  });
  const layerLabel = document.createElement('span');
  layerLabel.className = 'preview-layer-label';
  layerControls.appendChild(layerPrevButton);
  layerControls.appendChild(layerLabel);
  layerControls.appendChild(layerNextButton);

  footer.appendChild(gridToggleButton);
  footer.appendChild(layerControls);

  return {
    footer,
    gridToggleButton,
    layerPrevButton,
    layerLabel,
    layerNextButton,
  };
}

export function createPreviewCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'preview-canvas';
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createPreviewCanvasHost(width: number, height: number): {
  host: HTMLDivElement;
  canvas: HTMLCanvasElement;
  overlay: HTMLDivElement;
} {
  const host = document.createElement('div');
  host.className = 'preview-canvas-host';

  const canvas = createPreviewCanvas(width, height);
  const overlay = document.createElement('div');
  overlay.className = 'preview-canvas-overlay';

  host.appendChild(canvas);
  host.appendChild(overlay);

  return { host, canvas, overlay };
}

export function getPreviewCanvasContextOrThrow(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D context');
  }
  return context;
}

export function assemblePreviewWindow(options: {
  container: HTMLDivElement;
  titleBar: HTMLDivElement;
  legend: HTMLDivElement;
  canvasHost: HTMLDivElement;
  footer: HTMLDivElement;
}): void {
  options.container.appendChild(options.titleBar);
  options.container.appendChild(options.legend);
  options.container.appendChild(options.canvasHost);
  options.container.appendChild(options.footer);
  document.body.appendChild(options.container);
}
