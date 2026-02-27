import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange, t, type TranslationKey } from '../../i18n';
import './tutorial.css';

export function showTutorialPopup(toolbar: Toolbar) {
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
    this.hideDefaultCanvas();
    this.buildContent();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
  }

  private hideDefaultCanvas() {
    const canvas = this.popupContainer.querySelector('canvas');
    if (canvas) {
      canvas.remove();
    }
  }

  private buildContent() {
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
      window.open('https://github.com/Viet281101/MazeSolver3D', '_blank', 'noopener,noreferrer');
    });

    const icon = document.createElement('img');
    icon.className = 'tutorial-popup__icon';
    icon.src = '/MazeSolver3D/icon/github.png';
    icon.alt = t('tutorial.viewSourceCode');
    iconButton.appendChild(icon);

    sourceRow.appendChild(iconButton);
    content.appendChild(sourceRow);
    this.popupContainer.appendChild(content);
    this.applyTranslations();
  }

  private applyTranslations() {
    const i18nElements = this.popupContainer.querySelectorAll<HTMLElement>('[data-i18n-key]');
    i18nElements.forEach(element => {
      const key = element.getAttribute('data-i18n-key');
      if (key) {
        element.textContent = t(key as TranslationKey);
      }
    });

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

  private watchContainerRemoval() {
    const observer = new MutationObserver(() => {
      if (!document.body.contains(this.popupContainer)) {
        if (this.unsubscribeLanguageChange) {
          this.unsubscribeLanguageChange();
          this.unsubscribeLanguageChange = null;
        }
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function setI18nText(element: HTMLElement, key: TranslationKey) {
  element.setAttribute('data-i18n-key', key);
  element.textContent = t(key);
}
