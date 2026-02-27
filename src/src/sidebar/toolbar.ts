import { showSolvePopup } from './popup/solve';
import { showSettingsPopup } from './popup/setting';
import { showTutorialPopup } from './popup/tutorial';
import { showMazePopup } from './popup/maze';
import { showGeneratePopup } from './popup/generate';
import { subscribeLanguageChange, t, type TranslationKey } from './i18n';
import { UI_BREAKPOINTS } from '../constants/ui';
import './toolbar.css';

interface ToolButton {
  nameKey: TranslationKey;
  icon: string;
  action: () => void;
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
}

export class Toolbar {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private isMobile: boolean;
  private buttons: ToolButton[];
  private popupOpen: boolean;
  private currentPopup: HTMLElement | null;
  private currentCloseIcon: HTMLImageElement | null;
  private currentHideIcon: HTMLImageElement | null;
  private tooltip: HTMLDivElement | null = null;
  private hoveredButton: ToolButton | null = null;

  private mouseMoveHandler!: (e: MouseEvent) => void;
  private mouseLeaveHandler!: () => void;
  private mouseDownHandler!: (e: MouseEvent | TouchEvent) => void;
  private touchStartHandler!: (e: TouchEvent) => void;
  private documentClickHandler!: (e: MouseEvent | TouchEvent) => void;

  private imageCache: Map<string, HTMLImageElement> = new Map();
  private imagesLoaded: boolean = false;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor() {
    this.isMobile = this.checkIfMobile();
    this.setupCanvas();
    this.buttons = this.createButtons();
    this.popupOpen = false;
    this.currentPopup = null;
    this.currentCloseIcon = null;
    this.currentHideIcon = null;

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
      this.ctx = this.canvas.getContext('2d', {
        alpha: false,
      }) as CanvasRenderingContext2D;
      this.canvas.className = 'toolbar-canvas';
    }

    if (!this.canvas.parentNode) {
      document.body.appendChild(this.canvas);
    }

    this.canvas.width = this.isMobile ? window.innerWidth : 50;
    this.canvas.height = this.isMobile ? 50 : window.innerHeight;
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
    if (this.isMobile) return;
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

  private createButtons(): ToolButton[] {
    const iconPaths = [
      '/MazeSolver3D/icon/maze.png',
      '/MazeSolver3D/icon/generate_maze.png',
      '/MazeSolver3D/icon/solving_maze.png',
      '/MazeSolver3D/icon/question.png',
      '/MazeSolver3D/icon/setting.png',
    ];

    return [
      {
        nameKey: 'toolbar.customMaze',
        icon: iconPaths[0],
        action: () => this.togglePopup('maze'),
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      {
        nameKey: 'toolbar.generateMaze',
        icon: iconPaths[1],
        action: () => this.togglePopup('generate'),
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      {
        nameKey: 'toolbar.solvingMaze',
        icon: iconPaths[2],
        action: () => this.togglePopup('solve'),
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      {
        nameKey: 'toolbar.tutorial',
        icon: iconPaths[3],
        action: () => this.togglePopup('tutorial'),
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
      {
        nameKey: 'toolbar.settings',
        icon: iconPaths[4],
        action: () => this.togglePopup('settings'),
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    ];
  }

  private async preloadImages(): Promise<void> {
    const loadPromises = this.buttons.map(button => {
      return new Promise<void>((resolve, reject) => {
        if (this.imageCache.has(button.icon)) {
          button.image = this.imageCache.get(button.icon);
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
          console.error(`Failed to load icon: ${button.icon}`);
          reject(new Error(`Failed to load ${button.icon}`));
        };
        img.src = button.icon;
      });
    });

    try {
      await Promise.all(loadPromises);
    } catch (error) {
      console.error('Error loading toolbar icons:', error);
    }
  }

  private drawToolbar(): void {
    if (!this.imagesLoaded) return;

    // Clear canvas
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw buttons
    if (this.isMobile) {
      this.drawToolbarVertical();
    } else {
      this.drawToolbarHorizontal();
    }
  }

  private drawToolbarVertical(): void {
    const buttonSize = 36;
    const padding = 5;
    const spacing = 60;
    const totalWidth = this.buttons.length * spacing;
    let startX = (this.canvas.width - totalWidth) / 2;

    this.buttons.forEach(button => {
      if (button.image) {
        // Draw image
        this.ctx.drawImage(button.image, startX - 2, 8, buttonSize, buttonSize);

        // Draw border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(startX - padding, padding, buttonSize + 4, buttonSize + 4);

        // Update button bounds
        button.x = startX - padding;
        button.y = padding;
        button.width = buttonSize + 4;
        button.height = buttonSize + 4;
      }

      startX += spacing;
    });
  }

  private drawToolbarHorizontal(): void {
    const buttonSize = 36;
    const padding = 5;
    const spacing = 60;
    const totalHeight = this.buttons.length * spacing;
    let startY = (this.canvas.height - totalHeight) / 2;

    this.buttons.forEach(button => {
      if (button.image) {
        // Draw image
        this.ctx.drawImage(button.image, 8, startY - 2, buttonSize, buttonSize);

        // Draw border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(padding, startY - padding, buttonSize + 4, buttonSize + 4);

        // Update button bounds
        button.x = padding;
        button.y = startY - padding;
        button.width = buttonSize + 4;
        button.height = buttonSize + 4;
      }

      startY += spacing;
    });
  }

  private addEventListeners(): void {
    this.removeEventListeners();

    this.mouseMoveHandler = (e: MouseEvent) => {
      let cursor = 'default';
      let nextHovered: ToolButton | null = null;
      for (const button of this.buttons) {
        if (this.isInside(e.clientX, e.clientY, button)) {
          cursor = 'pointer';
          nextHovered = button;
          break;
        }
      }
      this.canvas.style.cursor = cursor;
      if (nextHovered) {
        if (this.hoveredButton !== nextHovered) {
          this.hoveredButton = nextHovered;
        }
        this.showTooltip(t(nextHovered.nameKey), e.clientX, e.clientY);
      } else {
        this.hoveredButton = null;
        this.hideTooltip();
      }
    };
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    this.mouseLeaveHandler = () => {
      this.hoveredButton = null;
      this.hideTooltip();
    };
    this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler, { passive: true });

    this.mouseDownHandler = (e: MouseEvent | TouchEvent) => this.handleCanvasClick(e);
    this.touchStartHandler = (e: TouchEvent) => this.handleCanvasClick(e);

    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: true });

    this.documentClickHandler = (e: MouseEvent | TouchEvent) => this.handleDocumentClick(e);
    document.addEventListener('click', this.documentClickHandler, { passive: true });
    document.addEventListener('touchstart', this.documentClickHandler, { passive: true });
  }

  private removeEventListeners(): void {
    if (this.mouseMoveHandler) {
      this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseLeaveHandler) {
      this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
    }
    if (this.mouseDownHandler) {
      this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    }
    if (this.touchStartHandler) {
      this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    }
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      document.removeEventListener('touchstart', this.documentClickHandler);
    }
  }

  private handleCanvasClick(e: MouseEvent | TouchEvent): void {
    const mouseX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const mouseY = 'clientY' in e ? e.clientY : e.touches[0].clientY;

    for (const button of this.buttons) {
      if (this.isInside(mouseX, mouseY, button)) {
        button.action();
        break;
      }
    }
  }

  private handleDocumentClick(e: MouseEvent | TouchEvent): void {
    if (!this.popupOpen) return;

    const target = e.target as Node;
    if (this.canvas.contains(target)) return;
    if (this.currentCloseIcon && this.currentCloseIcon.contains(target)) return;
    if (this.currentHideIcon && this.currentHideIcon.contains(target)) return;
    if (this.currentPopup && this.currentPopup.contains(target)) return;

    this.hideCurrentPopup();
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
      this.canvas.width = this.isMobile ? window.innerWidth : 50;
      this.canvas.height = this.isMobile ? 50 : window.innerHeight;
    }

    this.drawToolbar();
  }

  private removeCanvas(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  private isInside(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  private togglePopup(type: string): void {
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

  private showPopup(type: string): void {
    const popupId = `${type}Popup`;
    const existingPopup = document.getElementById(popupId);
    if (existingPopup) {
      existingPopup.style.display = 'block';
      this.popupOpen = true;
      this.currentPopup = existingPopup;
      this.addCloseIcon();
      this.addHideIcon();
      return;
    }
    this.popupOpen = true;
    switch (type) {
      case 'solve':
        showSolvePopup(this);
        break;
      case 'generate':
        showGeneratePopup(this);
        break;
      case 'tutorial':
        showTutorialPopup(this);
        break;
      case 'settings':
        showSettingsPopup(this);
        break;
      case 'maze':
        showMazePopup(this);
        break;
    }
  }

  public createPopupContainer(id: string, title: string): HTMLElement {
    const popupContainer = document.createElement('div');
    popupContainer.id = id;
    popupContainer.className = 'toolbar-popup';
    popupContainer.style.setProperty('--toolbar-popup-top', this.isMobile ? '50px' : '0');
    popupContainer.style.setProperty('--toolbar-popup-left', this.isMobile ? '50%' : '238px');
    document.body.appendChild(popupContainer);

    const popup = document.createElement('canvas');
    popup.width = 370;
    popup.height = 4000;
    popupContainer.appendChild(popup);

    const titleElement = document.createElement('h3');
    titleElement.className = 'toolbar-popup__title';
    titleElement.textContent = title;
    popupContainer.appendChild(titleElement);

    this.addCloseIcon();
    this.addHideIcon();
    this.currentPopup = popupContainer;
    return popupContainer;
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

    if (this.currentCloseIcon) {
      this.currentCloseIcon.title = t('toolbar.close');
    }
    if (this.currentHideIcon) {
      this.currentHideIcon.title = t('toolbar.hide');
    }
  }

  private addCloseIcon(): void {
    if (this.currentCloseIcon) {
      document.body.removeChild(this.currentCloseIcon);
    }

    const closeIcon = new Image();
    closeIcon.src = '/MazeSolver3D/icon/close.png';
    closeIcon.className = 'toolbar-popup__close';
    closeIcon.title = t('toolbar.close');
    closeIcon.style.setProperty('--toolbar-close-top', this.isMobile ? '56px' : '10px');
    closeIcon.style.setProperty(
      '--toolbar-close-left',
      this.isMobile ? 'calc(50% + 160px)' : '400px'
    );
    closeIcon.addEventListener('click', () => this.closeCurrentPopup());
    document.body.appendChild(closeIcon);
    this.currentCloseIcon = closeIcon;
  }

  private addHideIcon(): void {
    if (this.currentHideIcon) {
      document.body.removeChild(this.currentHideIcon);
    }

    const hideIcon = new Image();
    hideIcon.src = '/MazeSolver3D/icon/hide.png';
    hideIcon.className = 'toolbar-popup__hide';
    hideIcon.title = t('toolbar.hide');
    hideIcon.style.setProperty('--toolbar-hide-top', this.isMobile ? '56px' : '10px');
    hideIcon.style.setProperty(
      '--toolbar-hide-left',
      this.isMobile ? 'calc(50% + 120px)' : '360px'
    );
    hideIcon.addEventListener('click', () => this.hideCurrentPopup());
    document.body.appendChild(hideIcon);
    this.currentHideIcon = hideIcon;
  }

  public closePopup(type: string): void {
    const popup = document.getElementById(`${type}Popup`);
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
    if (this.currentCloseIcon && this.currentCloseIcon.parentNode) {
      this.currentCloseIcon.parentNode.removeChild(this.currentCloseIcon);
      this.currentCloseIcon = null;
    }
    if (this.currentHideIcon && this.currentHideIcon.parentNode) {
      this.currentHideIcon.parentNode.removeChild(this.currentHideIcon);
      this.currentHideIcon = null;
    }
    const inputs = document.querySelectorAll('.popup-input');
    inputs.forEach(input => input.parentElement?.removeChild(input));
    this.popupOpen = false;
    this.currentPopup = null;
  }

  private closeCurrentPopup(): void {
    if (this.currentPopup && this.currentPopup.parentNode) {
      this.currentPopup.parentNode.removeChild(this.currentPopup);
      this.currentPopup = null;
    }
    if (this.currentCloseIcon && this.currentCloseIcon.parentNode) {
      this.currentCloseIcon.parentNode.removeChild(this.currentCloseIcon);
      this.currentCloseIcon = null;
    }
    if (this.currentHideIcon && this.currentHideIcon.parentNode) {
      this.currentHideIcon.parentNode.removeChild(this.currentHideIcon);
      this.currentHideIcon = null;
    }
    this.popupOpen = false;
  }

  private hideCurrentPopup(): void {
    if (this.currentPopup) {
      this.currentPopup.style.display = 'none';
    }
    if (this.currentCloseIcon && this.currentCloseIcon.parentNode) {
      this.currentCloseIcon.parentNode.removeChild(this.currentCloseIcon);
      this.currentCloseIcon = null;
    }
    if (this.currentHideIcon && this.currentHideIcon.parentNode) {
      this.currentHideIcon.parentNode.removeChild(this.currentHideIcon);
      this.currentHideIcon = null;
    }
    this.popupOpen = false;
  }

  private isPopupVisible(popup: HTMLElement): boolean {
    return popup.style.display !== 'none';
  }

  public destroy(): void {
    this.removeEventListeners();
    this.removeCanvas();
    this.closeCurrentPopup();
    if (this.tooltip && this.tooltip.parentNode) {
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
