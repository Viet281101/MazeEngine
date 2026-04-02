import { subscribeLanguageChange } from '../../../i18n';
import { Toolbar } from '../../toolbar';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, setupAnimatedDetails } from '../utils';
import { createAccountPopupDom } from './account-dom';
import { AccountPopupRuntime } from './account-runtime';
import { accountStore } from './account-store';
import { bindAccountPopupEvents } from './account-events';
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
  private unsubscribeAccountStore: (() => void) | null = null;
  private readonly disposers: Array<() => void> = [];

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('accountPopup', 'popup.account');
    this.popupContainer.classList.add('account-popup');
    const refs = createAccountPopupDom(this.popupContainer);
    this.runtime = new AccountPopupRuntime(refs);

    this.disposers.push(bindAccountPopupEvents(refs, this.runtime));
    this.disposers.push(setupAnimatedDetails(refs.authSection));
    this.disposers.push(setupAnimatedDetails(refs.storageSection));
    this.popupContainer.addEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => {
      applyI18nTexts(this.popupContainer);
      void this.runtime.refreshAll();
    });
    this.unsubscribeAccountStore = accountStore.subscribe(user => {
      void this.runtime.handleAuthStateChanged(user);
    });
    this.watchContainerRemoval();
    void this.runtime.refreshAll();
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      this.popupContainer.removeEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
      if (this.unsubscribeAccountStore) {
        this.unsubscribeAccountStore();
        this.unsubscribeAccountStore = null;
      }
      this.disposers.splice(0).forEach(dispose => dispose());
    });
  }
}
