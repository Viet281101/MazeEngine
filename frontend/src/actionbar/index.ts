import { subscribeLanguageChange, t } from '../i18n';
import { createActionBarDom } from './actionbar-dom';
import { ActionBarDragController } from './actionbar-drag';
import type { ActionTool, ActionBarRefs } from './actionbar-types';
import './actionbar.css';

export type { ActionTool } from './actionbar-types';

export class ActionBar {
  private readonly refs: ActionBarRefs;
  private readonly dragController: ActionBarDragController;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private activeTool: ActionTool = 'hand';
  private toolChangeHandler: ((tool: ActionTool) => void) | null = null;
  private undoHandler: (() => void) | null = null;
  private clearHandler: (() => void) | null = null;

  constructor() {
    this.refs = createActionBarDom();
    this.dragController = new ActionBarDragController(this.refs.root);
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
    this.dragController.destroy();
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
