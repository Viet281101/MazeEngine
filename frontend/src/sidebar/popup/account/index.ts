import { subscribeLanguageChange } from '../../../i18n';
import { Toolbar } from '../../toolbar';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts } from '../utils';
import { createAccountPopupDom } from './account-dom';
import type { AccountPopupDomRefs } from './account-dom';
import { AccountPopupRuntime } from './account-runtime';
import './account.css';

const TOOLBAR_POPUP_SHOWN_EVENT = 'toolbar-popup-shown';

export function showAccountPopup(toolbar: Toolbar): void {
  try {
    new AccountPopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize account popup:', error);
  }
}

class AccountPopup {
  private readonly popupContainer: HTMLElement;
  private readonly runtime: AccountPopupRuntime;
  private readonly popupShownHandler = () => {
    void this.runtime.refreshAll();
  };
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('accountPopup', 'popup.account');
    this.popupContainer.classList.add('account-popup');
    const refs = createAccountPopupDom(this.popupContainer);
    this.runtime = new AccountPopupRuntime(refs);

    this.bindEvents(refs);
    this.popupContainer.addEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => {
      applyI18nTexts(this.popupContainer);
      void this.runtime.refreshAll();
    });
    this.watchContainerRemoval();
    void this.runtime.refreshAll();
  }

  private bindEvents(refs: AccountPopupDomRefs): void {
    refs.signUpBtn.addEventListener('click', () => {
      void this.runtime.handleSignUp();
    });
    refs.signInBtn.addEventListener('click', () => {
      void this.runtime.handleSignIn();
    });
    refs.signOutBtn.addEventListener('click', () => {
      void this.runtime.handleSignOut();
    });
    refs.saveBtn.addEventListener('click', () => {
      void this.runtime.handleSaveMaze();
    });
    refs.refreshBtn.addEventListener('click', () => {
      void this.runtime.refreshMazeList();
    });
    refs.loadBtn.addEventListener('click', () => {
      void this.runtime.handleLoadSelectedMaze();
    });
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      this.popupContainer.removeEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
    });
  }
}
