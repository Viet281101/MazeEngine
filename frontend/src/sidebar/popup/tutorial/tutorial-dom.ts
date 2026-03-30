import { getIconPath } from '../../../constants/assets';
import { setI18nText } from '../utils';

type ShortcutDescriptionKey =
  | 'tutorial.shortcut.togglePreview'
  | 'tutorial.shortcut.previewNextLayer'
  | 'tutorial.shortcut.previewPreviousLayer'
  | 'tutorial.shortcut.previewFirstLayer'
  | 'tutorial.shortcut.previewLastLayer'
  | 'tutorial.shortcut.previewLayerWheel'
  | 'tutorial.shortcut.datGuiToggle'
  | 'tutorial.shortcut.cameraRotate'
  | 'tutorial.shortcut.cameraZoom'
  | 'tutorial.shortcut.cameraPan'
  | 'tutorial.shortcut.cameraPanModifier'
  | 'tutorial.shortcut.accountModalClose'
  | 'tutorial.shortcut.settingsTooltipClose';

type ShortcutGroup = 'preview' | 'datGui' | 'camera3d' | 'accountModal' | 'settingsTooltip';

interface ShortcutItem {
  group: ShortcutGroup;
  keyLabel: string;
  descriptionKey: ShortcutDescriptionKey;
}

export interface TutorialPopupDomRefs {
  shortcutAccordion: HTMLDetailsElement;
  shortcutDescriptions: HTMLSpanElement[];
  sourceIconButton: HTMLButtonElement;
  sourceIcon: HTMLImageElement;
}

const SHORTCUTS: ShortcutItem[] = [
  { group: 'preview', keyLabel: 'P', descriptionKey: 'tutorial.shortcut.togglePreview' },
  {
    group: 'preview',
    keyLabel: 'ArrowUp / PageUp',
    descriptionKey: 'tutorial.shortcut.previewNextLayer',
  },
  {
    group: 'preview',
    keyLabel: 'ArrowDown / PageDown',
    descriptionKey: 'tutorial.shortcut.previewPreviousLayer',
  },
  { group: 'preview', keyLabel: 'Home', descriptionKey: 'tutorial.shortcut.previewFirstLayer' },
  { group: 'preview', keyLabel: 'End', descriptionKey: 'tutorial.shortcut.previewLastLayer' },
  {
    group: 'preview',
    keyLabel: 'Wheel (Preview canvas)',
    descriptionKey: 'tutorial.shortcut.previewLayerWheel',
  },
  { group: 'datGui', keyLabel: 'H', descriptionKey: 'tutorial.shortcut.datGuiToggle' },
  { group: 'camera3d', keyLabel: 'LMB Drag', descriptionKey: 'tutorial.shortcut.cameraRotate' },
  {
    group: 'camera3d',
    keyLabel: 'Wheel / MMB Drag',
    descriptionKey: 'tutorial.shortcut.cameraZoom',
  },
  { group: 'camera3d', keyLabel: 'RMB Drag', descriptionKey: 'tutorial.shortcut.cameraPan' },
  {
    group: 'camera3d',
    keyLabel: 'Ctrl/Meta/Shift + LMB Drag',
    descriptionKey: 'tutorial.shortcut.cameraPanModifier',
  },
  { group: 'accountModal', keyLabel: 'Esc', descriptionKey: 'tutorial.shortcut.accountModalClose' },
  {
    group: 'settingsTooltip',
    keyLabel: 'Esc',
    descriptionKey: 'tutorial.shortcut.settingsTooltipClose',
  },
];

export function createTutorialPopupDom(popupContainer: HTMLElement): TutorialPopupDomRefs {
  const content = document.createElement('div');
  content.className = 'tutorial-popup__content';

  const shortcutAccordion = document.createElement('details');
  shortcutAccordion.className = 'tutorial-popup__accordion';
  shortcutAccordion.open = false;

  const shortcutSummary = document.createElement('summary');
  shortcutSummary.className = 'tutorial-popup__summary';
  const shortcutTitle = document.createElement('span');
  shortcutTitle.className = 'tutorial-popup__summary-title';
  setI18nText(shortcutTitle, 'tutorial.shortcutKeyTitle');
  shortcutSummary.appendChild(shortcutTitle);
  shortcutAccordion.appendChild(shortcutSummary);

  const shortcutPanel = document.createElement('div');
  shortcutPanel.className = 'tutorial-popup__accordion-panel popup-accordion__panel';

  const shortcutBody = document.createElement('div');
  shortcutBody.className = 'tutorial-popup__accordion-body';

  const shortcutList = document.createElement('ul');
  shortcutList.className = 'tutorial-popup__shortcut-list';
  const shortcutDescriptions: HTMLSpanElement[] = [];

  SHORTCUTS.forEach((shortcut, index) => {
    if (index > 0 && SHORTCUTS[index - 1].group !== shortcut.group) {
      const divider = document.createElement('li');
      divider.className = 'tutorial-popup__shortcut-divider';
      divider.setAttribute('aria-hidden', 'true');
      shortcutList.appendChild(divider);
    }

    const item = document.createElement('li');
    item.className = 'tutorial-popup__shortcut-item';

    const key = document.createElement('code');
    key.className = 'tutorial-popup__shortcut-key';
    key.textContent = shortcut.keyLabel;
    item.appendChild(key);

    const description = document.createElement('span');
    description.className = 'tutorial-popup__shortcut-description';
    setI18nText(description, shortcut.descriptionKey);
    item.appendChild(description);
    shortcutDescriptions.push(description);

    shortcutList.appendChild(item);
  });

  const shortcutHint = document.createElement('p');
  shortcutHint.className = 'tutorial-popup__shortcut-hint';
  setI18nText(shortcutHint, 'tutorial.shortcut.previewFocusHint');

  shortcutBody.appendChild(shortcutList);
  shortcutBody.appendChild(shortcutHint);
  shortcutPanel.appendChild(shortcutBody);
  shortcutAccordion.appendChild(shortcutPanel);
  content.appendChild(shortcutAccordion);

  const sourceRow = document.createElement('div');
  sourceRow.className = 'tutorial-popup__row';

  const sourceLabel = document.createElement('span');
  sourceLabel.className = 'tutorial-popup__label';
  setI18nText(sourceLabel, 'tutorial.viewSourceCode');
  sourceRow.appendChild(sourceLabel);

  const sourceIconButton = document.createElement('button');
  sourceIconButton.type = 'button';
  sourceIconButton.className = 'tutorial-popup__icon-button';

  const sourceIcon = document.createElement('img');
  sourceIcon.className = 'tutorial-popup__icon';
  sourceIcon.src = getIconPath('github.png');
  sourceIcon.alt = '';
  sourceIconButton.appendChild(sourceIcon);

  sourceRow.appendChild(sourceIconButton);
  content.appendChild(sourceRow);
  popupContainer.appendChild(content);

  return {
    shortcutAccordion,
    shortcutDescriptions,
    sourceIconButton,
    sourceIcon,
  };
}

