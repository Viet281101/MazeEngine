import type { TranslationKey } from '../../../i18n';
import { createI18nButton, removePopupDefaultCanvas, setI18nText } from '../utils';

export interface AccountPopupDomRefs {
  emailInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  mazeNameInput: HTMLInputElement;
  mazeSelect: HTMLSelectElement;
  statusEl: HTMLParagraphElement;
  signUpBtn: HTMLButtonElement;
  signInBtn: HTMLButtonElement;
  signOutBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;
  refreshBtn: HTMLButtonElement;
  loadBtn: HTMLButtonElement;
}

function createInputField(
  parent: HTMLElement,
  labelKey: TranslationKey,
  type: 'text' | 'email' | 'password',
  placeholder: string
): HTMLInputElement {
  const field = document.createElement('label');
  field.className = 'account-popup__field';

  const label = document.createElement('span');
  label.className = 'account-popup__label';
  setI18nText(label, labelKey);

  const input = document.createElement('input');
  input.className = 'account-popup__input';
  input.type = type;
  input.placeholder = placeholder;

  field.appendChild(label);
  field.appendChild(input);
  parent.appendChild(field);

  return input;
}

function createSection(
  parent: HTMLElement,
  titleKey: TranslationKey,
  hintKey: TranslationKey
): HTMLDivElement {
  const section = document.createElement('section');
  section.className = 'account-popup__section';

  const header = document.createElement('div');
  header.className = 'account-popup__section-header';

  const title = document.createElement('h4');
  title.className = 'account-popup__section-title';
  setI18nText(title, titleKey);

  const hint = document.createElement('p');
  hint.className = 'account-popup__section-hint';
  setI18nText(hint, hintKey);

  header.appendChild(title);
  header.appendChild(hint);
  section.appendChild(header);

  const body = document.createElement('div');
  body.className = 'account-popup__section-body';
  section.appendChild(body);

  parent.appendChild(section);

  return body;
}

export function createAccountPopupDom(popupContainer: HTMLElement): AccountPopupDomRefs {
  removePopupDefaultCanvas(popupContainer);

  const content = document.createElement('div');
  content.className = 'account-popup__content';

  const status = document.createElement('p');
  status.className = 'account-popup__status';
  content.appendChild(status);

  const authSectionBody = createSection(content, 'account.authSection', 'account.authHint');
  const emailInput = createInputField(authSectionBody, 'account.email', 'email', 'you@example.com');
  const passwordInput = createInputField(
    authSectionBody,
    'account.password',
    'password',
    'Your password'
  );
  const authActions = document.createElement('div');
  authActions.className = 'account-popup__actions';
  const signUpBtn = createI18nButton({
    textKey: 'account.signUp',
    className: 'account-popup__btn',
  });
  const signInBtn = createI18nButton({
    textKey: 'account.signIn',
    className: 'account-popup__btn account-popup__btn--primary',
  });
  const signOutBtn = createI18nButton({
    textKey: 'account.signOut',
    className: 'account-popup__btn',
  });
  authActions.appendChild(signUpBtn);
  authActions.appendChild(signInBtn);
  authActions.appendChild(signOutBtn);
  authSectionBody.appendChild(authActions);

  const storageSectionBody = createSection(
    content,
    'account.storageSection',
    'account.storageHint'
  );
  const mazeNameInput = createInputField(storageSectionBody, 'account.mazeName', 'text', 'My Maze');

  const saveActions = document.createElement('div');
  saveActions.className = 'account-popup__actions account-popup__actions--single';
  const saveBtn = createI18nButton({
    textKey: 'account.saveMaze',
    className: 'account-popup__btn account-popup__btn--primary',
  });
  saveActions.appendChild(saveBtn);
  storageSectionBody.appendChild(saveActions);

  const listField = document.createElement('label');
  listField.className = 'account-popup__field';
  const savedMazesLabel = document.createElement('span');
  savedMazesLabel.className = 'account-popup__label';
  setI18nText(savedMazesLabel, 'account.savedMazes');
  const mazeSelect = document.createElement('select');
  mazeSelect.className = 'account-popup__select';
  listField.appendChild(savedMazesLabel);
  listField.appendChild(mazeSelect);
  storageSectionBody.appendChild(listField);

  const loadActions = document.createElement('div');
  loadActions.className = 'account-popup__actions';
  const refreshBtn = createI18nButton({
    textKey: 'account.refreshList',
    className: 'account-popup__btn',
  });
  const loadBtn = createI18nButton({
    textKey: 'account.loadMaze',
    className: 'account-popup__btn account-popup__btn--primary',
  });
  loadActions.appendChild(refreshBtn);
  loadActions.appendChild(loadBtn);
  storageSectionBody.appendChild(loadActions);

  popupContainer.appendChild(content);

  return {
    emailInput,
    passwordInput,
    mazeNameInput,
    mazeSelect,
    statusEl: status,
    signUpBtn,
    signInBtn,
    signOutBtn,
    saveBtn,
    refreshBtn,
    loadBtn,
  };
}
