export interface DatGuiSettings {
  backgroundColor: string;
  wallColor: string;
  floorColor: string;
  wallOpacity: number;
  floorOpacity: number;
}

export class DatGuiSettingsStorage {
  private static readonly BACKGROUND_COLOR_KEY = 'maze_solver_3d_gui_background_color';
  private static readonly WALL_COLOR_KEY = 'maze_solver_3d_gui_wall_color';
  private static readonly FLOOR_COLOR_KEY = 'maze_solver_3d_gui_floor_color';
  private static readonly WALL_OPACITY_KEY = 'maze_solver_3d_gui_wall_opacity';
  private static readonly FLOOR_OPACITY_KEY = 'maze_solver_3d_gui_floor_opacity';

  public load(defaults: DatGuiSettings): DatGuiSettings {
    return {
      backgroundColor: this.loadColor(
        DatGuiSettingsStorage.BACKGROUND_COLOR_KEY,
        defaults.backgroundColor
      ),
      wallColor: this.loadColor(DatGuiSettingsStorage.WALL_COLOR_KEY, defaults.wallColor),
      floorColor: this.loadColor(DatGuiSettingsStorage.FLOOR_COLOR_KEY, defaults.floorColor),
      wallOpacity: this.loadOpacity(DatGuiSettingsStorage.WALL_OPACITY_KEY, defaults.wallOpacity),
      floorOpacity: this.loadOpacity(
        DatGuiSettingsStorage.FLOOR_OPACITY_KEY,
        defaults.floorOpacity
      ),
    };
  }

  public save(key: keyof DatGuiSettings, value: string | number | boolean): void {
    switch (key) {
      case 'backgroundColor':
        this.setItem(DatGuiSettingsStorage.BACKGROUND_COLOR_KEY, this.normalizeColor(value));
        break;
      case 'wallColor':
        this.setItem(DatGuiSettingsStorage.WALL_COLOR_KEY, this.normalizeColor(value));
        break;
      case 'floorColor':
        this.setItem(DatGuiSettingsStorage.FLOOR_COLOR_KEY, this.normalizeColor(value));
        break;
      case 'wallOpacity':
        this.setItem(DatGuiSettingsStorage.WALL_OPACITY_KEY, String(this.normalizeOpacity(value)));
        break;
      case 'floorOpacity':
        this.setItem(DatGuiSettingsStorage.FLOOR_OPACITY_KEY, String(this.normalizeOpacity(value)));
        break;
    }
  }

  private loadColor(storageKey: string, fallback: string): string {
    const raw = this.getItem(storageKey);
    if (!raw) {
      return fallback;
    }
    return this.isHexColor(raw) ? raw : fallback;
  }

  private loadOpacity(storageKey: string, fallback: number): number {
    const raw = this.getItem(storageKey);
    if (!raw) {
      return this.normalizeOpacity(fallback);
    }
    return this.normalizeOpacity(Number(raw), fallback);
  }

  private normalizeColor(color: string | number | boolean): string {
    if (typeof color !== 'string') {
      return '#999999';
    }
    return this.isHexColor(color) ? color : '#999999';
  }

  private normalizeOpacity(opacity: number | string | boolean, fallback = 1): number {
    const numeric = typeof opacity === 'number' ? opacity : Number(opacity);
    const source = Number.isFinite(numeric) ? numeric : fallback;
    return this.clamp(source, 0, 1);
  }

  private clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  private isHexColor(value: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(value);
  }

  private getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to read "${key}" from localStorage:`, error);
      return null;
    }
  }

  private setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Failed to write "${key}" to localStorage:`, error);
    }
  }
}
