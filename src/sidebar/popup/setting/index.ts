import { setLanguage, type AppLanguage } from '../../i18n';
import { Toolbar } from '../../toolbar';
import { PREVIEW_WINDOW_STATUS_CHANGED_EVENT } from '../../../constants/events';
import { watchContainerRemoval } from '../popup-lifecycle';
import {
  applyCameraZoomMaxDistance,
  applyCameraZoomMinDistance,
  applyMeshReductionThreshold,
  canOpenPreviewWindow,
  getInitialSettingsValues,
  isPreviewSupported,
  isPreviewVisible,
  reopenPreviewWindow,
  setDebugVisible,
  setEdgesVisible,
  setAdaptiveQualityEnabled,
  setCameraZoomLimitEnabled,
  setFloorGridEnabled,
  setHideEdgesDuringInteractionEnabled,
  setMeshReductionEnabled,
  setPreviewVisible,
} from './setting-app-bridge';
import { createSettingsPopupDom } from './setting-dom';
import { setupLanguagePrefetch, setupLanguageTranslations } from './setting-i18n';
import { setupSettingsTooltips } from './setting-tooltips';
import './setting.css';

export function showSettingsPopup(toolbar: Toolbar): void {
  const popupContainer = toolbar.createPopupContainerByKey('settingsPopup', 'popup.settings');
  popupContainer.classList.add('settings-popup');

  const initialValues = getInitialSettingsValues();

  const dom = createSettingsPopupDom(
    initialValues.meshReductionEnabled,
    initialValues.meshReductionThreshold,
    initialValues.hideEdgesDuringInteractionEnabled,
    initialValues.floorGridEnabled,
    initialValues.adaptiveQualityEnabled,
    initialValues.edgesVisible,
    initialValues.debugVisible,
    initialValues.previewVisible,
    initialValues.cameraZoomLimitEnabled,
    initialValues.cameraZoomMinDistance,
    initialValues.cameraZoomMaxDistance
  );
  const {
    content,
    select,
    previewButton,
    meshReductionToggle,
    thresholdInput,
    hideEdgesDuringInteractionToggle,
    floorGridToggle,
    adaptiveQualityToggle,
    showEdgesToggle,
    showDebugToggle,
    showPreviewToggle,
    cameraZoomLimitToggle,
    cameraZoomMinInput,
    cameraZoomMaxInput,
    cameraZoomMinRow,
    cameraZoomMaxRow,
    meshReductionHelpIcon,
    thresholdHelpIcon,
    hideEdgesDuringInteractionHelpIcon,
    floorGridHelpIcon,
    adaptiveQualityHelpIcon,
    showEdgesHelpIcon,
    showDebugHelpIcon,
    showPreviewHelpIcon,
    meshReductionTooltip,
    thresholdTooltip,
    hideEdgesDuringInteractionTooltip,
    floorGridTooltip,
    adaptiveQualityTooltip,
    showEdgesTooltip,
    showDebugTooltip,
    showPreviewTooltip,
  } = dom;

  popupContainer.insertBefore(content, popupContainer.firstChild);

  const updatePreviewWindowControlsState = () => {
    const canOpenNewPreviewWindow = canOpenPreviewWindow();
    const previewSupported = isPreviewSupported();
    previewButton.disabled = !canOpenNewPreviewWindow;
    showPreviewToggle.checked = isPreviewVisible();
    showPreviewToggle.disabled = !previewSupported || canOpenNewPreviewWindow;
    if (!previewSupported) {
      previewButton.disabled = true;
      showPreviewToggle.checked = false;
    }
  };

  const applyThreshold = () => {
    const clamped = applyMeshReductionThreshold(Number(thresholdInput.value));
    thresholdInput.value = String(clamped);
  };

  const syncCameraZoomRowsVisibility = () => {
    const display = cameraZoomLimitToggle.checked ? 'grid' : 'none';
    cameraZoomMinRow.style.display = display;
    cameraZoomMaxRow.style.display = display;
  };

  const applyCameraZoomMin = () => {
    const clamped = applyCameraZoomMinDistance(Number(cameraZoomMinInput.value));
    const maxValue = Number(cameraZoomMaxInput.value);
    if (maxValue < clamped) {
      cameraZoomMaxInput.value = String(clamped);
      applyCameraZoomMaxDistance(clamped);
    }
    cameraZoomMinInput.value = String(clamped);
  };

  const applyCameraZoomMax = () => {
    const clamped = applyCameraZoomMaxDistance(Number(cameraZoomMaxInput.value));
    const minValue = Number(cameraZoomMinInput.value);
    if (minValue > clamped) {
      cameraZoomMinInput.value = String(clamped);
      applyCameraZoomMinDistance(clamped);
    }
    cameraZoomMaxInput.value = String(clamped);
  };

  updatePreviewWindowControlsState();
  syncCameraZoomRowsVisibility();

  const unsubscribeLanguageChange = setupLanguageTranslations(dom);
  const cleanupLanguagePrefetch = setupLanguagePrefetch(select);
  const cleanupTooltips = setupSettingsTooltips({
    meshHelpIcon: meshReductionHelpIcon,
    thresholdHelpIcon: thresholdHelpIcon,
    hideEdgesHelpIcon: hideEdgesDuringInteractionHelpIcon,
    floorGridHelpIcon: floorGridHelpIcon,
    adaptiveHelpIcon: adaptiveQualityHelpIcon,
    showEdgesHelpIcon: showEdgesHelpIcon,
    showDebugHelpIcon: showDebugHelpIcon,
    showPreviewHelpIcon: showPreviewHelpIcon,
    meshTooltip: meshReductionTooltip,
    thresholdTooltip: thresholdTooltip,
    hideEdgesTooltip: hideEdgesDuringInteractionTooltip,
    floorGridTooltip: floorGridTooltip,
    adaptiveTooltip: adaptiveQualityTooltip,
    showEdgesTooltip: showEdgesTooltip,
    showDebugTooltip: showDebugTooltip,
    showPreviewTooltip: showPreviewTooltip,
  });

  const handlePreviewStatusChanged = () => {
    updatePreviewWindowControlsState();
  };

  watchContainerRemoval(popupContainer, () => {
    unsubscribeLanguageChange();
    cleanupLanguagePrefetch();
    cleanupTooltips();
    window.removeEventListener(PREVIEW_WINDOW_STATUS_CHANGED_EVENT, handlePreviewStatusChanged);
  });

  window.addEventListener(PREVIEW_WINDOW_STATUS_CHANGED_EVENT, handlePreviewStatusChanged);

  select.addEventListener('change', () => {
    const nextLanguage = select.value as AppLanguage;
    void setLanguage(nextLanguage);
  });

  meshReductionToggle.addEventListener('change', () => {
    setMeshReductionEnabled(meshReductionToggle.checked);
  });

  thresholdInput.addEventListener('change', applyThreshold);
  thresholdInput.addEventListener('blur', applyThreshold);
  hideEdgesDuringInteractionToggle.addEventListener('change', () => {
    setHideEdgesDuringInteractionEnabled(hideEdgesDuringInteractionToggle.checked);
  });
  floorGridToggle.addEventListener('change', () => {
    setFloorGridEnabled(floorGridToggle.checked);
  });
  adaptiveQualityToggle.addEventListener('change', () => {
    setAdaptiveQualityEnabled(adaptiveQualityToggle.checked);
  });
  showEdgesToggle.addEventListener('change', () => {
    setEdgesVisible(showEdgesToggle.checked);
  });
  showDebugToggle.addEventListener('change', () => {
    setDebugVisible(showDebugToggle.checked);
  });
  showPreviewToggle.addEventListener('change', () => {
    setPreviewVisible(showPreviewToggle.checked);
    updatePreviewWindowControlsState();
  });
  cameraZoomLimitToggle.addEventListener('change', () => {
    setCameraZoomLimitEnabled(cameraZoomLimitToggle.checked);
    syncCameraZoomRowsVisibility();
  });
  cameraZoomMinInput.addEventListener('change', applyCameraZoomMin);
  cameraZoomMinInput.addEventListener('blur', applyCameraZoomMin);
  cameraZoomMaxInput.addEventListener('change', applyCameraZoomMax);
  cameraZoomMaxInput.addEventListener('blur', applyCameraZoomMax);

  previewButton.addEventListener('click', () => {
    reopenPreviewWindow();
    updatePreviewWindowControlsState();
  });
}
