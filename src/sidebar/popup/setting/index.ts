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
  reopenPreviewWindow,
  setAdaptiveQualityEnabled,
  setCameraZoomLimitEnabled,
  setHideEdgesDuringInteractionEnabled,
  setMeshReductionEnabled,
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
    initialValues.adaptiveQualityEnabled,
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
    adaptiveQualityToggle,
    cameraZoomLimitToggle,
    cameraZoomMinInput,
    cameraZoomMaxInput,
    cameraZoomMinRow,
    cameraZoomMaxRow,
    meshReductionHelpIcon,
    thresholdHelpIcon,
    hideEdgesDuringInteractionHelpIcon,
    adaptiveQualityHelpIcon,
    meshReductionTooltip,
    thresholdTooltip,
    hideEdgesDuringInteractionTooltip,
    adaptiveQualityTooltip,
  } = dom;

  popupContainer.insertBefore(content, popupContainer.firstChild);

  const updatePreviewButtonState = () => {
    previewButton.disabled = !canOpenPreviewWindow();
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

  updatePreviewButtonState();
  syncCameraZoomRowsVisibility();

  const unsubscribeLanguageChange = setupLanguageTranslations(dom);
  const cleanupLanguagePrefetch = setupLanguagePrefetch(select);
  const cleanupTooltips = setupSettingsTooltips({
    meshHelpIcon: meshReductionHelpIcon,
    thresholdHelpIcon: thresholdHelpIcon,
    hideEdgesHelpIcon: hideEdgesDuringInteractionHelpIcon,
    adaptiveHelpIcon: adaptiveQualityHelpIcon,
    meshTooltip: meshReductionTooltip,
    thresholdTooltip: thresholdTooltip,
    hideEdgesTooltip: hideEdgesDuringInteractionTooltip,
    adaptiveTooltip: adaptiveQualityTooltip,
  });

  const handlePreviewStatusChanged = () => {
    updatePreviewButtonState();
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
  adaptiveQualityToggle.addEventListener('change', () => {
    setAdaptiveQualityEnabled(adaptiveQualityToggle.checked);
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
    updatePreviewButtonState();
  });
}
