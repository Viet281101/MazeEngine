import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange, t } from '../../../i18n';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, removePopupDefaultCanvas, setupAnimatedDetails } from '../utils';
import { createTutorialPopupDom, type TutorialPopupDomRefs } from './tutorial-dom';
import './tutorial.css';

export function showTutorialPopup(toolbar: Toolbar): void {
  try {
    new TutorialPopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize tutorial popup:', error);
  }
}

class TutorialPopup {
  private readonly popupContainer: HTMLElement;
  private readonly refs: TutorialPopupDomRefs;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private readonly disposers: Array<() => void> = [];

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('tutorialPopup', 'popup.tutorial');
    this.popupContainer.classList.add('tutorial-popup');
    removePopupDefaultCanvas(this.popupContainer);
    this.refs = createTutorialPopupDom(this.popupContainer);
    this.bindEvents();
    this.disposers.push(setupAnimatedDetails(this.refs.shortcutAccordion));
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
    this.applyTranslations();
  }

  private bindEvents(): void {
    this.refs.sourceIconButton.addEventListener('click', () => {
      window.open('https://github.com/Viet281101/MazeEngine', '_blank', 'noopener,noreferrer');
    });
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);
    this.applyShortcutDescriptionHighlight();

    const sourceCodeText = t('tutorial.viewSourceCode');
    this.refs.sourceIconButton.title = sourceCodeText;
    this.refs.sourceIcon.setAttribute('alt', sourceCodeText);
  }

  private applyShortcutDescriptionHighlight(): void {
    this.refs.shortcutDescriptions.forEach(description => {
      const rawText = description.textContent?.trim() ?? '';
      const match = rawText.match(/^(\[[^\]]+\])\s*(.*)$/);
      if (!match) {
        return;
      }

      const tag = document.createElement('span');
      tag.className = 'tutorial-popup__shortcut-tag';
      tag.textContent = match[1];

      const text = document.createElement('span');
      text.textContent = match[2] ? ` ${match[2]}` : '';

      description.replaceChildren(tag, text);
    });
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      this.disposers.splice(0).forEach(dispose => dispose());
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
    });
  }
}
