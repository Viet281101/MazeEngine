import type { ActionBarRefs } from './actionbar-types';
import type { ActionBarOrientation } from '../utils/actionbar-state';

type MenuPlacement = 'top' | 'right' | 'bottom' | 'left';

interface ActionBarMenuControllerOptions {
  refs: Pick<ActionBarRefs, 'menuButton' | 'menuPanel'>;
  getOrientation: () => ActionBarOrientation;
}

export class ActionBarMenuController {
  private readonly refs: Pick<ActionBarRefs, 'menuButton' | 'menuPanel'>;
  private readonly getOrientation: () => ActionBarOrientation;
  private isOpen: boolean = false;
  private readonly menuButtonClickHandler: (event: MouseEvent) => void;
  private readonly documentPointerDownHandler: (event: PointerEvent) => void;
  private readonly documentKeydownHandler: (event: KeyboardEvent) => void;
  private readonly windowResizeHandler: () => void;

  constructor(options: ActionBarMenuControllerOptions) {
    this.refs = options.refs;
    this.getOrientation = options.getOrientation;
    this.menuButtonClickHandler = event => this.handleMenuButtonClick(event);
    this.documentPointerDownHandler = event => this.handleDocumentPointerDown(event);
    this.documentKeydownHandler = event => this.handleDocumentKeydown(event);
    this.windowResizeHandler = () => this.handleWindowResize();
    this.bindEvents();
  }

  public destroy(): void {
    this.refs.menuButton.removeEventListener('click', this.menuButtonClickHandler);
    document.removeEventListener('pointerdown', this.documentPointerDownHandler);
    document.removeEventListener('keydown', this.documentKeydownHandler);
    window.removeEventListener('resize', this.windowResizeHandler);
  }

  public close(): void {
    this.setOpen(false);
  }

  public refreshPlacement(): void {
    if (!this.isOpen) {
      return;
    }
    this.updatePlacement();
  }

  private bindEvents(): void {
    this.refs.menuButton.addEventListener('click', this.menuButtonClickHandler);
    document.addEventListener('pointerdown', this.documentPointerDownHandler);
    document.addEventListener('keydown', this.documentKeydownHandler);
    window.addEventListener('resize', this.windowResizeHandler);
  }

  private handleMenuButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    this.setOpen(!this.isOpen);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    if (open) {
      this.refs.menuPanel.hidden = false;
      this.updatePlacement();
    } else {
      this.refs.menuPanel.hidden = true;
    }
    this.refs.menuButton.classList.toggle('is-active', open);
    this.refs.menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  private updatePlacement(): void {
    const panel = this.refs.menuPanel;
    if (panel.hidden) {
      return;
    }

    panel.style.visibility = 'hidden';
    const panelRect = panel.getBoundingClientRect();
    panel.style.visibility = '';

    const menuGroupRect = this.refs.menuButton.getBoundingClientRect();
    const spacing = 8;
    const requiredHorizontal = panelRect.width + spacing;
    const requiredVertical = panelRect.height + spacing;
    const spaces: Record<MenuPlacement, number> = {
      top: menuGroupRect.top,
      right: window.innerWidth - menuGroupRect.right,
      bottom: window.innerHeight - menuGroupRect.bottom,
      left: menuGroupRect.left,
    };
    const required: Record<MenuPlacement, number> = {
      top: requiredVertical,
      right: requiredHorizontal,
      bottom: requiredVertical,
      left: requiredHorizontal,
    };
    const preferred: MenuPlacement[] =
      this.getOrientation() === 'vertical'
        ? ['right', 'left', 'bottom', 'top']
        : ['top', 'bottom', 'right', 'left'];

    let placement = preferred.find(side => spaces[side] >= required[side]) ?? null;
    if (!placement) {
      placement = (Object.keys(spaces) as MenuPlacement[]).reduce((best, side) =>
        spaces[side] > spaces[best] ? side : best
      );
    }

    panel.dataset.placement = placement;
  }

  private handleDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen) {
      return;
    }
    if (!(event.target instanceof Node)) {
      return;
    }
    if (this.refs.menuPanel.contains(event.target) || this.refs.menuButton.contains(event.target)) {
      return;
    }
    this.setOpen(false);
  }

  private handleDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.setOpen(false);
    }
  }

  private handleWindowResize(): void {
    this.refreshPlacement();
  }
}
