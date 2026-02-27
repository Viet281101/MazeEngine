import {
  getLanguage,
  prefetchLanguage,
  setLanguage,
  subscribeLanguageChange,
  t,
  type AppLanguage,
} from '../../i18n';
import { Toolbar } from '../../toolbar';
import './setting.css';

interface MazeAppSettingsBridge {
  setMeshReductionThreshold?: (threshold: number) => void;
  getMeshReductionThreshold?: () => number;
  setMeshReductionEnabled?: (enabled: boolean) => void;
  isMeshReductionEnabled?: () => boolean;
  getMazeData?: () => number[][][];
}

function getMazeAppBridge(): MazeAppSettingsBridge | null {
  const mazeApp = (window as any).mazeApp as MazeAppSettingsBridge | undefined;
  return mazeApp ?? null;
}

function createLanguageOption(language: AppLanguage): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = language;
  option.setAttribute('data-language', language);
  option.textContent = t(`settings.language.${language}`);
  return option;
}

export function showSettingsPopup(toolbar: Toolbar) {
  const popupContainer = toolbar.createPopupContainerByKey('settingsPopup', 'popup.settings');
  popupContainer.classList.add('settings-popup');

  const content = document.createElement('div');
  content.className = 'settings-popup__content';

  const languageRow = document.createElement('label');
  languageRow.className = 'settings-popup__row';

  const languageLabel = document.createElement('span');
  languageLabel.className = 'settings-popup__label';

  const select = document.createElement('select');
  select.className = 'settings-popup__select';
  select.appendChild(createLanguageOption('vi'));
  select.appendChild(createLanguageOption('en'));
  select.appendChild(createLanguageOption('fr'));
  select.value = getLanguage();

  languageRow.appendChild(languageLabel);
  languageRow.appendChild(select);
  content.appendChild(languageRow);

  const mazeApp = getMazeAppBridge();

  const meshReductionRow = document.createElement('label');
  meshReductionRow.className = 'settings-popup__row';
  const meshReductionLabelWrap = document.createElement('span');
  meshReductionLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const meshReductionLabel = document.createElement('span');
  meshReductionLabel.className = 'settings-popup__label-text';
  const meshReductionHelpIcon = document.createElement('img');
  meshReductionHelpIcon.className = 'settings-popup__help-icon';
  meshReductionHelpIcon.src = '/MazeSolver3D/icon/question.png';
  meshReductionHelpIcon.alt = 'Help';
  meshReductionHelpIcon.tabIndex = 0;
  meshReductionHelpIcon.setAttribute('role', 'button');

  meshReductionLabelWrap.appendChild(meshReductionLabel);
  meshReductionLabelWrap.appendChild(meshReductionHelpIcon);
  const meshReductionToggle = document.createElement('input');
  meshReductionToggle.type = 'checkbox';
  meshReductionToggle.className = 'settings-popup__checkbox';
  meshReductionToggle.checked =
    mazeApp && typeof mazeApp.isMeshReductionEnabled === 'function'
      ? mazeApp.isMeshReductionEnabled()
      : true;
  meshReductionRow.appendChild(meshReductionLabelWrap);
  meshReductionRow.appendChild(meshReductionToggle);
  content.appendChild(meshReductionRow);

  const thresholdRow = document.createElement('label');
  thresholdRow.className = 'settings-popup__row';
  const thresholdLabelWrap = document.createElement('span');
  thresholdLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const thresholdLabel = document.createElement('span');
  thresholdLabel.className = 'settings-popup__label-text';
  const thresholdHelpIcon = document.createElement('img');
  thresholdHelpIcon.className = 'settings-popup__help-icon';
  thresholdHelpIcon.src = '/MazeSolver3D/icon/question.png';
  thresholdHelpIcon.alt = 'Help';
  thresholdHelpIcon.tabIndex = 0;
  thresholdHelpIcon.setAttribute('role', 'button');
  const thresholdInput = document.createElement('input');
  thresholdInput.type = 'number';
  thresholdInput.className = 'settings-popup__input';
  thresholdInput.min = '5';
  thresholdInput.max = '200';
  thresholdInput.step = '1';
  thresholdInput.value = String(
    mazeApp && typeof mazeApp.getMeshReductionThreshold === 'function'
      ? mazeApp.getMeshReductionThreshold()
      : 25
  );
  thresholdLabelWrap.appendChild(thresholdLabel);
  thresholdLabelWrap.appendChild(thresholdHelpIcon);
  thresholdRow.appendChild(thresholdLabelWrap);
  thresholdRow.appendChild(thresholdInput);
  content.appendChild(thresholdRow);

  const meshReductionTooltip = document.createElement('div');
  meshReductionTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--mesh';
  meshReductionTooltip.style.display = 'none';
  const meshReductionTooltipText = document.createElement('p');
  meshReductionTooltipText.className = 'settings-popup__tooltip-text';
  const meshReductionTooltipButton = document.createElement('button');
  meshReductionTooltipButton.type = 'button';
  meshReductionTooltipButton.className = 'settings-popup__tooltip-btn';
  meshReductionTooltipButton.disabled = true;
  meshReductionTooltip.appendChild(meshReductionTooltipText);
  meshReductionTooltip.appendChild(meshReductionTooltipButton);
  content.appendChild(meshReductionTooltip);

  const thresholdTooltip = document.createElement('div');
  thresholdTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--threshold';
  thresholdTooltip.style.display = 'none';
  const thresholdTooltipText = document.createElement('p');
  thresholdTooltipText.className = 'settings-popup__tooltip-text';
  thresholdTooltip.appendChild(thresholdTooltipText);
  content.appendChild(thresholdTooltip);

  popupContainer.insertBefore(content, popupContainer.firstChild);
  let pinnedTooltip: 'mesh' | 'threshold' | null = null;
  const showTooltip = (target: 'mesh' | 'threshold') => {
    meshReductionTooltip.style.display = target === 'mesh' ? 'block' : 'none';
    thresholdTooltip.style.display = target === 'threshold' ? 'block' : 'none';
  };
  const hideAllTooltips = () => {
    meshReductionTooltip.style.display = 'none';
    thresholdTooltip.style.display = 'none';
  };
  const unpinAndHideTooltip = () => {
    pinnedTooltip = null;
    hideAllTooltips();
  };
  const toggleTooltip = (target: 'mesh' | 'threshold') => {
    if (pinnedTooltip === target) {
      unpinAndHideTooltip();
    } else {
      pinnedTooltip = target;
      showTooltip(target);
    }
  };

  const applyText = () => {
    languageLabel.textContent = t('settings.language');
    meshReductionLabel.textContent = t('settings.meshVisible');
    thresholdLabel.textContent = t('settings.meshReductionThreshold');
    meshReductionTooltipText.textContent = t('settings.meshReductionTooltip');
    thresholdTooltipText.textContent = t('settings.meshReductionThresholdTooltip');
    meshReductionTooltipButton.textContent = `${t('settings.openTutorial')} (${t('settings.tutorialSoon')})`;
    const options = select.querySelectorAll<HTMLOptionElement>('option[data-language]');
    options.forEach(option => {
      const language = option.getAttribute('data-language') as AppLanguage;
      option.textContent = t(`settings.language.${language}`);
    });
    select.value = getLanguage();
  };

  applyText();

  let prefetched = false;
  const prefetchOtherLanguages = () => {
    if (prefetched) return;
    prefetched = true;
    const current = getLanguage();
    (['vi', 'en', 'fr'] as AppLanguage[])
      .filter(language => language !== current)
      .forEach(language => {
        void prefetchLanguage(language);
      });
  };
  prefetchOtherLanguages();

  const unsubscribe = subscribeLanguageChange(() => {
    applyText();
  });

  const observer = new MutationObserver(() => {
    if (!document.body.contains(popupContainer)) {
      unsubscribe();
      document.removeEventListener('mousedown', handleDocumentPointerDown, true);
      document.removeEventListener('touchstart', handleDocumentPointerDown, true);
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const handleDocumentPointerDown = (event: MouseEvent | TouchEvent) => {
    if (!pinnedTooltip) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (
      meshReductionHelpIcon.contains(target) ||
      thresholdHelpIcon.contains(target) ||
      meshReductionTooltip.contains(target) ||
      thresholdTooltip.contains(target)
    ) {
      return;
    }
    unpinAndHideTooltip();
  };

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (meshReductionTooltip.style.display === 'none' && thresholdTooltip.style.display === 'none')
      return;
    unpinAndHideTooltip();
  };

  document.addEventListener('mousedown', handleDocumentPointerDown, true);
  document.addEventListener('touchstart', handleDocumentPointerDown, true);
  document.addEventListener('keydown', handleDocumentKeyDown, true);

  select.addEventListener('change', () => {
    const nextLanguage = select.value as AppLanguage;
    void setLanguage(nextLanguage);
  });
  select.addEventListener('focus', prefetchOtherLanguages, { once: true });
  select.addEventListener('pointerenter', prefetchOtherLanguages, { once: true });

  meshReductionToggle.addEventListener('change', () => {
    const app = getMazeAppBridge();
    if (app && typeof app.setMeshReductionEnabled === 'function') {
      app.setMeshReductionEnabled(meshReductionToggle.checked);
    }
  });

  const applyThreshold = () => {
    const raw = Number(thresholdInput.value);
    const clamped = Math.max(5, Math.min(200, Number.isFinite(raw) ? Math.floor(raw) : 25));
    thresholdInput.value = String(clamped);
    const app = getMazeAppBridge();
    if (app && typeof app.setMeshReductionThreshold === 'function') {
      app.setMeshReductionThreshold(clamped);
    }
  };

  thresholdInput.addEventListener('change', applyThreshold);
  thresholdInput.addEventListener('blur', applyThreshold);

  meshReductionHelpIcon.addEventListener('mouseenter', () => {
    if (!pinnedTooltip) {
      showTooltip('mesh');
    }
  });
  meshReductionHelpIcon.addEventListener('mouseleave', () => {
    if (!pinnedTooltip) {
      hideAllTooltips();
    }
  });
  meshReductionHelpIcon.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    toggleTooltip('mesh');
  });
  meshReductionHelpIcon.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTooltip('mesh');
    }
  });

  thresholdHelpIcon.addEventListener('mouseenter', () => {
    if (!pinnedTooltip) {
      showTooltip('threshold');
    }
  });
  thresholdHelpIcon.addEventListener('mouseleave', () => {
    if (!pinnedTooltip) {
      hideAllTooltips();
    }
  });
  thresholdHelpIcon.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    toggleTooltip('threshold');
  });
  thresholdHelpIcon.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTooltip('threshold');
    }
  });
}
