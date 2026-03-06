import { PreviewWindow } from '../preview/preview-window';
import type { MarkerPoint, MazeData, SolutionPath } from '../types/maze';

interface PreviewWindowFactoryArgs {
  onHide: () => void;
  onClose: () => void;
}

interface PreviewWindowManagerConfig {
  createWindow: (args: PreviewWindowFactoryArgs) => PreviewWindow;
  onVisibilityChanged?: (visible: boolean) => void;
  onClosed?: () => void;
}

interface PreviewSnapshot {
  mazeData: MazeData;
  markers?: { start?: MarkerPoint | null; end?: MarkerPoint | null };
  solutionPath?: SolutionPath;
}

export class PreviewWindowManager {
  private previewWindow: PreviewWindow | null = null;
  private isVisible: boolean;
  private isClosed: boolean = false;
  private latestSnapshot: PreviewSnapshot | null = null;

  constructor(
    private readonly config: PreviewWindowManagerConfig,
    initialVisible: boolean
  ) {
    this.isVisible = initialVisible;
    this.setVisible(initialVisible);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;

    if (this.isClosed) {
      if (visible) {
        this.isVisible = false;
      }
      this.config.onVisibilityChanged?.(this.isVisible);
      return;
    }

    if (visible) {
      const previewWindow = this.ensureWindow();
      if (!previewWindow) {
        this.isVisible = false;
        this.config.onVisibilityChanged?.(false);
        return;
      }
      previewWindow.show();
    } else {
      if (!this.previewWindow) {
        this.config.onVisibilityChanged?.(false);
        return;
      }
      this.previewWindow.hide();
    }
  }

  public updateMaze(
    mazeData: MazeData,
    markers?: { start?: MarkerPoint | null; end?: MarkerPoint | null },
    solutionPath?: SolutionPath
  ): void {
    this.latestSnapshot = {
      mazeData,
      markers,
      solutionPath,
    };
    this.previewWindow?.updateMaze(mazeData, markers, solutionPath);
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

    this.isClosed = false;
    const previewWindow = this.ensureWindow();
    if (!previewWindow) {
      this.isVisible = false;
      this.config.onVisibilityChanged?.(false);
      return;
    }
    previewWindow.show();
    this.isVisible = true;
    this.config.onVisibilityChanged?.(true);
  }

  public canOpenNewWindow(): boolean {
    return this.isClosed && this.previewWindow === null;
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

  private ensureWindow(): PreviewWindow | null {
    if (this.previewWindow) {
      return this.previewWindow;
    }
    const previewWindow = this.createWindow();
    this.previewWindow = previewWindow;
    if (this.latestSnapshot) {
      previewWindow.updateMaze(
        this.latestSnapshot.mazeData,
        this.latestSnapshot.markers,
        this.latestSnapshot.solutionPath
      );
    }
    return previewWindow;
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
