import { MAZE_POPUP_ACCORDION } from '../../../constants/ui';

interface PanelPadding {
  top: number;
  bottom: number;
  horizontal: number;
}

interface AccordionOptions {
  openDuration?: number;
  closeDuration?: number;
  openEasing?: string;
  closeEasing?: string;
  padding?: PanelPadding;
  panelSelector?: string;
  bindSummaryToggle?: boolean;
}

interface AnimatedDetailsController {
  dispose: () => void;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

const DEFAULT_OPTIONS: Required<
  Omit<AccordionOptions, 'padding' | 'panelSelector' | 'bindSummaryToggle'>
> = {
  openDuration: MAZE_POPUP_ACCORDION.OPEN_DURATION_MS,
  closeDuration: MAZE_POPUP_ACCORDION.CLOSE_DURATION_MS,
  openEasing: MAZE_POPUP_ACCORDION.OPEN_EASING,
  closeEasing: MAZE_POPUP_ACCORDION.CLOSE_EASING,
};

const DEFAULT_PADDING: PanelPadding = {
  top: MAZE_POPUP_ACCORDION.PANEL_PADDING.TOP,
  bottom: MAZE_POPUP_ACCORDION.PANEL_PADDING.BOTTOM,
  horizontal: MAZE_POPUP_ACCORDION.PANEL_PADDING.HORIZONTAL,
};

export function setupAnimatedDetails(
  row: HTMLDetailsElement,
  options: AccordionOptions = {}
): () => void {
  return createAnimatedDetailsController(row, options).dispose;
}

export function setupAccordionGroup(
  rows: HTMLDetailsElement[],
  options: AccordionOptions = {}
): () => void {
  const controllerOptions = { ...options, bindSummaryToggle: false };
  const controllers = rows.map(row => ({
    row,
    controller: createAnimatedDetailsController(row, controllerOptions),
  }));
  const disposers: Array<() => void> = controllers.map(item => item.controller.dispose);

  controllers.forEach(({ row, controller }) => {
    const summary = getSummary(row);
    if (!summary) {
      return;
    }

    const onClick = (event: Event): void => {
      event.preventDefault();
      if (controller.isOpen()) {
        controller.close();
        return;
      }

      controllers.forEach(item => {
        if (item.row !== row && item.controller.isOpen()) {
          item.controller.close();
        }
      });
      controller.open();
    };

    const onKeyDown = (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        summary.click();
      }
    };

    summary.addEventListener('click', onClick);
    summary.addEventListener('keydown', onKeyDown);
    disposers.push(() => summary.removeEventListener('click', onClick));
    disposers.push(() => summary.removeEventListener('keydown', onKeyDown));
  });

  let hasOpenRow = false;
  controllers.forEach(({ controller, row }) => {
    if (!row.open) {
      return;
    }
    if (!hasOpenRow) {
      hasOpenRow = true;
      return;
    }
    controller.close();
  });

  return () => {
    disposers.splice(0).forEach(dispose => dispose());
  };
}

export function setupExclusiveAccordion(
  singleRow: HTMLDetailsElement,
  multiRow: HTMLDetailsElement,
  options: AccordionOptions = {}
): () => void {
  return setupAccordionGroup([singleRow, multiRow], options);
}

function createAnimatedDetailsController(
  row: HTMLDetailsElement,
  options: AccordionOptions
): AnimatedDetailsController {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  const disposers: Array<() => void> = [];
  const reducedMotion = prefersReducedMotion();
  const panelSelector = options.panelSelector ?? '.popup-accordion__panel';
  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
  let ancestorSyncFrameId: number | null = null;

  const panel = getPanel(row, panelSelector);
  const panelPadding = options.padding ?? readPanelPadding(panel) ?? DEFAULT_PADDING;
  const summary = getSummary(row);

  const setAnimatingFlag = (value: boolean): void => {
    row.setAttribute('data-animating', value ? 'true' : '');
  };

  const isAnimating = (): boolean => row.getAttribute('data-animating') === 'true';

  const cancelAnimations = (): void => {
    if (!panel || typeof panel.getAnimations !== 'function') {
      return;
    }
    panel.getAnimations().forEach(animation => animation.cancel());
  };

  const setCollapsedInlineStyles = (): void => {
    if (!panel) {
      return;
    }
    applyCollapsedInlineStyles(panel, panelPadding);
  };

  const setExpandedInlineStyles = (height?: number): void => {
    if (!panel) {
      return;
    }
    applyExpandedInlineStyles(panel, panelPadding, height);
  };

  const syncOpenDescendantPanels = (): void => {
    if (!panel) {
      return;
    }

    const openDescendants = panel.querySelectorAll<HTMLDetailsElement>('details[open]');
    openDescendants.forEach(descendantRow => {
      const descendantPanel = getPanel(descendantRow, panelSelector);
      if (!descendantPanel) {
        return;
      }
      const descendantPadding = readPanelPadding(descendantPanel) ?? DEFAULT_PADDING;
      applyExpandedInlineStyles(descendantPanel, descendantPadding);
    });
  };

  const syncAncestorPanels = (): void => {
    if (!panel) {
      return;
    }

    let currentDetails = row.parentElement?.closest('details') as HTMLDetailsElement | null;
    while (currentDetails) {
      const ancestorPanel = getPanel(currentDetails, panelSelector);
      if (ancestorPanel && currentDetails.open) {
        const ancestorPadding = readPanelPadding(ancestorPanel) ?? DEFAULT_PADDING;
        if (isRowAnimating(currentDetails)) {
          applyExpandedInlineStyles(ancestorPanel, ancestorPadding, ancestorPanel.scrollHeight);
        } else {
          applyExpandedInlineStyles(ancestorPanel, ancestorPadding);
        }
      }
      currentDetails = currentDetails.parentElement?.closest(
        'details'
      ) as HTMLDetailsElement | null;
    }
  };

  const stopAncestorSyncLoop = (): void => {
    if (ancestorSyncFrameId === null || typeof window === 'undefined') {
      return;
    }
    window.cancelAnimationFrame(ancestorSyncFrameId);
    ancestorSyncFrameId = null;
  };

  const startAncestorSyncLoop = (): void => {
    if (typeof window === 'undefined') {
      syncAncestorPanels();
      return;
    }

    stopAncestorSyncLoop();

    const tick = (): void => {
      syncAncestorPanels();
      if (!isAnimating()) {
        ancestorSyncFrameId = null;
        return;
      }
      ancestorSyncFrameId = window.requestAnimationFrame(tick);
    };

    tick();
  };

  const animatePanel = (
    keyframes: Keyframe[],
    animationOptions: KeyframeAnimationOptions
  ): Animation | null => {
    if (!panel || reducedMotion || typeof panel.animate !== 'function') {
      return null;
    }
    return panel.animate(keyframes, animationOptions);
  };

  const open = (): void => {
    if (!panel) {
      row.open = true;
      return;
    }
    if (isAnimating()) {
      cancelAnimations();
      setAnimatingFlag(false);
    }

    cancelAnimations();
    setAnimatingFlag(true);
    row.open = true;
    startAncestorSyncLoop();

    setExpandedInlineStyles();
    panel.style.height = 'auto';
    syncOpenDescendantPanels();
    syncAncestorPanels();
    const targetHeight = panel.scrollHeight;
    setCollapsedInlineStyles();
    panel.getBoundingClientRect();

    const animation = animatePanel(
      [
        { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
        {
          height: `${targetHeight}px`,
          opacity: 1,
          paddingTop: `${panelPadding.top}px`,
          paddingBottom: `${panelPadding.bottom}px`,
        },
      ],
      {
        duration: finalOptions.openDuration,
        easing: finalOptions.openEasing,
        fill: 'forwards',
      }
    );

    if (!animation) {
      syncOpenDescendantPanels();
      setExpandedInlineStyles();
      setAnimatingFlag(false);
      stopAncestorSyncLoop();
      syncAncestorPanels();
      return;
    }

    animation.onfinish = () => {
      syncOpenDescendantPanels();
      setExpandedInlineStyles();
      setAnimatingFlag(false);
      stopAncestorSyncLoop();
      syncAncestorPanels();
    };
    animation.oncancel = () => {
      setAnimatingFlag(false);
      stopAncestorSyncLoop();
      syncAncestorPanels();
    };
  };

  const close = (): void => {
    if (!panel) {
      row.open = false;
      return;
    }
    if (isAnimating()) {
      cancelAnimations();
      setAnimatingFlag(false);
    }

    cancelAnimations();
    setAnimatingFlag(true);
    startAncestorSyncLoop();

    const startHeight = panel.getBoundingClientRect().height;
    setExpandedInlineStyles(startHeight);
    syncAncestorPanels();
    panel.getBoundingClientRect();

    const animation = animatePanel(
      [
        {
          height: `${startHeight}px`,
          opacity: 1,
          paddingTop: `${panelPadding.top}px`,
          paddingBottom: `${panelPadding.bottom}px`,
        },
        { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
      ],
      {
        duration: finalOptions.closeDuration,
        easing: finalOptions.closeEasing,
        fill: 'forwards',
      }
    );

    if (!animation) {
      row.open = false;
      setCollapsedInlineStyles();
      setAnimatingFlag(false);
      stopAncestorSyncLoop();
      syncAncestorPanels();
      return;
    }

    animation.onfinish = () => {
      row.open = false;
      setCollapsedInlineStyles();
      setAnimatingFlag(false);
      stopAncestorSyncLoop();
      syncAncestorPanels();
    };
    animation.oncancel = () => {
      setAnimatingFlag(false);
      stopAncestorSyncLoop();
      syncAncestorPanels();
    };
  };

  const onSummaryKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (summary as HTMLElement | null)?.click();
    }
  };

  const onSummaryClick = (event: Event): void => {
    event.preventDefault();
    if (row.open) {
      close();
      return;
    }
    open();
  };

  if (summary && options.bindSummaryToggle !== false) {
    summary.addEventListener('click', onSummaryClick);
    summary.addEventListener('keydown', onSummaryKeyDown);
    disposers.push(() => summary.removeEventListener('click', onSummaryClick));
    disposers.push(() => summary.removeEventListener('keydown', onSummaryKeyDown));
  }

  if (panel && resizeObserver) {
    resizeObserver.observe(panel);
    disposers.push(() => resizeObserver.disconnect());
  }

  if (panel) {
    if (row.open) {
      syncOpenDescendantPanels();
      setExpandedInlineStyles();
    } else {
      setCollapsedInlineStyles();
    }
  }

  return {
    dispose: () => {
      stopAncestorSyncLoop();
      disposers.splice(0).forEach(dispose => dispose());
    },
    open,
    close,
    isOpen: () => row.open || isAnimating(),
  };

  function handleResize(entries: ResizeObserverEntry[]): void {
    entries.forEach(entry => {
      const currentPanel = entry.target as HTMLElement;
      if (currentPanel !== panel || !row.open) {
        return;
      }
      if (isAnimating()) {
        currentPanel.style.height = `${currentPanel.scrollHeight}px`;
        syncAncestorPanels();
        return;
      }
      setExpandedInlineStyles();
      syncAncestorPanels();
    });
  }
}

function getPanel(row: HTMLDetailsElement, panelSelector: string): HTMLElement | null {
  const directSelector = `:scope > ${panelSelector}`;
  try {
    const directPanel = row.querySelector(directSelector);
    if (directPanel instanceof HTMLElement) {
      return directPanel;
    }
  } catch {
    // Fall back when :scope or the selector shape is unsupported.
  }

  const fallbackPanel = row.querySelector(panelSelector);
  return fallbackPanel instanceof HTMLElement ? fallbackPanel : null;
}

function getSummary(row: HTMLDetailsElement): HTMLElement | null {
  const directSummary = row.querySelector(':scope > summary');
  if (directSummary instanceof HTMLElement) {
    return directSummary;
  }
  const fallback = row.querySelector('summary');
  return fallback instanceof HTMLElement ? fallback : null;
}

function isRowAnimating(row: HTMLDetailsElement): boolean {
  return row.getAttribute('data-animating') === 'true';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readPanelPadding(panel: HTMLElement | null): PanelPadding | null {
  if (!panel || typeof window === 'undefined') {
    return null;
  }
  const styles = window.getComputedStyle(panel);
  const top = parseCssNumber(styles.getPropertyValue('--maze-panel-pad-top'), DEFAULT_PADDING.top);
  const bottom = parseCssNumber(
    styles.getPropertyValue('--maze-panel-pad-bottom'),
    DEFAULT_PADDING.bottom
  );
  const horizontal = parseCssNumber(
    styles.getPropertyValue('--maze-panel-pad-x'),
    DEFAULT_PADDING.horizontal
  );
  return { top, bottom, horizontal };
}

function applyCollapsedInlineStyles(panel: HTMLElement, padding: PanelPadding): void {
  panel.style.height = '0px';
  panel.style.opacity = '0';
  panel.style.paddingTop = '0px';
  panel.style.paddingBottom = '0px';
  panel.style.paddingLeft = `${padding.horizontal}px`;
  panel.style.paddingRight = `${padding.horizontal}px`;
  panel.style.overflow = 'hidden';
}

function applyExpandedInlineStyles(
  panel: HTMLElement,
  padding: PanelPadding,
  height?: number
): void {
  panel.style.height = typeof height === 'number' ? `${height}px` : 'auto';
  panel.style.opacity = '1';
  panel.style.paddingTop = `${padding.top}px`;
  panel.style.paddingBottom = `${padding.bottom}px`;
  panel.style.paddingLeft = `${padding.horizontal}px`;
  panel.style.paddingRight = `${padding.horizontal}px`;
  panel.style.overflow = 'hidden';
}

function parseCssNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}
