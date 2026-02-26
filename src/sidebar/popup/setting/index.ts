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

  const row = document.createElement('label');
  row.className = 'settings-popup__row';

  const label = document.createElement('span');
  label.className = 'settings-popup__label';

  const select = document.createElement('select');
  select.className = 'settings-popup__select';
  select.appendChild(createLanguageOption('vi'));
  select.appendChild(createLanguageOption('en'));
  select.appendChild(createLanguageOption('fr'));
  select.value = getLanguage();

  row.appendChild(label);
  row.appendChild(select);
  content.appendChild(row);

  popupContainer.insertBefore(content, popupContainer.firstChild);

  const applyText = () => {
    label.textContent = t('settings.language');
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
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  select.addEventListener('change', () => {
    const nextLanguage = select.value as AppLanguage;
    void setLanguage(nextLanguage);
  });
  select.addEventListener('focus', prefetchOtherLanguages, { once: true });
  select.addEventListener('pointerenter', prefetchOtherLanguages, { once: true });
}
