import { t } from '../i18n';
import { getIconPath } from '../constants/assets';
import type { ActionBarRefs } from './actionbar-types';

function createActionButton(extraClassName?: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `bottom-action-bar__button${extraClassName ? ` ${extraClassName}` : ''}`;
  return button;
}

function createIconButton(iconFileName: string): HTMLButtonElement {
  const button = createActionButton('bottom-action-bar__icon-button');
  const icon = document.createElement('img');
  icon.className = 'bottom-action-bar__icon';
  icon.src = getIconPath(iconFileName);
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  return button;
}

function createRootContainer(): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'bottom-action-bar';
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', t('bottomActionBar.ariaLabel'));
  return root;
}

export function createActionBarDom(): ActionBarRefs {
  const root = createRootContainer();

  const toolsGroup = document.createElement('section');
  toolsGroup.className = 'bottom-action-bar__group';

  const toolsButtons = document.createElement('div');
  toolsButtons.className = 'bottom-action-bar__buttons';
  const handButton = createIconButton('hand.png');
  const penButton = createIconButton('pen.png');
  const eraserButton = createIconButton('erase.png');
  const undoButton = createIconButton('reset.png');
  const clearButton = createIconButton('trash.png');
  toolsButtons.appendChild(handButton);
  toolsButtons.appendChild(penButton);
  toolsButtons.appendChild(eraserButton);
  toolsButtons.appendChild(undoButton);
  toolsButtons.appendChild(clearButton);
  toolsGroup.appendChild(toolsButtons);

  const divider = document.createElement('div');
  divider.className = 'bottom-action-bar__divider';
  divider.setAttribute('aria-hidden', 'true');

  const viewGroup = document.createElement('section');
  viewGroup.className = 'bottom-action-bar__group';

  const viewModeControl = document.createElement('div');
  viewModeControl.className = 'bottom-action-bar__view-mode-control';
  const viewModeIcon = document.createElement('img');
  viewModeIcon.className = 'bottom-action-bar__icon';
  viewModeIcon.src = getIconPath('ophthalmology.png');
  viewModeIcon.alt = '';
  viewModeIcon.setAttribute('aria-hidden', 'true');
  viewModeControl.appendChild(viewModeIcon);

  const viewModeSelect = document.createElement('select');
  viewModeSelect.className = 'bottom-action-bar__select';
  const viewModeAllOption = document.createElement('option');
  viewModeAllOption.value = 'all';
  const viewModeFocusUpperOption = document.createElement('option');
  viewModeFocusUpperOption.value = 'focus-upper';
  const viewModeFocusOnlyOption = document.createElement('option');
  viewModeFocusOnlyOption.value = 'focus-only';
  viewModeSelect.appendChild(viewModeAllOption);
  viewModeSelect.appendChild(viewModeFocusUpperOption);
  viewModeSelect.appendChild(viewModeFocusOnlyOption);
  viewModeSelect.value = viewModeAllOption.value;
  viewModeSelect.setAttribute('aria-label', t('bottomActionBar.view.title'));
  viewModeControl.appendChild(viewModeSelect);
  viewGroup.appendChild(viewModeControl);

  root.appendChild(toolsGroup);
  root.appendChild(divider);
  root.appendChild(viewGroup);

  return {
    root,
    handButton,
    penButton,
    eraserButton,
    undoButton,
    clearButton,
    viewModeSelect,
    viewModeAllOption,
    viewModeFocusUpperOption,
    viewModeFocusOnlyOption,
  };
}
