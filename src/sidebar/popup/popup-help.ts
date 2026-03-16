import type { TranslationKey } from '../../i18n';
import { getIconPath } from '../../constants/assets';
import { setI18nAriaLabel } from './popup-i18n';

interface HelpIconOptions {
  className: string;
  ariaLabelKey?: TranslationKey;
}

export function createHelpIcon(options: HelpIconOptions): HTMLImageElement {
  const icon = document.createElement('img');
  icon.className = options.className;
  icon.src = getIconPath('question.png');
  icon.alt = 'Help';
  icon.tabIndex = 0;
  icon.setAttribute('role', 'button');

  if (options.ariaLabelKey) {
    setI18nAriaLabel(icon, options.ariaLabelKey);
  }

  return icon;
}
