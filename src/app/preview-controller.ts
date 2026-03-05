import { PreviewWindow } from '../preview/preview-window';
import { PreviewWindowManager } from './preview-manager';
import type { MarkerPoint, SolutionPath } from '../types/maze';

interface PreviewControllerOptions {
  initialVisible: boolean;
  createWindow: (args: { onHide: () => void; onClose: () => void }) => PreviewWindow;
  updatePreviewVisibilitySetting: (visible: boolean) => void;
  setPreviewControllerEnabled: (enabled: boolean, tooltip?: string) => void;
  getPreviewClosedTooltip: () => string;
  requestPreviewRefresh: () => void;
  emitStatusChanged: (canOpenNewPreviewWindow: boolean) => void;
}

export class PreviewController {
  private readonly previewWindowManager: PreviewWindowManager;
  private previewVisible: boolean;

  constructor(private readonly options: PreviewControllerOptions) {
    this.previewVisible = options.initialVisible;
    this.previewWindowManager = new PreviewWindowManager(
      {
        createWindow: args => options.createWindow(args),
        onVisibilityChanged: visible => this.handlePreviewVisibilityChanged(visible),
        onClosed: () => this.handlePreviewClosed(),
      },
      this.previewVisible
    );
  }

  public handleLanguageChange(): void {
    if (this.previewWindowManager.isWindowClosed()) {
      this.options.setPreviewControllerEnabled(false, this.options.getPreviewClosedTooltip());
    }
  }

  public handleWindowResize(): void {
    this.previewWindowManager.handleWindowResize();
  }

  public isVisible(): boolean {
    return this.previewVisible;
  }

  public isWindowClosed(): boolean {
    return this.previewWindowManager.isWindowClosed();
  }

  public setVisible(visible: boolean): void {
    this.previewVisible = visible;
    this.options.updatePreviewVisibilitySetting(visible);
    if (this.previewWindowManager.isWindowClosed()) {
      if (visible) {
        this.previewVisible = false;
        this.options.updatePreviewVisibilitySetting(false);
      }
      this.emitStatusChanged();
      return;
    }
    this.previewWindowManager.setVisible(visible);
    if (visible) {
      this.emitStatusChanged();
    }
  }

  public reopen(): void {
    this.previewWindowManager.reopen();
    this.previewVisible = true;
    this.options.updatePreviewVisibilitySetting(true);
    this.options.setPreviewControllerEnabled(true);
    this.options.requestPreviewRefresh();
    this.emitStatusChanged();
  }

  public canOpenNewWindow(): boolean {
    return this.previewWindowManager.canOpenNewWindow();
  }

  public updateMaze(
    mazeData: number[][],
    markers?: { start?: MarkerPoint | null; end?: MarkerPoint | null },
    solutionPath?: SolutionPath
  ): void {
    this.previewWindowManager.updateMaze(mazeData, markers, solutionPath);
  }

  public destroy(): void {
    this.previewWindowManager.destroy();
  }

  private handlePreviewVisibilityChanged(visible: boolean): void {
    this.previewVisible = visible;
    this.options.updatePreviewVisibilitySetting(visible);
    this.emitStatusChanged();
  }

  private handlePreviewClosed(): void {
    this.previewVisible = false;
    this.options.updatePreviewVisibilitySetting(false);
    this.options.setPreviewControllerEnabled(false, this.options.getPreviewClosedTooltip());
    this.emitStatusChanged();
  }

  private emitStatusChanged(): void {
    this.options.emitStatusChanged(this.canOpenNewWindow());
  }
}
