type TooltipTarget = 'mesh' | 'threshold';

interface TooltipBindings {
  meshHelpIcon: HTMLImageElement;
  thresholdHelpIcon: HTMLImageElement;
  meshTooltip: HTMLDivElement;
  thresholdTooltip: HTMLDivElement;
}

export function setupSettingsTooltips(bindings: TooltipBindings): () => void {
  const { meshHelpIcon, thresholdHelpIcon, meshTooltip, thresholdTooltip } = bindings;
  let pinnedTooltip: TooltipTarget | null = null;

  const showTooltip = (target: TooltipTarget) => {
    meshTooltip.style.display = target === 'mesh' ? 'block' : 'none';
    thresholdTooltip.style.display = target === 'threshold' ? 'block' : 'none';
  };

  const hideAllTooltips = () => {
    meshTooltip.style.display = 'none';
    thresholdTooltip.style.display = 'none';
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
      meshTooltip.contains(target) ||
      thresholdTooltip.contains(target)
    ) {
      return;
    }
    unpinAndHideTooltip();
  };

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (meshTooltip.style.display === 'none' && thresholdTooltip.style.display === 'none') {
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

  document.addEventListener('mousedown', handleDocumentPointerDown, true);
  document.addEventListener('touchstart', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);

  return () => {
    unbindMesh();
    unbindThreshold();
    document.removeEventListener('mousedown', handleDocumentPointerDown, true);
    document.removeEventListener('touchstart', handleDocumentPointerDown, true);
    document.removeEventListener('keydown', handleDocumentKeyDown, true);
  };
}
