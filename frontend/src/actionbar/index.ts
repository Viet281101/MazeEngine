import { subscribeLanguageChange, t } from '../i18n';
import { getIconPath } from '../constants/assets';
import './actionbar.css';

export type ActionTool = 'hand' | 'pen' | 'eraser';

interface ActionBarRefs {
  root: HTMLDivElement;
  handButton: HTMLButtonElement;
  penButton: HTMLButtonElement;
  eraserButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  viewModeSelect: HTMLSelectElement;
  viewModeAllOption: HTMLOptionElement;
  viewModeFocusUpperOption: HTMLOptionElement;
  viewModeFocusOnlyOption: HTMLOptionElement;
}

function createActionButton(extraClassName?: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `bottom-action-bar__button${extraClassName ? ` ${extraClassName}` : ''}`;
  return button;
}

function createIconButton(iconFileName: string): HTMLButtonElement {
  const button = createActionButton('bottom-action-bar__icon-button');
  const icon = document.createElement('img');
  icon.className = 'bottom-action-bar__icon';
  icon.src = getIconPath(iconFileName);
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  return button;
}

function createRootContainer(): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'bottom-action-bar';
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', t('bottomActionBar.ariaLabel'));
  return root;
}

function createActionBarDom(): ActionBarRefs {
  const root = createRootContainer();

  const toolsGroup = document.createElement('section');
  toolsGroup.className = 'bottom-action-bar__group';

  const toolsButtons = document.createElement('div');
  toolsButtons.className = 'bottom-action-bar__buttons';
  const handButton = createIconButton('hand.png');
  const penButton = createIconButton('pen.png');
  const eraserButton = createIconButton('erase.png');
  const undoButton = createIconButton('reset.png');
  const clearButton = createIconButton('trash.png');
  toolsButtons.appendChild(handButton);
  toolsButtons.appendChild(penButton);
  toolsButtons.appendChild(eraserButton);
  toolsButtons.appendChild(undoButton);
  toolsButtons.appendChild(clearButton);
  toolsGroup.appendChild(toolsButtons);

  const divider = document.createElement('div');
  divider.className = 'bottom-action-bar__divider';
  divider.setAttribute('aria-hidden', 'true');

  const viewGroup = document.createElement('section');
  viewGroup.className = 'bottom-action-bar__group';

  const viewModeSelect = document.createElement('select');
  viewModeSelect.className = 'bottom-action-bar__select';
  const viewModeAllOption = document.createElement('option');
  viewModeAllOption.value = 'all';
  const viewModeFocusUpperOption = document.createElement('option');
  viewModeFocusUpperOption.value = 'focus-upper';
  const viewModeFocusOnlyOption = document.createElement('option');
  viewModeFocusOnlyOption.value = 'focus-only';
  viewModeSelect.appendChild(viewModeAllOption);
  viewModeSelect.appendChild(viewModeFocusUpperOption);
  viewModeSelect.appendChild(viewModeFocusOnlyOption);
  viewModeSelect.value = viewModeAllOption.value;
  viewModeSelect.setAttribute('aria-label', t('bottomActionBar.view.title'));
  viewGroup.appendChild(viewModeSelect);

  root.appendChild(toolsGroup);
  root.appendChild(divider);
  root.appendChild(viewGroup);

  return {
    root,
    handButton,
    penButton,
    eraserButton,
    undoButton,
    clearButton,
    viewModeSelect,
    viewModeAllOption,
    viewModeFocusUpperOption,
    viewModeFocusOnlyOption,
  };
}

export class ActionBar {
  private readonly refs: ActionBarRefs;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private activeTool: ActionTool = 'hand';
  private toolChangeHandler: ((tool: ActionTool) => void) | null = null;
  private undoHandler: (() => void) | null = null;
  private clearHandler: (() => void) | null = null;

  constructor() {
    this.refs = createActionBarDom();
    this.bindEvents();
    this.syncToolButtons();
    document.body.appendChild(this.refs.root);
    this.applyTranslations();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
  }

  public destroy(): void {
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }
    this.refs.root.remove();
  }

  public onToolChange(handler: (tool: ActionTool) => void): void {
    this.toolChangeHandler = handler;
  }

  public onUndo(handler: () => void): void {
    this.undoHandler = handler;
  }

  public onClear(handler: () => void): void {
    this.clearHandler = handler;
  }

  public setActiveTool(tool: ActionTool): void {
    this.activeTool = tool;
    this.syncToolButtons();
  }

  private bindEvents(): void {
    this.refs.handButton.addEventListener('click', () => this.handleToolClick('hand'));
    this.refs.penButton.addEventListener('click', () => this.handleToolClick('pen'));
    this.refs.eraserButton.addEventListener('click', () => this.handleToolClick('eraser'));
    this.refs.undoButton.addEventListener('click', () => this.undoHandler?.());
    this.refs.clearButton.addEventListener('click', () => this.clearHandler?.());
  }

  private handleToolClick(tool: ActionTool): void {
    this.setActiveTool(tool);
    this.toolChangeHandler?.(tool);
  }

  private syncToolButtons(): void {
    this.refs.handButton.classList.toggle('is-active', this.activeTool === 'hand');
    this.refs.penButton.classList.toggle('is-active', this.activeTool === 'pen');
    this.refs.eraserButton.classList.toggle('is-active', this.activeTool === 'eraser');
  }

  private applyTranslations(): void {
    this.refs.root.setAttribute('aria-label', t('bottomActionBar.ariaLabel'));
    this.refs.handButton.setAttribute('aria-label', t('bottomActionBar.tools.hand'));
    this.refs.handButton.setAttribute('title', t('bottomActionBar.tools.hand'));
    this.refs.penButton.setAttribute('aria-label', t('bottomActionBar.tools.pen'));
    this.refs.penButton.setAttribute('title', t('bottomActionBar.tools.pen'));
    this.refs.eraserButton.setAttribute('aria-label', t('bottomActionBar.tools.eraser'));
    this.refs.eraserButton.setAttribute('title', t('bottomActionBar.tools.eraser'));
    this.refs.undoButton.setAttribute('aria-label', t('bottomActionBar.tools.undo'));
    this.refs.undoButton.setAttribute('title', t('bottomActionBar.tools.undo'));
    this.refs.clearButton.setAttribute('aria-label', t('bottomActionBar.tools.clear'));
    this.refs.clearButton.setAttribute('title', t('bottomActionBar.tools.clear'));
    this.refs.viewModeSelect.setAttribute('aria-label', t('bottomActionBar.view.title'));
    this.refs.viewModeAllOption.textContent = t('bottomActionBar.view.mode.all');
    this.refs.viewModeFocusUpperOption.textContent = t('bottomActionBar.view.mode.focusUpper');
    this.refs.viewModeFocusOnlyOption.textContent = t('bottomActionBar.view.mode.focusOnly');
  }
}
