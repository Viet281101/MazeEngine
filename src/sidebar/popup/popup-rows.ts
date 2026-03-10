import type { TranslationKey } from '../../i18n';
import { setI18nText } from './popup-i18n';
import { getIconPath } from '../../constants/assets';

type RowControl = HTMLElement;

// Moved from setting-dom.ts to be reusable
function createHelpIcon(): HTMLImageElement {
  const icon = document.createElement('img');
  icon.className = 'settings-popup__help-icon';
  icon.src = getIconPath('question.png');
  icon.alt = 'Help';
  icon.tabIndex = 0;
  icon.setAttribute('role', 'button');
  return icon;
}

export function createLabelWithHelp(labelKey: TranslationKey): {
  labelWrap: HTMLSpanElement;
  labelText: HTMLSpanElement;
  helpIcon: HTMLImageElement;
} {
  const labelWrap = document.createElement('span');
  labelWrap.className = 'settings-popup__label settings-popup__label--with-help';

  const labelText = document.createElement('span');
  labelText.className = 'settings-popup__label-text';
  setI18nText(labelText, labelKey);

  const helpIcon = createHelpIcon();

  labelWrap.appendChild(labelText);
  labelWrap.appendChild(helpIcon);

  return { labelWrap, labelText, helpIcon };
}

interface RowOptions {
  label: TranslationKey | HTMLElement;
  control: RowControl;
  className?: string;
  labelClassName?: string;
  rowTag?: 'label' | 'div';
}

/* eslint-disable no-redeclare */
export function createRow(
  options: RowOptions & { rowTag?: 'label' }
): { row: HTMLLabelElement; label: HTMLElement };
export function createRow(
  options: RowOptions & { rowTag: 'div' }
): { row: HTMLDivElement; label: HTMLElement };
export function createRow(options: RowOptions): { row: HTMLElement; label: HTMLElement } {
  const {
    label,
    control,
    className = 'settings-popup__row',
    labelClassName = 'settings-popup__label',
    rowTag = 'label',
  } = options;

  const row = document.createElement(rowTag);
  row.className = className;

  let labelEl: HTMLElement;
  if (typeof label === 'string') {
    labelEl = document.createElement('span');
    labelEl.className = labelClassName;
    setI18nText(labelEl, label);
  } else {
    labelEl = label;
  }

  row.appendChild(labelEl);
  row.appendChild(control);

  return { row, label: labelEl };
}
/* eslint-enable no-redeclare */

interface ToggleRowOptions {
  labelKey: TranslationKey;
  initialState: boolean;
  withHelp?: boolean;
  onToggle?: (newState: boolean) => void;
}

type ToggleRowResult = {
  row: HTMLLabelElement;
  toggle: HTMLInputElement;
  label: HTMLElement;
};

type ToggleRowReturn<WithHelp extends boolean | undefined> = ToggleRowResult &
  (WithHelp extends true ? { helpIcon: HTMLImageElement } : { helpIcon?: HTMLImageElement });

export function createToggleRow<WithHelp extends boolean | undefined>(
  options: ToggleRowOptions & { withHelp?: WithHelp }
): ToggleRowReturn<WithHelp> {
  const { labelKey, initialState, withHelp = false, onToggle } = options;

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.className = 'settings-popup__checkbox';
  toggle.checked = initialState;

  if (onToggle) {
    toggle.addEventListener('change', () => onToggle(toggle.checked));
  }

  let labelEl: HTMLElement;
  let helpIcon: HTMLImageElement | undefined;

  if (withHelp) {
    const { labelWrap, labelText, helpIcon: icon } = createLabelWithHelp(labelKey);
    labelEl = labelWrap;
    helpIcon = icon;
    // Return the inner text element for i18n updates
    const row = createRow({ label: labelEl, control: toggle });
    return { row: row.row, toggle, label: labelText, helpIcon } as ToggleRowReturn<WithHelp>;
  }

  const { row, label } = createRow({
    label: labelKey,
    control: toggle,
  });
  return { row, toggle, label, helpIcon } as ToggleRowReturn<WithHelp>;
}
