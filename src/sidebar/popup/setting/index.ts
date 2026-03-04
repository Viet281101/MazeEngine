import { setLanguage, type AppLanguage } from '../../i18n';
import { Toolbar } from '../../toolbar';
import { PREVIEW_WINDOW_STATUS_CHANGED_EVENT } from '../../../constants/events';
import { watchContainerRemoval } from '../popup-lifecycle';
import {
  applyMeshReductionThreshold,
  canOpenPreviewWindow,
  getInitialSettingsValues,
  reopenPreviewWindow,
  setAdaptiveQualityEnabled,
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
    initialValues.adaptiveQualityEnabled
  );
  const {
    content,
    select,
    previewButton,
    meshReductionToggle,
    thresholdInput,
    hideEdgesDuringInteractionToggle,
    adaptiveQualityToggle,
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

  updatePreviewButtonState();

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

  previewButton.addEventListener('click', () => {
    reopenPreviewWindow();
    updatePreviewButtonState();
  });
}
