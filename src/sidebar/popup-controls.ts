import { t } from './i18n';

interface PopupControlConfig {
  src: string;
  className: string;
  title: string;
  topVarName: string;
  leftVarName: string;
  mobileLeft: string;
  desktopLeft: string;
  onClick: () => void;
}

interface PopupControlHandlers {
  onClose: () => void;
  onHide: () => void;
}

export class ToolbarPopupControls {
  private closeIcon: HTMLImageElement | null = null;
  private hideIcon: HTMLImageElement | null = null;

  constructor(
    private readonly isMobile: () => boolean,
    private readonly handlers: PopupControlHandlers
  ) {}

  public render(): void {
    this.remove();

    this.closeIcon = this.createIcon({
      src: '/MazeSolver3D/icon/close.png',
      className: 'toolbar-popup__close',
      title: t('toolbar.close'),
      topVarName: '--toolbar-close-top',
      leftVarName: '--toolbar-close-left',
      mobileLeft: 'calc(50% + 160px)',
      desktopLeft: '400px',
      onClick: this.handlers.onClose,
    });

    this.hideIcon = this.createIcon({
      src: '/MazeSolver3D/icon/hide.png',
      className: 'toolbar-popup__hide',
      title: t('toolbar.hide'),
      topVarName: '--toolbar-hide-top',
      leftVarName: '--toolbar-hide-left',
      mobileLeft: 'calc(50% + 120px)',
      desktopLeft: '360px',
      onClick: this.handlers.onHide,
    });
  }

  public updateTitles(): void {
    if (this.closeIcon) {
      this.closeIcon.title = t('toolbar.close');
    }
    if (this.hideIcon) {
      this.hideIcon.title = t('toolbar.hide');
    }
  }

  public remove(): void {
    if (this.closeIcon?.parentNode) {
      this.closeIcon.parentNode.removeChild(this.closeIcon);
    }
    if (this.hideIcon?.parentNode) {
      this.hideIcon.parentNode.removeChild(this.hideIcon);
    }
    this.closeIcon = null;
    this.hideIcon = null;
  }

  public contains(target: Node): boolean {
    return !!(this.closeIcon?.contains(target) || this.hideIcon?.contains(target));
  }

  private createIcon(config: PopupControlConfig): HTMLImageElement {
    const icon = new Image();
    icon.src = config.src;
    icon.className = config.className;
    icon.title = config.title;
    icon.style.setProperty(config.topVarName, this.isMobile() ? '56px' : '10px');
    icon.style.setProperty(
      config.leftVarName,
      this.isMobile() ? config.mobileLeft : config.desktopLeft
    );
    icon.addEventListener('click', config.onClick);
    document.body.appendChild(icon);
    return icon;
  }
}
