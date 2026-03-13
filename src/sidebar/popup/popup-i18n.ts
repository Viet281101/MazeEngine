import { t, type TranslationKey } from '../../i18n';

/**
 * Binds an element text node to an i18n key.
 */
export function setI18nText(element: HTMLElement, key: TranslationKey): void {
  element.setAttribute('data-i18n-key', key);
  element.textContent = t(key);
}

/**
 * Binds an element title attribute to an i18n key.
 */
export function setI18nTitle(element: HTMLElement, key: TranslationKey): void {
  element.setAttribute('data-i18n-title-key', key);
  element.title = t(key);
}

/**
 * Binds an element aria-label attribute to an i18n key.
 */
export function setI18nAriaLabel(element: HTMLElement, key: TranslationKey): void {
  element.setAttribute('data-i18n-aria-label-key', key);
  element.setAttribute('aria-label', t(key));
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

  const i18nTitleElements = container.querySelectorAll<HTMLElement>('[data-i18n-title-key]');
  i18nTitleElements.forEach(element => {
    const key = element.getAttribute('data-i18n-title-key');
    if (key) {
      element.title = t(key as TranslationKey);
    }
  });

  const i18nAriaLabelElements = container.querySelectorAll<HTMLElement>(
    '[data-i18n-aria-label-key]'
  );
  i18nAriaLabelElements.forEach(element => {
    const key = element.getAttribute('data-i18n-aria-label-key');
    if (key) {
      element.setAttribute('aria-label', t(key as TranslationKey));
    }
  });
}
