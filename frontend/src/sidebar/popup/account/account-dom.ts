import { getIconPath } from '../../../constants/assets';
import type { TranslationKey } from '../../../i18n';
import {
  createI18nButton,
  removePopupDefaultCanvas,
  setI18nAriaLabel,
  setI18nText,
  setI18nTitle,
} from '../utils';

export interface AccountPopupDomRefs {
  authSection: HTMLDetailsElement;
  signOutRow: HTMLElement;
  storageSection: HTMLDetailsElement;
  librarySection: HTMLDetailsElement;
  emailInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  passwordToggleBtn: HTMLButtonElement;
  passwordToggleIcon: HTMLImageElement;
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
  manageModalBackdrop: HTMLDivElement;
  manageModalTitle: HTMLHeadingElement;
  manageVisibilitySelect: HTMLSelectElement;
  manageCopyBtn: HTMLButtonElement;
  manageDeleteBtn: HTMLButtonElement;
  manageCloseBtn: HTMLButtonElement;
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

function createPasswordField(
  parent: HTMLElement
): { input: HTMLInputElement; toggleBtn: HTMLButtonElement; toggleIcon: HTMLImageElement } {
  const field = document.createElement('label');
  field.className = 'account-popup__field';

  const label = document.createElement('span');
  label.className = 'account-popup__label';
  setI18nText(label, 'account.password');

  const inputWrap = document.createElement('div');
  inputWrap.className = 'account-popup__password-wrap';

  const input = document.createElement('input');
  input.className = 'account-popup__input account-popup__password-input';
  input.type = 'password';
  input.placeholder = 'Your password';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'account-popup__password-toggle';
  setI18nTitle(toggleBtn, 'account.showPassword');
  setI18nAriaLabel(toggleBtn, 'account.showPassword');

  const toggleIcon = document.createElement('img');
  toggleIcon.className = 'account-popup__password-toggle-icon';
  toggleIcon.src = getIconPath('invisible.png');
  toggleIcon.alt = '';
  toggleIcon.setAttribute('aria-hidden', 'true');

  toggleBtn.appendChild(toggleIcon);
  inputWrap.appendChild(input);
  inputWrap.appendChild(toggleBtn);
  field.appendChild(label);
  field.appendChild(inputWrap);
  parent.appendChild(field);

  return { input, toggleBtn, toggleIcon };
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
  const passwordField = createPasswordField(authSectionBody);
  const passwordInput = passwordField.input;
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

  const manageModalBackdrop = document.createElement('div');
  manageModalBackdrop.className = 'account-popup__modal-backdrop';
  manageModalBackdrop.hidden = true;

  const manageModal = document.createElement('div');
  manageModal.className = 'account-popup__modal';
  manageModal.setAttribute('role', 'dialog');
  manageModal.setAttribute('aria-modal', 'true');

  const manageHeader = document.createElement('div');
  manageHeader.className = 'account-popup__modal-header';
  const manageModalTitle = document.createElement('h4');
  manageModalTitle.className = 'account-popup__modal-title';
  setI18nText(manageModalTitle, 'account.manageMaze');
  const manageCloseBtn = document.createElement('button');
  manageCloseBtn.type = 'button';
  manageCloseBtn.className = 'account-popup__modal-close-icon';
  setI18nTitle(manageCloseBtn, 'toolbar.close');
  setI18nAriaLabel(manageCloseBtn, 'toolbar.close');
  const manageCloseIcon = document.createElement('img');
  manageCloseIcon.className = 'account-popup__btn-icon';
  manageCloseIcon.src = getIconPath('close.png');
  manageCloseIcon.alt = '';
  manageCloseIcon.setAttribute('aria-hidden', 'true');
  manageCloseBtn.appendChild(manageCloseIcon);
  manageHeader.appendChild(manageModalTitle);
  manageHeader.appendChild(manageCloseBtn);
  manageModal.appendChild(manageHeader);

  const manageHint = document.createElement('p');
  manageHint.className = 'account-popup__section-hint';
  setI18nText(manageHint, 'account.manageHint');
  manageModal.appendChild(manageHint);

  const visibilityField = document.createElement('label');
  visibilityField.className = 'account-popup__field';
  const visibilityLabel = document.createElement('span');
  visibilityLabel.className = 'account-popup__label';
  setI18nText(visibilityLabel, 'account.visibility');
  const manageVisibilitySelect = document.createElement('select');
  manageVisibilitySelect.className = 'account-popup__select account-popup__modal-visibility';
  visibilityField.appendChild(visibilityLabel);
  visibilityField.appendChild(manageVisibilitySelect);
  manageModal.appendChild(visibilityField);

  const manageActions = document.createElement('div');
  manageActions.className = 'account-popup__modal-actions';

  const manageCopyBtn = document.createElement('button');
  manageCopyBtn.type = 'button';
  manageCopyBtn.className = 'account-popup__btn';
  const manageCopyIcon = document.createElement('img');
  manageCopyIcon.className = 'account-popup__btn-icon';
  manageCopyIcon.src = getIconPath('shared_link.png');
  manageCopyIcon.alt = '';
  manageCopyIcon.setAttribute('aria-hidden', 'true');
  const manageCopyLabel = document.createElement('span');
  setI18nText(manageCopyLabel, 'account.copyShareLink');
  manageCopyBtn.appendChild(manageCopyIcon);
  manageCopyBtn.appendChild(manageCopyLabel);

  const manageDeleteBtn = document.createElement('button');
  manageDeleteBtn.type = 'button';
  manageDeleteBtn.className = 'account-popup__btn account-popup__btn--danger';
  const manageDeleteIcon = document.createElement('img');
  manageDeleteIcon.className = 'account-popup__btn-icon';
  manageDeleteIcon.src = getIconPath('trash.png');
  manageDeleteIcon.alt = '';
  manageDeleteIcon.setAttribute('aria-hidden', 'true');
  const manageDeleteLabel = document.createElement('span');
  setI18nText(manageDeleteLabel, 'account.deleteMaze');
  manageDeleteBtn.appendChild(manageDeleteIcon);
  manageDeleteBtn.appendChild(manageDeleteLabel);

  manageActions.appendChild(manageCopyBtn);
  manageActions.appendChild(manageDeleteBtn);
  manageModal.appendChild(manageActions);
  manageModalBackdrop.appendChild(manageModal);
  popupContainer.appendChild(manageModalBackdrop);

  popupContainer.appendChild(content);

  return {
    authSection: authSection.section,
    signOutRow,
    storageSection: storageSection.section,
    librarySection: librarySection.section,
    emailInput,
    passwordInput,
    passwordToggleBtn: passwordField.toggleBtn,
    passwordToggleIcon: passwordField.toggleIcon,
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
    manageModalBackdrop,
    manageModalTitle,
    manageVisibilitySelect,
    manageCopyBtn,
    manageDeleteBtn,
    manageCloseBtn,
  };
}
