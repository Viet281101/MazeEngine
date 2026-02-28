import { PreviewWindow } from '../preview/PreviewWindow';
import type { MarkerPoint } from '../types/maze';

interface PreviewWindowFactoryArgs {
  onHide: () => void;
  onClose: () => void;
}

interface PreviewWindowManagerConfig {
  createWindow: (args: PreviewWindowFactoryArgs) => PreviewWindow;
  onVisibilityChanged?: (visible: boolean) => void;
  onClosed?: () => void;
}

export class PreviewWindowManager {
  private previewWindow: PreviewWindow | null;
  private isVisible: boolean;
  private isClosed: boolean;

  constructor(private readonly config: PreviewWindowManagerConfig, initialVisible: boolean) {
    this.previewWindow = this.createWindow();
    this.isVisible = initialVisible;
    this.isClosed = false;
    this.setVisible(initialVisible);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;

    if (this.isClosed || !this.previewWindow) {
      if (visible) {
        this.isVisible = false;
      }
      this.config.onVisibilityChanged?.(this.isVisible);
      return;
    }

    if (visible) {
      this.previewWindow.show();
    } else {
      this.previewWindow.hide();
    }
  }

  public updateMaze(mazeData: number[][], markers?: { start?: MarkerPoint | null; end?: MarkerPoint | null }): void {
    this.previewWindow?.updateMaze(mazeData, markers);
  }

  public handleWindowResize(): void {
    this.previewWindow?.handleWindowResize();
  }

  public reopen(): void {
    if (this.previewWindow) {
      this.isClosed = false;
      this.setVisible(true);
      return;
    }

    this.previewWindow = this.createWindow();
    this.isClosed = false;
    this.isVisible = true;
    this.previewWindow.show();
    this.config.onVisibilityChanged?.(true);
  }

  public canOpenNewWindow(): boolean {
    return this.previewWindow === null;
  }

  public isWindowClosed(): boolean {
    return this.isClosed;
  }

  public destroy(): void {
    this.previewWindow?.destroy();
    this.previewWindow = null;
  }

  private createWindow(): PreviewWindow {
    return this.config.createWindow({
      onHide: () => this.handleWindowHidden(),
      onClose: () => this.handleWindowClosed(),
    });
  }

  private handleWindowHidden(): void {
    this.isVisible = false;
    this.config.onVisibilityChanged?.(false);
  }

  private handleWindowClosed(): void {
    this.isVisible = false;
    this.isClosed = true;
    this.previewWindow = null;
    this.config.onVisibilityChanged?.(false);
    this.config.onClosed?.();
  }
}
