import type { TranslationKey } from '../../../i18n';
import { getIconPath } from '../../../constants/assets';
import { createI18nButton, removePopupDefaultCanvas, setI18nText } from '../utils';

export interface AccountPopupDomRefs {
  authSection: HTMLDetailsElement;
  signOutRow: HTMLElement;
  storageSection: HTMLDetailsElement;
  librarySection: HTMLDetailsElement;
  emailInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  mazeNameInput: HTMLInputElement;
  mazeSelect: HTMLSelectElement;
  libraryTableBody: HTMLTableSectionElement;
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

function createAccordionSection(
  parent: HTMLElement,
  titleKey: TranslationKey,
  hintKey: TranslationKey
): { section: HTMLDetailsElement; body: HTMLDivElement } {
  const section = document.createElement('details');
  section.className = 'account-popup__accordion';
  section.open = true;

  const summary = document.createElement('summary');
  summary.className = 'account-popup__summary';

  const summaryContent = document.createElement('div');
  summaryContent.className = 'account-popup__summary-content';

  const title = document.createElement('h4');
  title.className = 'account-popup__section-title';
  setI18nText(title, titleKey);
  summaryContent.appendChild(title);
  summary.appendChild(summaryContent);
  section.appendChild(summary);

  const panel = document.createElement('div');
  panel.className = 'account-popup__accordion-panel popup-accordion__panel';

  const body = document.createElement('div');
  body.className = 'account-popup__section-body';

  const hint = document.createElement('p');
  hint.className = 'account-popup__section-hint account-popup__section-hint--panel';
  setI18nText(hint, hintKey);

  body.appendChild(hint);
  panel.appendChild(body);
  section.appendChild(panel);

  parent.appendChild(section);

  return { section, body };
}

function createStaticDropdownSection(
  parent: HTMLElement,
  titleKey: TranslationKey,
  hintKey: TranslationKey
): { section: HTMLDetailsElement; body: HTMLDivElement } {
  const section = document.createElement('details');
  section.className = 'account-popup__static-dropdown';
  section.open = true;

  const header = document.createElement('summary');
  header.className = 'account-popup__summary account-popup__summary--static';

  const summaryContent = document.createElement('div');
  summaryContent.className = 'account-popup__summary-content';

  const title = document.createElement('h4');
  title.className = 'account-popup__section-title';
  setI18nText(title, titleKey);

  summaryContent.appendChild(title);
  header.appendChild(summaryContent);
  section.appendChild(header);

  const body = document.createElement('div');
  body.className = 'account-popup__static-dropdown-body account-popup__section-body';

  const hint = document.createElement('p');
  hint.className = 'account-popup__section-hint account-popup__section-hint--panel';
  setI18nText(hint, hintKey);

  body.appendChild(hint);
  section.appendChild(body);

  parent.appendChild(section);

  return { section, body };
}

export function createAccountPopupDom(popupContainer: HTMLElement): AccountPopupDomRefs {
  removePopupDefaultCanvas(popupContainer);

  const content = document.createElement('div');
  content.className = 'account-popup__content';

  const status = document.createElement('p');
  status.className = 'account-popup__status';
  content.appendChild(status);

  const signOutRow = document.createElement('div');
  signOutRow.className = 'account-popup__top-actions';
  const signOutBtn = document.createElement('button');
  signOutBtn.type = 'button';
  signOutBtn.className = 'account-popup__btn account-popup__btn--ghost';
  const signOutIcon = document.createElement('img');
  signOutIcon.className = 'account-popup__btn-icon';
  signOutIcon.src = getIconPath('sign_out.png');
  signOutIcon.alt = '';
  signOutIcon.setAttribute('aria-hidden', 'true');
  const signOutLabel = document.createElement('span');
  setI18nText(signOutLabel, 'account.signOut');
  signOutBtn.appendChild(signOutIcon);
  signOutBtn.appendChild(signOutLabel);
  signOutRow.appendChild(signOutBtn);
  content.appendChild(signOutRow);

  const authSection = createAccordionSection(content, 'account.authSection', 'account.authHint');
  const authSectionBody = authSection.body;
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
  authActions.appendChild(signUpBtn);
  authActions.appendChild(signInBtn);
  authSectionBody.appendChild(authActions);

  const storageSection = createAccordionSection(
    content,
    'account.storageSection',
    'account.storageHint'
  );
  const storageSectionBody = storageSection.body;
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
  loadActions.className = 'account-popup__actions account-popup__actions--single';
  const loadBtn = createI18nButton({
    textKey: 'account.loadMaze',
    className: 'account-popup__btn account-popup__btn--primary',
  });
  loadActions.appendChild(loadBtn);
  storageSectionBody.appendChild(loadActions);

  const librarySection = createStaticDropdownSection(
    content,
    'account.librarySection',
    'account.libraryHint'
  );
  const librarySectionBody = librarySection.body;

  const libraryActions = document.createElement('div');
  libraryActions.className = 'account-popup__library-actions';
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'account-popup__btn';
  const refreshIcon = document.createElement('img');
  refreshIcon.className = 'account-popup__btn-icon';
  refreshIcon.src = getIconPath('refresh.png');
  refreshIcon.alt = '';
  refreshIcon.setAttribute('aria-hidden', 'true');
  const refreshLabel = document.createElement('span');
  setI18nText(refreshLabel, 'account.refreshList');
  refreshBtn.appendChild(refreshIcon);
  refreshBtn.appendChild(refreshLabel);
  libraryActions.appendChild(refreshBtn);
  librarySectionBody.appendChild(libraryActions);

  const libraryTable = document.createElement('table');
  libraryTable.className = 'account-popup__table';

  const libraryHead = document.createElement('thead');
  const libraryHeadRow = document.createElement('tr');

  const nameHeader = document.createElement('th');
  setI18nText(nameHeader, 'account.savedMazes');
  const timeHeader = document.createElement('th');
  setI18nText(timeHeader, 'account.savedAt');
  const actionsHeader = document.createElement('th');
  setI18nText(actionsHeader, 'account.actions');

  libraryHeadRow.appendChild(nameHeader);
  libraryHeadRow.appendChild(timeHeader);
  libraryHeadRow.appendChild(actionsHeader);
  libraryHead.appendChild(libraryHeadRow);

  const libraryTableBody = document.createElement('tbody');

  libraryTable.appendChild(libraryHead);
  libraryTable.appendChild(libraryTableBody);
  librarySectionBody.appendChild(libraryTable);

  popupContainer.appendChild(content);

  return {
    authSection: authSection.section,
    signOutRow,
    storageSection: storageSection.section,
    librarySection: librarySection.section,
    emailInput,
    passwordInput,
    mazeNameInput,
    mazeSelect,
    libraryTableBody,
    statusEl: status,
    signUpBtn,
    signInBtn,
    signOutBtn,
    saveBtn,
    refreshBtn,
    loadBtn,
  };
}
