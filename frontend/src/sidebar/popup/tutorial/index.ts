import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange, t } from '../../../i18n';
import { getIconPath } from '../../../constants/assets';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, removePopupDefaultCanvas, setI18nText } from '../utils';
import './tutorial.css';

export function showTutorialPopup(toolbar: Toolbar): void {
  try {
    new TutorialPopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize tutorial popup:', error);
  }
}

class TutorialPopup {
  private popupContainer: HTMLElement;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('tutorialPopup', 'popup.tutorial');
    this.popupContainer.classList.add('tutorial-popup');
    removePopupDefaultCanvas(this.popupContainer);
    this.buildContent();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
  }

  private buildContent(): void {
    const content = document.createElement('div');
    content.className = 'tutorial-popup__content';

    const sourceRow = document.createElement('div');
    sourceRow.className = 'tutorial-popup__row';

    const label = document.createElement('span');
    label.className = 'tutorial-popup__label';
    setI18nText(label, 'tutorial.viewSourceCode');
    sourceRow.appendChild(label);

    const iconButton = document.createElement('button');
    iconButton.type = 'button';
    iconButton.className = 'tutorial-popup__icon-button';
    iconButton.title = t('tutorial.viewSourceCode');
    iconButton.addEventListener('click', () => {
      window.open('https://github.com/Viet281101/MazeEngine', '_blank', 'noopener,noreferrer');
    });

    const icon = document.createElement('img');
    icon.className = 'tutorial-popup__icon';
    icon.src = getIconPath('github.png');
    icon.alt = t('tutorial.viewSourceCode');
    iconButton.appendChild(icon);

    sourceRow.appendChild(iconButton);
    content.appendChild(sourceRow);
    this.popupContainer.appendChild(content);
    this.applyTranslations();
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);

    const iconButton = this.popupContainer.querySelector<HTMLButtonElement>(
      '.tutorial-popup__icon-button'
    );
    const icon = this.popupContainer.querySelector<HTMLImageElement>('.tutorial-popup__icon');
    const sourceCodeText = t('tutorial.viewSourceCode');
    if (iconButton) {
      iconButton.title = sourceCodeText;
    }
    if (icon) {
      icon.alt = sourceCodeText;
    }
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
    });
  }
}
