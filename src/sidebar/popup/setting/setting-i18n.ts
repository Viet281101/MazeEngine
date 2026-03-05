import {
  getLanguage,
  prefetchLanguage,
  subscribeLanguageChange,
  t,
  type AppLanguage,
} from '../../i18n';
import type { SettingsPopupDom } from './setting-dom';

const LANGUAGE_OPTIONS: readonly AppLanguage[] = ['vi', 'en', 'fr'];

export function applySettingsTranslations(dom: SettingsPopupDom): void {
  dom.languageLabel.textContent = t('settings.language');
  dom.meshReductionLabel.textContent = t('settings.meshVisible');
  dom.thresholdLabel.textContent = t('settings.meshReductionThreshold');
  dom.hideEdgesDuringInteractionLabel.textContent = t('settings.hideEdgesDuringInteraction');
  dom.adaptiveQualityLabel.textContent = t('settings.adaptiveQuality');
  dom.cameraZoomLimitLabel.textContent = t('settings.cameraZoomLimit');
  dom.cameraZoomMinLabel.textContent = t('settings.cameraZoomLimitMin');
  dom.cameraZoomMaxLabel.textContent = t('settings.cameraZoomLimitMax');
  dom.previewLabel.textContent = t('settings.previewWindow');
  dom.previewButton.textContent = t('settings.openPreviewWindow');
  dom.meshReductionTooltipText.textContent = t('settings.meshReductionTooltip');
  dom.thresholdTooltipText.textContent = t('settings.meshReductionThresholdTooltip');
  dom.hideEdgesDuringInteractionTooltipText.textContent = t(
    'settings.hideEdgesDuringInteractionTooltip'
  );
  dom.adaptiveQualityTooltipText.textContent = t('settings.adaptiveQualityTooltip');
  dom.meshReductionTooltipButton.textContent = `${t('settings.openTutorial')} (${t('settings.tutorialSoon')})`;
  dom.cameraZoomMinIncreaseButton.setAttribute('aria-label', t('settings.cameraZoomMinIncrease'));
  dom.cameraZoomMinDecreaseButton.setAttribute('aria-label', t('settings.cameraZoomMinDecrease'));
  dom.cameraZoomMaxIncreaseButton.setAttribute('aria-label', t('settings.cameraZoomMaxIncrease'));
  dom.cameraZoomMaxDecreaseButton.setAttribute('aria-label', t('settings.cameraZoomMaxDecrease'));

  dom.languageOptions.vi.textContent = t('settings.language.vi');
  dom.languageOptions.en.textContent = t('settings.language.en');
  dom.languageOptions.fr.textContent = t('settings.language.fr');
  dom.select.value = getLanguage();
}

export function setupLanguagePrefetch(select: HTMLSelectElement): () => void {
  let prefetched = false;
  const prefetchOtherLanguages = () => {
    if (prefetched) {
      return;
    }
    prefetched = true;
    const current = getLanguage();
    LANGUAGE_OPTIONS.filter(language => language !== current).forEach(language => {
      void prefetchLanguage(language);
    });
  };

  prefetchOtherLanguages();
  select.addEventListener('focus', prefetchOtherLanguages, { once: true });
  select.addEventListener('pointerenter', prefetchOtherLanguages, { once: true });

  return () => {
    select.removeEventListener('focus', prefetchOtherLanguages);
    select.removeEventListener('pointerenter', prefetchOtherLanguages);
  };
}

export function setupLanguageTranslations(dom: SettingsPopupDom): () => void {
  applySettingsTranslations(dom);
  return subscribeLanguageChange(() => {
    applySettingsTranslations(dom);
  });
}
