import { t } from './i18n';
import { getIconPath } from '../constants/assets';
import {
  POPUP_CONTROL_CLOSE_LEFT_DESKTOP,
  POPUP_CONTROL_CLOSE_LEFT_MOBILE,
  POPUP_CONTROL_HIDE_LEFT_DESKTOP,
  POPUP_CONTROL_HIDE_LEFT_MOBILE,
  POPUP_CONTROL_TOP_DESKTOP,
  POPUP_CONTROL_TOP_MOBILE,
} from './toolbar-config';

interface PopupControlConfig {
  src: string;
  className: string;
  title: string;
  topVarName: string;
  leftVarName: string;
  mobileTop: string;
  desktopTop: string;
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
      src: getIconPath('close.png'),
      className: 'toolbar-popup__close',
      title: t('toolbar.close'),
      topVarName: '--toolbar-close-top',
      leftVarName: '--toolbar-close-left',
      mobileTop: POPUP_CONTROL_TOP_MOBILE,
      desktopTop: POPUP_CONTROL_TOP_DESKTOP,
      mobileLeft: POPUP_CONTROL_CLOSE_LEFT_MOBILE,
      desktopLeft: POPUP_CONTROL_CLOSE_LEFT_DESKTOP,
      onClick: this.handlers.onClose,
    });

    this.hideIcon = this.createIcon({
      src: getIconPath('hide.png'),
      className: 'toolbar-popup__hide',
      title: t('toolbar.hide'),
      topVarName: '--toolbar-hide-top',
      leftVarName: '--toolbar-hide-left',
      mobileTop: POPUP_CONTROL_TOP_MOBILE,
      desktopTop: POPUP_CONTROL_TOP_DESKTOP,
      mobileLeft: POPUP_CONTROL_HIDE_LEFT_MOBILE,
      desktopLeft: POPUP_CONTROL_HIDE_LEFT_DESKTOP,
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
    icon.style.setProperty(config.topVarName, this.isMobile() ? config.mobileTop : config.desktopTop);
    icon.style.setProperty(
      config.leftVarName,
      this.isMobile() ? config.mobileLeft : config.desktopLeft
    );
    icon.addEventListener('click', config.onClick);
    document.body.appendChild(icon);
    return icon;
  }
}
