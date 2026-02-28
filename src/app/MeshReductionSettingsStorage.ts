import { MESH_REDUCTION } from '../constants/maze';

export interface MeshReductionSettings {
  enabled: boolean;
  threshold: number;
}

export class MeshReductionSettingsStorage {
  private static readonly ENABLED_KEY = 'maze_solver_3d_mesh_reduction_enabled';
  private static readonly THRESHOLD_KEY = 'maze_solver_3d_mesh_reduction_threshold';

  public load(defaults: MeshReductionSettings): MeshReductionSettings {
    const enabled = this.loadEnabled(defaults.enabled);
    const threshold = this.loadThreshold(defaults.threshold);
    return { enabled, threshold };
  }

  public saveEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.ENABLED_KEY, String(enabled));
  }

  public saveThreshold(threshold: number): void {
    const normalized = this.normalizeThreshold(threshold);
    this.setItem(MeshReductionSettingsStorage.THRESHOLD_KEY, String(normalized));
  }

  private loadEnabled(fallback: boolean): boolean {
    const raw = this.getItem(MeshReductionSettingsStorage.ENABLED_KEY);
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    return fallback;
  }

  private loadThreshold(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.THRESHOLD_KEY);
    if (!raw) {
      return this.normalizeThreshold(fallback);
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return this.normalizeThreshold(fallback);
    }

    return this.normalizeThreshold(parsed);
  }

  private normalizeThreshold(value: number): number {
    return Math.max(
      MESH_REDUCTION.MIN_THRESHOLD,
      Math.min(MESH_REDUCTION.MAX_THRESHOLD, Math.floor(value))
    );
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
