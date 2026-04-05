import { subscribeLanguageChange, t } from '../i18n';
import {
  ACTION_BAR_DEFAULT_ORIENTATION,
  ACTION_BAR_SCALE,
  normalizeActionBarScale,
  type ActionBarOrientation,
} from '../utils/actionbar-state';
import { createActionBarDom } from './actionbar-dom';
import { ActionBarDragController } from './actionbar-drag';
import { ActionBarMenuController } from './actionbar-menu';
import type { ActionTool, ActionBarRefs } from './actionbar-types';
import './actionbar.css';

export type { ActionTool } from './actionbar-types';
export type { ActionBarOrientation } from '../utils/actionbar-state';

export interface ActionBarState {
  orientation: ActionBarOrientation;
  scale: number;
  position: { x: number; y: number } | null;
}

interface ActionBarOptions {
  initialOrientation?: ActionBarOrientation;
  initialScale?: number;
  initialPosition?: { x: number; y: number } | null;
}

export class ActionBar {
  private readonly refs: ActionBarRefs;
  private readonly dragController: ActionBarDragController;
  private readonly menuController: ActionBarMenuController;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private activeTool: ActionTool = 'hand';
  private orientation: ActionBarOrientation = ACTION_BAR_DEFAULT_ORIENTATION;
  private scale: number = ACTION_BAR_SCALE.DEFAULT;
  private visible: boolean = true;
  private toolChangeHandler: ((tool: ActionTool) => void) | null = null;
  private undoHandler: (() => void) | null = null;
  private clearHandler: (() => void) | null = null;
  private requestHideHandler: (() => void) | null = null;
  private stateChangeHandler: ((state: ActionBarState) => void) | null = null;

  constructor(options: ActionBarOptions = {}) {
    this.refs = createActionBarDom();
    this.orientation = options.initialOrientation ?? ACTION_BAR_DEFAULT_ORIENTATION;
    this.scale = normalizeActionBarScale(options.initialScale ?? ACTION_BAR_SCALE.DEFAULT);
    this.dragController = new ActionBarDragController(this.refs.root, {
      onPositionChange: () => this.emitStateChange(),
    });
    this.menuController = new ActionBarMenuController({
      refs: {
        menuButton: this.refs.menuButton,
        menuPanel: this.refs.menuPanel,
      },
      getOrientation: () => this.orientation,
    });
    this.bindEvents();
    this.syncToolButtons();
    this.syncOrientation();
    this.syncScale();
    document.body.appendChild(this.refs.root);
    this.dragController.setCustomPosition(options.initialPosition ?? null);
    this.applyTranslations();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
  }

  public destroy(): void {
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }
    this.menuController.destroy();
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

  public onRequestHide(handler: () => void): void {
    this.requestHideHandler = handler;
  }

  public onStateChange(handler: (state: ActionBarState) => void): void {
    this.stateChangeHandler = handler;
  }

  public getState(): ActionBarState {
    return {
      orientation: this.orientation,
      scale: this.scale,
      position: this.dragController.getCustomPosition(),
    };
  }

  public setActiveTool(tool: ActionTool): void {
    this.activeTool = tool;
    this.syncToolButtons();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      this.menuController.close();
    }
    this.refs.root.hidden = !visible;
    this.refs.root.classList.toggle('is-hidden', !visible);
    this.refs.root.style.display = visible ? 'inline-flex' : 'none';
  }

  public isVisible(): boolean {
    return this.visible;
  }

  private bindEvents(): void {
    this.refs.handButton.addEventListener('click', () => this.handleToolClick('hand'));
    this.refs.penButton.addEventListener('click', () => this.handleToolClick('pen'));
    this.refs.eraserButton.addEventListener('click', () => this.handleToolClick('eraser'));
    this.refs.undoButton.addEventListener('click', () => this.undoHandler?.());
    this.refs.clearButton.addEventListener('click', () => this.clearHandler?.());
    this.refs.closeActionBarButton.addEventListener('click', () => {
      if (this.requestHideHandler) {
        this.requestHideHandler();
        return;
      }
      this.setVisible(false);
    });
    this.refs.rotateOrientationButton.addEventListener('click', () => this.toggleOrientation());
    this.refs.decreaseSizeButton.addEventListener('click', () => {
      this.setScale(this.scale - ACTION_BAR_SCALE.STEP);
    });
    this.refs.increaseSizeButton.addEventListener('click', () => {
      this.setScale(this.scale + ACTION_BAR_SCALE.STEP);
    });
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

  private toggleOrientation(): void {
    const previousRect = this.refs.root.getBoundingClientRect();
    this.orientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    this.syncOrientation();
    this.dragController.repositionAfterLayoutChange(previousRect);
    this.dragController.constrainToViewport();
    this.menuController.refreshPlacement();
    this.emitStateChange();
  }

  private syncOrientation(): void {
    this.refs.root.classList.toggle('is-vertical', this.orientation === 'vertical');
  }

  private setScale(nextScale: number): void {
    const normalized = normalizeActionBarScale(nextScale);
    if (normalized === this.scale) {
      return;
    }
    this.scale = normalized;
    this.syncScale();
    this.dragController.constrainToViewport();
    this.menuController.refreshPlacement();
    this.emitStateChange();
  }

  private syncScale(): void {
    this.refs.root.style.setProperty('--action-bar-scale', String(this.scale));
    this.refs.decreaseSizeButton.disabled = this.scale <= ACTION_BAR_SCALE.MIN;
    this.refs.increaseSizeButton.disabled = this.scale >= ACTION_BAR_SCALE.MAX;
  }

  private emitStateChange(): void {
    this.stateChangeHandler?.(this.getState());
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
    this.refs.menuButton.setAttribute('aria-label', t('bottomActionBar.menu.open'));
    this.refs.menuButton.setAttribute('title', t('bottomActionBar.menu.open'));
    this.refs.closeActionBarButton.setAttribute('aria-label', t('bottomActionBar.menu.hide'));
    this.refs.closeActionBarButton.setAttribute('title', t('bottomActionBar.menu.hide'));
    this.refs.rotateOrientationButton.setAttribute('aria-label', t('bottomActionBar.menu.rotate'));
    this.refs.rotateOrientationButton.setAttribute('title', t('bottomActionBar.menu.rotate'));
    this.refs.decreaseSizeButton.setAttribute(
      'aria-label',
      t('bottomActionBar.menu.scale.decrease')
    );
    this.refs.decreaseSizeButton.setAttribute('title', t('bottomActionBar.menu.scale.decrease'));
    this.refs.increaseSizeButton.setAttribute(
      'aria-label',
      t('bottomActionBar.menu.scale.increase')
    );
    this.refs.increaseSizeButton.setAttribute('title', t('bottomActionBar.menu.scale.increase'));
    this.refs.viewModeSelect.setAttribute('aria-label', t('bottomActionBar.view.title'));
    this.refs.viewModeAllOption.textContent = t('bottomActionBar.view.mode.all');
    this.refs.viewModeFocusUpperOption.textContent = t('bottomActionBar.view.mode.focusUpper');
    this.refs.viewModeFocusOnlyOption.textContent = t('bottomActionBar.view.mode.focusOnly');
  }
}
