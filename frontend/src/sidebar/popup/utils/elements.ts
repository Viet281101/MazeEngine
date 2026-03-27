import type { TranslationKey } from '../../../i18n';
import { setI18nText } from './i18n';

interface I18nButtonConfig {
  textKey: TranslationKey;
  className: string;
}

/**
 * Creates a button with translated label and predefined class name.
 */
export function createI18nButton(config: I18nButtonConfig): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = config.className;
  setI18nText(button, config.textKey);
  return button;
}
