import { t, type TranslationKey } from '../i18n';

/**
 * Binds an element text node to an i18n key.
 */
export function setI18nText(element: HTMLElement, key: TranslationKey): void {
  element.setAttribute('data-i18n-key', key);
  element.textContent = t(key);
}

/**
 * Refreshes translated text for all tagged elements under a container.
 */
export function applyI18nTexts(container: ParentNode): void {
  const i18nElements = container.querySelectorAll<HTMLElement>('[data-i18n-key]');
  i18nElements.forEach(element => {
    const key = element.getAttribute('data-i18n-key');
    if (key) {
      element.textContent = t(key as TranslationKey);
    }
  });
}
