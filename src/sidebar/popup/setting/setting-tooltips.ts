type TooltipTarget =
  | 'mesh'
  | 'threshold'
  | 'hideEdges'
  | 'adaptive'
  | 'floorGrid'
  | 'showEdges'
  | 'showDebug'
  | 'showPreview';

interface TooltipBindings {
  meshHelpIcon: HTMLImageElement;
  thresholdHelpIcon: HTMLImageElement;
  hideEdgesHelpIcon: HTMLImageElement;
  floorGridHelpIcon: HTMLImageElement;
  adaptiveHelpIcon: HTMLImageElement;
  showEdgesHelpIcon: HTMLImageElement;
  showDebugHelpIcon: HTMLImageElement;
  showPreviewHelpIcon: HTMLImageElement;
  meshTooltip: HTMLDivElement;
  thresholdTooltip: HTMLDivElement;
  hideEdgesTooltip: HTMLDivElement;
  floorGridTooltip: HTMLDivElement;
  adaptiveTooltip: HTMLDivElement;
  showEdgesTooltip: HTMLDivElement;
  showDebugTooltip: HTMLDivElement;
  showPreviewTooltip: HTMLDivElement;
}

export function setupSettingsTooltips(bindings: TooltipBindings): () => void {
  const {
    meshHelpIcon,
    thresholdHelpIcon,
    hideEdgesHelpIcon,
    floorGridHelpIcon,
    adaptiveHelpIcon,
    showEdgesHelpIcon,
    showDebugHelpIcon,
    showPreviewHelpIcon,
    meshTooltip,
    thresholdTooltip,
    hideEdgesTooltip,
    floorGridTooltip,
    adaptiveTooltip,
    showEdgesTooltip,
    showDebugTooltip,
    showPreviewTooltip,
  } = bindings;
  let pinnedTooltip: TooltipTarget | null = null;

  const getTooltipByTarget = (target: TooltipTarget): HTMLDivElement => {
    if (target === 'mesh') return meshTooltip;
    if (target === 'threshold') return thresholdTooltip;
    if (target === 'hideEdges') return hideEdgesTooltip;
    if (target === 'floorGrid') return floorGridTooltip;
    if (target === 'adaptive') return adaptiveTooltip;
    if (target === 'showEdges') return showEdgesTooltip;
    if (target === 'showDebug') return showDebugTooltip;
    return showPreviewTooltip;
  };

  const getIconByTarget = (target: TooltipTarget): HTMLImageElement => {
    if (target === 'mesh') return meshHelpIcon;
    if (target === 'threshold') return thresholdHelpIcon;
    if (target === 'hideEdges') return hideEdgesHelpIcon;
    if (target === 'floorGrid') return floorGridHelpIcon;
    if (target === 'adaptive') return adaptiveHelpIcon;
    if (target === 'showEdges') return showEdgesHelpIcon;
    if (target === 'showDebug') return showDebugHelpIcon;
    return showPreviewHelpIcon;
  };

  const positionTooltip = (target: TooltipTarget) => {
    const tooltip = getTooltipByTarget(target);
    const icon = getIconByTarget(target);
    const container = tooltip.parentElement;
    if (!container) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const nextTop = Math.max(Math.round(iconRect.bottom - containerRect.top + 8), 0);
    tooltip.style.top = `${nextTop}px`;
  };

  const showTooltip = (target: TooltipTarget) => {
    positionTooltip(target);
    meshTooltip.style.display = target === 'mesh' ? 'block' : 'none';
    thresholdTooltip.style.display = target === 'threshold' ? 'block' : 'none';
    hideEdgesTooltip.style.display = target === 'hideEdges' ? 'block' : 'none';
    floorGridTooltip.style.display = target === 'floorGrid' ? 'block' : 'none';
    adaptiveTooltip.style.display = target === 'adaptive' ? 'block' : 'none';
    showEdgesTooltip.style.display = target === 'showEdges' ? 'block' : 'none';
    showDebugTooltip.style.display = target === 'showDebug' ? 'block' : 'none';
    showPreviewTooltip.style.display = target === 'showPreview' ? 'block' : 'none';
  };

  const hideAllTooltips = () => {
    meshTooltip.style.display = 'none';
    thresholdTooltip.style.display = 'none';
    hideEdgesTooltip.style.display = 'none';
    floorGridTooltip.style.display = 'none';
    adaptiveTooltip.style.display = 'none';
    showEdgesTooltip.style.display = 'none';
    showDebugTooltip.style.display = 'none';
    showPreviewTooltip.style.display = 'none';
  };

  const unpinAndHideTooltip = () => {
    pinnedTooltip = null;
    hideAllTooltips();
  };

  const toggleTooltip = (target: TooltipTarget) => {
    if (pinnedTooltip === target) {
      unpinAndHideTooltip();
    } else {
      pinnedTooltip = target;
      showTooltip(target);
    }
  };

  const handleDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
    if (!pinnedTooltip) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (
      meshHelpIcon.contains(target) ||
      thresholdHelpIcon.contains(target) ||
      hideEdgesHelpIcon.contains(target) ||
      floorGridHelpIcon.contains(target) ||
      adaptiveHelpIcon.contains(target) ||
      showEdgesHelpIcon.contains(target) ||
      showDebugHelpIcon.contains(target) ||
      showPreviewHelpIcon.contains(target) ||
      meshTooltip.contains(target) ||
      thresholdTooltip.contains(target) ||
      hideEdgesTooltip.contains(target) ||
      floorGridTooltip.contains(target) ||
      adaptiveTooltip.contains(target) ||
      showEdgesTooltip.contains(target) ||
      showDebugTooltip.contains(target) ||
      showPreviewTooltip.contains(target)
    ) {
      return;
    }
    unpinAndHideTooltip();
  };

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (
      meshTooltip.style.display === 'none' &&
      thresholdTooltip.style.display === 'none' &&
      hideEdgesTooltip.style.display === 'none' &&
      floorGridTooltip.style.display === 'none' &&
      adaptiveTooltip.style.display === 'none' &&
      showEdgesTooltip.style.display === 'none' &&
      showDebugTooltip.style.display === 'none' &&
      showPreviewTooltip.style.display === 'none'
    ) {
      return;
    }
    unpinAndHideTooltip();
  };

  const bindIcon = (target: TooltipTarget, icon: HTMLImageElement) => {
    const onMouseEnter = () => {
      if (!pinnedTooltip) {
        showTooltip(target);
      }
    };
    const onMouseLeave = () => {
      if (!pinnedTooltip) {
        hideAllTooltips();
      }
    };
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTooltip(target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleTooltip(target);
      }
    };

    icon.addEventListener('mouseenter', onMouseEnter);
    icon.addEventListener('mouseleave', onMouseLeave);
    icon.addEventListener('click', onClick);
    icon.addEventListener('keydown', onKeyDown);

    return () => {
      icon.removeEventListener('mouseenter', onMouseEnter);
      icon.removeEventListener('mouseleave', onMouseLeave);
      icon.removeEventListener('click', onClick);
      icon.removeEventListener('keydown', onKeyDown);
    };
  };

  const unbindMesh = bindIcon('mesh', meshHelpIcon);
  const unbindThreshold = bindIcon('threshold', thresholdHelpIcon);
  const unbindHideEdges = bindIcon('hideEdges', hideEdgesHelpIcon);
  const unbindFloorGrid = bindIcon('floorGrid', floorGridHelpIcon);
  const unbindAdaptive = bindIcon('adaptive', adaptiveHelpIcon);
  const unbindShowEdges = bindIcon('showEdges', showEdgesHelpIcon);
  const unbindShowDebug = bindIcon('showDebug', showDebugHelpIcon);
  const unbindShowPreview = bindIcon('showPreview', showPreviewHelpIcon);

  document.addEventListener('mousedown', handleDocumentPointerDown, true);
  document.addEventListener('touchstart', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);

  return () => {
    unbindMesh();
    unbindThreshold();
    unbindHideEdges();
    unbindFloorGrid();
    unbindAdaptive();
    unbindShowEdges();
    unbindShowDebug();
    unbindShowPreview();
    document.removeEventListener('mousedown', handleDocumentPointerDown, true);
    document.removeEventListener('touchstart', handleDocumentPointerDown, true);
    document.removeEventListener('keydown', handleDocumentKeyDown, true);
  };
}
