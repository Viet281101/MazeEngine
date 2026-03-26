import { showSolvePopup } from './popup/solve';
import { showSettingsPopup } from './popup/setting';
import { showTutorialPopup } from './popup/tutorial';
import { showMazePopup } from './popup/maze';
import { showGeneratePopup } from './popup/generate';
import { showAccountPopup } from './popup/account';
import { subscribeLanguageChange, t, type TranslationKey } from '../i18n';
import { UI_BREAKPOINTS } from '../constants/ui';
import { ToolbarPopupControls } from './popup-controls';
import {
  BUTTON_BORDER_PADDING,
  BUTTON_ICON_OFFSET,
  BUTTON_SIZE,
  BUTTON_SPACING,
  POPUP_CANVAS_HEIGHT,
  POPUP_CANVAS_WIDTH,
  POPUP_LEFT_DESKTOP,
  POPUP_LEFT_MOBILE,
  POPUP_TOP_DESKTOP,
  POPUP_TOP_MOBILE,
  TOOLBAR_HEIGHT_MOBILE,
  TOOLBAR_WIDTH_DESKTOP,
  createToolbarButtons,
  type PopupType,
  type ToolButton,
} from './toolbar-config';
import { isInsideRect } from './pointer-utils';
import './toolbar.css';

const POPUP_SHOW_HANDLERS: Record<PopupType, (toolbar: Toolbar) => void> = {
  maze: toolbar => showMazePopup(toolbar),
  generate: toolbar => showGeneratePopup(toolbar),
  solve: toolbar => showSolvePopup(toolbar),
  account: toolbar => showAccountPopup(toolbar),
  tutorial: toolbar => showTutorialPopup(toolbar),
  settings: toolbar => showSettingsPopup(toolbar),
};
const TOOLBAR_POPUP_SHOWN_EVENT = 'toolbar-popup-shown';

export class Toolbar {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private isMobile: boolean;
  private buttons: ToolButton[];
  private popupOpen: boolean;
  private currentPopup: HTMLElement | null;
  private tooltip: HTMLDivElement | null = null;
  private tooltipsEnabled: boolean = true;
  private hoverFrameId: number | null = null;
  private pendingPointerX: number = 0;
  private pendingPointerY: number = 0;

  private pointerMoveHandler!: (e: PointerEvent) => void;
  private pointerLeaveHandler!: () => void;
  private canvasPointerUpHandler!: (e: PointerEvent) => void;
  private documentPointerDownHandler!: (e: PointerEvent) => void;

  private imageCache: Map<string, HTMLImageElement> = new Map();
  private imagesLoaded: boolean = false;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private readonly popupControls: ToolbarPopupControls;

  constructor() {
    this.isMobile = this.checkIfMobile();
    this.setupCanvas();
    this.buttons = createToolbarButtons();
    this.popupOpen = false;
    this.currentPopup = null;
    this.popupControls = new ToolbarPopupControls(() => this.isMobile, {
      onClose: () => this.closeCurrentPopup(),
      onHide: () => this.hideCurrentPopup(),
    });

    this.preloadImages().then(() => {
      this.imagesLoaded = true;
      this.drawToolbar();
    });

    this.unsubscribeLanguageChange = subscribeLanguageChange(() => {
      this.refreshI18nText();
    });

    this.addEventListeners();
  }

  private checkIfMobile(): boolean {
    return window.innerWidth <= UI_BREAKPOINTS.MOBILE;
  }

  private setupCanvas(): void {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      const context = this.canvas.getContext('2d', { alpha: false });
      if (!context) {
        throw new Error('Failed to initialize toolbar canvas context');
      }
      this.ctx = context;
      this.canvas.className = 'toolbar-canvas';
    }

    if (!this.canvas.parentNode) {
      document.body.appendChild(this.canvas);
    }

    this.setCanvasSize();
  }

  private setCanvasSize(): void {
    this.canvas.width = this.isMobile ? window.innerWidth : TOOLBAR_WIDTH_DESKTOP;
    this.canvas.height = this.isMobile ? TOOLBAR_HEIGHT_MOBILE : window.innerHeight;
  }

  private ensureTooltip(): void {
    if (this.tooltip) return;
    const tooltip = document.createElement('div');
    tooltip.className = 'toolbar-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    this.tooltip = tooltip;
  }

  private showTooltip(text: string, x: number, y: number): void {
    if (this.isMobile || !this.tooltipsEnabled) return;
    this.ensureTooltip();
    if (!this.tooltip) return;
    this.tooltip.textContent = text;
    this.tooltip.style.left = `${x + 12}px`;
    this.tooltip.style.top = `${y + 12}px`;
    this.tooltip.style.display = 'block';
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.style.display = 'none';
  }

  public setTooltipsEnabled(enabled: boolean): void {
    this.tooltipsEnabled = enabled;
    if (!enabled) {
      this.hideTooltip();
    }
  }

  private async preloadImages(): Promise<void> {
    const loadPromises = this.buttons.map(
      button =>
        new Promise<void>((resolve, reject) => {
          const cached = this.imageCache.get(button.icon);
          if (cached) {
            button.image = cached;
            resolve();
            return;
          }

          const img = new Image();
          img.onload = () => {
            this.imageCache.set(button.icon, img);
            button.image = img;
            resolve();
          };
          img.onerror = () => {
            reject(new Error(`Failed to load ${button.icon}`));
          };
          img.src = button.icon;
        })
    );

    const results = await Promise.allSettled(loadPromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to load icon: ${this.buttons[index].icon}`, result.reason);
      }
    });
  }

  private drawToolbar(): void {
    if (!this.imagesLoaded) return;

    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawButtons();
  }

  private drawButtons(): void {
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;

    const totalSpan = this.buttons.length * BUTTON_SPACING;
    let cursor = this.isMobile
      ? (this.canvas.width - totalSpan) / 2
      : (this.canvas.height - totalSpan) / 2;

    for (const button of this.buttons) {
      if (button.image) {
        const iconX = this.isMobile ? cursor - BUTTON_ICON_OFFSET : 8;
        const iconY = this.isMobile ? 8 : cursor - BUTTON_ICON_OFFSET;
        const borderX = this.isMobile ? cursor - BUTTON_BORDER_PADDING : BUTTON_BORDER_PADDING;
        const borderY = this.isMobile ? BUTTON_BORDER_PADDING : cursor - BUTTON_BORDER_PADDING;
        const borderSize = BUTTON_SIZE + 4;

        this.ctx.drawImage(button.image, iconX, iconY, BUTTON_SIZE, BUTTON_SIZE);
        this.ctx.strokeRect(borderX, borderY, borderSize, borderSize);

        button.x = borderX;
        button.y = borderY;
        button.width = borderSize;
        button.height = borderSize;
      }

      cursor += BUTTON_SPACING;
    }
  }

  private addEventListeners(): void {
    this.removeEventListeners();

    this.pointerMoveHandler = (e: PointerEvent) => {
      this.pendingPointerX = e.clientX;
      this.pendingPointerY = e.clientY;
      this.scheduleHoverUpdate();
    };
    this.canvas.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });

    this.pointerLeaveHandler = () => {
      this.hideTooltip();
    };
    this.canvas.addEventListener('pointerleave', this.pointerLeaveHandler, { passive: true });

    this.canvasPointerUpHandler = (e: PointerEvent) => this.handleCanvasPointerUp(e);
    this.canvas.addEventListener('pointerup', this.canvasPointerUpHandler, { passive: true });

    this.documentPointerDownHandler = (e: PointerEvent) => this.handleDocumentPointerDown(e);
    document.addEventListener('pointerdown', this.documentPointerDownHandler, { passive: true });
  }

  private removeEventListeners(): void {
    if (this.hoverFrameId !== null) {
      cancelAnimationFrame(this.hoverFrameId);
      this.hoverFrameId = null;
    }
    if (this.pointerMoveHandler) {
      this.canvas.removeEventListener('pointermove', this.pointerMoveHandler);
    }
    if (this.pointerLeaveHandler) {
      this.canvas.removeEventListener('pointerleave', this.pointerLeaveHandler);
    }
    if (this.canvasPointerUpHandler) {
      this.canvas.removeEventListener('pointerup', this.canvasPointerUpHandler);
    }
    if (this.documentPointerDownHandler) {
      document.removeEventListener('pointerdown', this.documentPointerDownHandler);
    }
  }

  private scheduleHoverUpdate(): void {
    if (this.hoverFrameId !== null) {
      return;
    }

    this.hoverFrameId = requestAnimationFrame(() => {
      this.hoverFrameId = null;
      this.processHover(this.pendingPointerX, this.pendingPointerY);
    });
  }

  private processHover(x: number, y: number): void {
    const hovered = this.findButtonAt(x, y);
    this.canvas.style.cursor = hovered ? 'pointer' : 'default';

    if (!hovered) {
      this.hideTooltip();
      return;
    }

    this.showTooltip(t(hovered.nameKey), x, y);
  }

  private handleCanvasPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }

    const button = this.findButtonAt(e.clientX, e.clientY);
    if (!button) return;

    this.togglePopup(button.type);
  }

  private handleDocumentPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }

    if (!this.popupOpen) return;

    const target = e.target as Node;
    if (this.canvas.contains(target)) return;
    if (this.popupControls.contains(target)) return;
    if (this.currentPopup?.contains(target)) return;

    this.hideCurrentPopup();
  }

  private findButtonAt(x: number, y: number): ToolButton | null {
    for (const button of this.buttons) {
      if (isInsideRect(x, y, button)) {
        return button;
      }
    }
    return null;
  }

  public resizeToolbar(): void {
    const wasMobile = this.isMobile;
    this.isMobile = this.checkIfMobile();

    if (wasMobile !== this.isMobile) {
      this.removeEventListeners();
      this.removeCanvas();
      this.setupCanvas();
      this.addEventListeners();
    } else {
      this.setCanvasSize();
    }

    this.reanchorPopups();
    this.drawToolbar();
  }

  private reanchorPopups(): void {
    const popups = document.querySelectorAll<HTMLElement>('.toolbar-popup');
    popups.forEach(popup => this.applyPopupAnchorStyles(popup));

    if (this.popupOpen && this.currentPopup && this.isPopupVisible(this.currentPopup)) {
      this.popupControls.render();
    }
  }

  private removeCanvas(): void {
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  private togglePopup(type: PopupType): void {
    const popupId = `${type}Popup`;
    if (
      this.currentPopup &&
      this.currentPopup.id === popupId &&
      this.isPopupVisible(this.currentPopup)
    ) {
      this.hideCurrentPopup();
      return;
    }
    if (
      this.currentPopup &&
      this.currentPopup.id !== popupId &&
      this.isPopupVisible(this.currentPopup)
    ) {
      this.hideCurrentPopup();
    }
    this.showPopup(type);
  }

  private showPopup(type: PopupType): void {
    const popupId = `${type}Popup`;
    const existingPopup = document.getElementById(popupId);

    if (existingPopup) {
      existingPopup.style.display = 'block';
      existingPopup.dispatchEvent(
        new CustomEvent(TOOLBAR_POPUP_SHOWN_EVENT, {
          detail: { type },
        })
      );
      this.popupOpen = true;
      this.currentPopup = existingPopup;
      this.popupControls.render();
      return;
    }

    this.popupOpen = true;
    POPUP_SHOW_HANDLERS[type](this);
  }

  public createPopupContainer(id: string, title: string): HTMLElement {
    const popupContainer = document.createElement('div');
    popupContainer.id = id;
    popupContainer.className = 'toolbar-popup';
    this.applyPopupAnchorStyles(popupContainer);
    document.body.appendChild(popupContainer);

    const popup = document.createElement('canvas');
    popup.width = POPUP_CANVAS_WIDTH;
    popup.height = POPUP_CANVAS_HEIGHT;
    popupContainer.appendChild(popup);

    const titleElement = document.createElement('h3');
    titleElement.className = 'toolbar-popup__title';
    titleElement.textContent = title;
    popupContainer.appendChild(titleElement);

    this.currentPopup = popupContainer;
    this.popupOpen = true;
    this.popupControls.render();
    return popupContainer;
  }

  private applyPopupAnchorStyles(popup: HTMLElement): void {
    popup.style.setProperty(
      '--toolbar-popup-top',
      this.isMobile ? POPUP_TOP_MOBILE : POPUP_TOP_DESKTOP
    );
    popup.style.setProperty(
      '--toolbar-popup-left',
      this.isMobile ? POPUP_LEFT_MOBILE : POPUP_LEFT_DESKTOP
    );
  }

  public createPopupContainerByKey(id: string, titleKey: TranslationKey): HTMLElement {
    const popupContainer = this.createPopupContainer(id, t(titleKey));
    const titleElement = popupContainer.querySelector('.toolbar-popup__title');
    if (titleElement) {
      titleElement.setAttribute('data-i18n-key', titleKey);
    }
    return popupContainer;
  }

  private refreshI18nText(): void {
    const titleElements = document.querySelectorAll<HTMLElement>(
      '.toolbar-popup__title[data-i18n-key]'
    );
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-key');
      if (key) {
        element.textContent = t(key as TranslationKey);
      }
    });

    this.popupControls.updateTitles();
  }

  public closePopup(type: string): void {
    const popup = document.getElementById(`${type}Popup`);
    if (popup?.parentNode) {
      popup.parentNode.removeChild(popup);
    }

    if (this.currentPopup && this.currentPopup.id === `${type}Popup`) {
      this.currentPopup = null;
      this.popupOpen = false;
      this.popupControls.remove();
    }
  }

  private closeCurrentPopup(): void {
    if (this.currentPopup?.parentNode) {
      this.currentPopup.parentNode.removeChild(this.currentPopup);
      this.currentPopup = null;
    }
    this.popupOpen = false;
    this.popupControls.remove();
  }

  private hideCurrentPopup(): void {
    if (this.currentPopup) {
      this.currentPopup.style.display = 'none';
    }
    this.popupOpen = false;
    this.popupControls.remove();
  }

  private isPopupVisible(popup: HTMLElement): boolean {
    return popup.style.display !== 'none';
  }

  public destroy(): void {
    this.removeEventListeners();
    this.removeCanvas();
    this.closeCurrentPopup();
    if (this.tooltip?.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
    this.imageCache.clear();
    this.buttons = [];
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }
  }
}
