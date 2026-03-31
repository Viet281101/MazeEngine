import {
  getIconPath,
  getKeyMouseIconPath,
  type KeyMouseIconName,
} from '../../../constants/assets';
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
  keyVisuals: ShortcutKeyVisual[];
  descriptionKey: ShortcutDescriptionKey;
}

interface ShortcutKeyVisual {
  icon: KeyMouseIconName;
  alt: string;
}

export interface TutorialPopupDomRefs {
  shortcutAccordion: HTMLDetailsElement;
  shortcutDescriptions: HTMLSpanElement[];
  sourceIconButton: HTMLButtonElement;
  sourceIcon: HTMLImageElement;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    group: 'preview',
    keyVisuals: [{ icon: 'p', alt: 'P key' }],
    descriptionKey: 'tutorial.shortcut.togglePreview',
  },
  {
    group: 'preview',
    keyVisuals: [
      { icon: 'arrowUp', alt: 'Arrow Up key' },
      { icon: 'pageUp', alt: 'Page Up key' },
    ],
    descriptionKey: 'tutorial.shortcut.previewNextLayer',
  },
  {
    group: 'preview',
    keyVisuals: [
      { icon: 'arrowDown', alt: 'Arrow Down key' },
      { icon: 'pageDown', alt: 'Page Down key' },
    ],
    descriptionKey: 'tutorial.shortcut.previewPreviousLayer',
  },
  {
    group: 'preview',
    keyVisuals: [{ icon: 'home', alt: 'Home key' }],
    descriptionKey: 'tutorial.shortcut.previewFirstLayer',
  },
  {
    group: 'preview',
    keyVisuals: [{ icon: 'end', alt: 'End key' }],
    descriptionKey: 'tutorial.shortcut.previewLastLayer',
  },
  {
    group: 'preview',
    keyVisuals: [{ icon: 'scroll', alt: 'Mouse wheel' }],
    descriptionKey: 'tutorial.shortcut.previewLayerWheel',
  },
  {
    group: 'datGui',
    keyVisuals: [{ icon: 'h', alt: 'H key' }],
    descriptionKey: 'tutorial.shortcut.datGuiToggle',
  },
  {
    group: 'camera3d',
    keyVisuals: [{ icon: 'leftClick', alt: 'Left click' }],
    descriptionKey: 'tutorial.shortcut.cameraRotate',
  },
  {
    group: 'camera3d',
    keyVisuals: [{ icon: 'scroll', alt: 'Mouse wheel' }],
    descriptionKey: 'tutorial.shortcut.cameraZoom',
  },
  {
    group: 'camera3d',
    keyVisuals: [{ icon: 'rightClick', alt: 'Right click' }],
    descriptionKey: 'tutorial.shortcut.cameraPan',
  },
  {
    group: 'camera3d',
    keyVisuals: [
      { icon: 'ctrl', alt: 'Ctrl key' },
      { icon: 'shift', alt: 'Shift key' },
      { icon: 'leftClick', alt: 'Left click' },
    ],
    descriptionKey: 'tutorial.shortcut.cameraPanModifier',
  },
  {
    group: 'accountModal',
    keyVisuals: [{ icon: 'esc', alt: 'Escape key' }],
    descriptionKey: 'tutorial.shortcut.accountModalClose',
  },
  {
    group: 'settingsTooltip',
    keyVisuals: [{ icon: 'esc', alt: 'Escape key' }],
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
    const keyVisuals = document.createElement('span');
    keyVisuals.className = 'tutorial-popup__shortcut-key-icons';
    shortcut.keyVisuals.forEach((visual, visualIndex) => {
      if (visualIndex > 0) {
        const sep = document.createElement('span');
        sep.className = 'tutorial-popup__shortcut-key-separator';
        sep.textContent = '/';
        keyVisuals.appendChild(sep);
      }

      const baseSrc = getKeyMouseIconPath(visual.icon, 'base');
      const pressedSrc = getKeyMouseIconPath(visual.icon, 'pressed');
      if (!baseSrc) {
        return;
      }

      if (pressedSrc) {
        const frame = document.createElement('span');
        frame.className = 'tutorial-popup__shortcut-key-icon-frame tutorial-popup__shortcut-key-icon-frame--animatable';

        const baseIcon = document.createElement('img');
        baseIcon.className = 'tutorial-popup__shortcut-key-icon tutorial-popup__shortcut-key-icon--base';
        baseIcon.src = baseSrc;
        baseIcon.alt = visual.alt;
        baseIcon.setAttribute('loading', 'lazy');

        const pressedIcon = document.createElement('img');
        pressedIcon.className =
          'tutorial-popup__shortcut-key-icon tutorial-popup__shortcut-key-icon--pressed';
        pressedIcon.src = pressedSrc;
        pressedIcon.alt = '';
        pressedIcon.setAttribute('aria-hidden', 'true');
        pressedIcon.setAttribute('loading', 'lazy');

        frame.appendChild(baseIcon);
        frame.appendChild(pressedIcon);
        keyVisuals.appendChild(frame);
        return;
      }

      const icon = document.createElement('img');
      icon.className = 'tutorial-popup__shortcut-key-icon';
      icon.src = baseSrc;
      icon.alt = visual.alt;
      icon.setAttribute('loading', 'lazy');
      keyVisuals.appendChild(icon);
    });
    key.appendChild(keyVisuals);
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
