type TooltipTarget =
  | 'mesh'
  | 'threshold'
  | 'hideEdges'
  | 'adaptive'
  | 'actionBarVisible'
  | 'solutionPathLineWidth'
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
  actionBarVisibleHelpIcon: HTMLImageElement;
  solutionPathLineWidthHelpIcon: HTMLImageElement;
  showEdgesHelpIcon: HTMLImageElement;
  showDebugHelpIcon: HTMLImageElement;
  showPreviewHelpIcon: HTMLImageElement;
  meshTooltip: HTMLDivElement;
  thresholdTooltip: HTMLDivElement;
  hideEdgesTooltip: HTMLDivElement;
  floorGridTooltip: HTMLDivElement;
  adaptiveTooltip: HTMLDivElement;
  actionBarVisibleTooltip: HTMLDivElement;
  solutionPathLineWidthTooltip: HTMLDivElement;
  showEdgesTooltip: HTMLDivElement;
  showDebugTooltip: HTMLDivElement;
  showPreviewTooltip: HTMLDivElement;
}

export function setupSettingsTooltips(bindings: TooltipBindings): () => void {
  const bindingByTarget: Record<
    TooltipTarget,
    { icon: HTMLImageElement; tooltip: HTMLDivElement }
  > = {
    mesh: { icon: bindings.meshHelpIcon, tooltip: bindings.meshTooltip },
    threshold: { icon: bindings.thresholdHelpIcon, tooltip: bindings.thresholdTooltip },
    hideEdges: { icon: bindings.hideEdgesHelpIcon, tooltip: bindings.hideEdgesTooltip },
    floorGrid: { icon: bindings.floorGridHelpIcon, tooltip: bindings.floorGridTooltip },
    adaptive: { icon: bindings.adaptiveHelpIcon, tooltip: bindings.adaptiveTooltip },
    actionBarVisible: {
      icon: bindings.actionBarVisibleHelpIcon,
      tooltip: bindings.actionBarVisibleTooltip,
    },
    solutionPathLineWidth: {
      icon: bindings.solutionPathLineWidthHelpIcon,
      tooltip: bindings.solutionPathLineWidthTooltip,
    },
    showEdges: { icon: bindings.showEdgesHelpIcon, tooltip: bindings.showEdgesTooltip },
    showDebug: { icon: bindings.showDebugHelpIcon, tooltip: bindings.showDebugTooltip },
    showPreview: { icon: bindings.showPreviewHelpIcon, tooltip: bindings.showPreviewTooltip },
  };
  const targets = Object.keys(bindingByTarget) as TooltipTarget[];
  let pinnedTooltip: TooltipTarget | null = null;

  const getTooltipByTarget = (target: TooltipTarget): HTMLDivElement => {
    return bindingByTarget[target].tooltip;
  };

  const getIconByTarget = (target: TooltipTarget): HTMLImageElement => {
    return bindingByTarget[target].icon;
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
    targets.forEach(currentTarget => {
      getTooltipByTarget(currentTarget).style.display = currentTarget === target ? 'block' : 'none';
    });
  };

  const hideAllTooltips = () => {
    targets.forEach(target => {
      getTooltipByTarget(target).style.display = 'none';
    });
  };

  const hasVisibleTooltip = (): boolean => {
    return targets.some(target => getTooltipByTarget(target).style.display !== 'none');
  };

  const isTargetWithinBoundElements = (targetNode: Node): boolean => {
    return targets.some(target => {
      const { icon, tooltip } = bindingByTarget[target];
      return icon.contains(targetNode) || tooltip.contains(targetNode);
    });
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

  const handleDocumentPointerDown = (event: PointerEvent) => {
    if (!pinnedTooltip) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (isTargetWithinBoundElements(target)) {
      return;
    }
    unpinAndHideTooltip();
  };

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (!hasVisibleTooltip()) {
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

  const unbindHandlers = targets.map(target => bindIcon(target, getIconByTarget(target)));

  document.addEventListener('pointerdown', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);

  return () => {
    unbindHandlers.forEach(unbind => unbind());
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    document.removeEventListener('keydown', handleDocumentKeyDown, true);
  };
}
