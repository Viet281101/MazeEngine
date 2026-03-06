import { DEBUG_OVERLAY } from '../constants/debug';

export interface DebugOverlayOptions {
  getMazeLayerCount: () => number;
  getRenderQualityInfo?: () => {
    pixelRatio: number;
    adaptiveScale: number;
    adaptiveEnabled: boolean;
  };
  updateIntervalMs?: number;
}

export class DebugOverlay {
  private overlay: HTMLDivElement | null = null;
  private rafId: number | null = null;
  private lastUpdate: number = 0;
  private renderCount: number = 0;
  private lastRenderCount: number = 0;
  private readonly updateIntervalMs: number;

  constructor(private readonly options: DebugOverlayOptions) {
    this.updateIntervalMs = options.updateIntervalMs ?? DEBUG_OVERLAY.UPDATE_INTERVAL_MS;
    this.setupOverlay();
  }

  public recordRender(): void {
    this.renderCount += 1;
  }

  public setVisible(visible: boolean): void {
    if (this.overlay) {
      this.overlay.style.display = visible ? 'block' : 'none';
    }

    if (visible) {
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  public destroy(): void {
    this.stopLoop();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }

  private setupOverlay(): void {
    const overlay = document.createElement('div');
    overlay.id = 'debug-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '8px',
      left: '58px',
      padding: '6px 8px',
      background: 'rgba(0, 0, 0, 0.6)',
      color: '#e6e6e6',
      fontFamily: 'monospace',
      fontSize: '12px',
      borderRadius: '4px',
      zIndex: '1000',
      pointerEvents: 'none',
      whiteSpace: 'pre',
    });
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private startLoop(): void {
    if (this.rafId !== null) {
      return;
    }

    this.lastUpdate = performance.now();
    this.lastRenderCount = this.renderCount;

    const tick = (now: number) => {
      if (!this.overlay) {
        this.rafId = null;
        return;
      }

      if (now - this.lastUpdate >= this.updateIntervalMs) {
        const intervalSeconds = (now - this.lastUpdate) / 1000;
        const renders = this.renderCount - this.lastRenderCount;
        const fps = intervalSeconds > 0 ? renders / intervalSeconds : 0;
        const frameTimeMs =
          renders > 0 && intervalSeconds > 0 ? (intervalSeconds * 1000) / renders : 0;
        const mazeType = this.getMazeTypeLabel();
        const quality = this.options.getRenderQualityInfo?.();
        const qualityText = quality
          ? `\nPixel Ratio: ${quality.pixelRatio.toFixed(2)}\nAdapt FPS: ${
              quality.adaptiveEnabled ? 'ON' : 'OFF'
            } (${quality.adaptiveScale.toFixed(2)})`
          : '';

        this.overlay.textContent = `Type: ${mazeType}\nFPS: ${fps.toFixed(1)}\nFrame: ${frameTimeMs.toFixed(
          2
        )} ms${qualityText}`;

        this.lastUpdate = now;
        this.lastRenderCount = this.renderCount;
      }

      this.rafId = window.requestAnimationFrame(tick);
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private getMazeTypeLabel(): string {
    const layerCount = this.options.getMazeLayerCount();

    if (layerCount <= 0) {
      return 'Unknown';
    }
    if (layerCount === 1) {
      return 'Single Layer';
    }
    return `Multi Layer (${layerCount})`;
  }
}
