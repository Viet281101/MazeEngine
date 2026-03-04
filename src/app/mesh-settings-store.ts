import { MESH_REDUCTION } from '../constants/maze';

export interface MeshReductionSettings {
  enabled: boolean;
  threshold: number;
  hideEdgesDuringInteractionEnabled: boolean;
  adaptiveQualityEnabled: boolean;
}

export class MeshReductionSettingsStorage {
  private static readonly ENABLED_KEY = 'maze_solver_3d_mesh_reduction_enabled';
  private static readonly THRESHOLD_KEY = 'maze_solver_3d_mesh_reduction_threshold';
  private static readonly HIDE_EDGES_DURING_INTERACTION_KEY =
    'maze_solver_3d_hide_edges_during_interaction';
  private static readonly ADAPTIVE_QUALITY_KEY = 'maze_solver_3d_adaptive_quality';

  public load(defaults: MeshReductionSettings): MeshReductionSettings {
    const enabled = this.loadEnabled(defaults.enabled);
    const threshold = this.loadThreshold(defaults.threshold);
    const hideEdgesDuringInteractionEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.HIDE_EDGES_DURING_INTERACTION_KEY,
      defaults.hideEdgesDuringInteractionEnabled
    );
    const adaptiveQualityEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.ADAPTIVE_QUALITY_KEY,
      defaults.adaptiveQualityEnabled
    );
    return { enabled, threshold, hideEdgesDuringInteractionEnabled, adaptiveQualityEnabled };
  }

  public saveEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.ENABLED_KEY, String(enabled));
  }

  public saveThreshold(threshold: number): void {
    const normalized = this.normalizeThreshold(threshold);
    this.setItem(MeshReductionSettingsStorage.THRESHOLD_KEY, String(normalized));
  }

  public saveHideEdgesDuringInteractionEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.HIDE_EDGES_DURING_INTERACTION_KEY, String(enabled));
  }

  public saveAdaptiveQualityEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.ADAPTIVE_QUALITY_KEY, String(enabled));
  }

  private loadEnabled(fallback: boolean): boolean {
    return this.loadBoolean(MeshReductionSettingsStorage.ENABLED_KEY, fallback);
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

  private loadBoolean(key: string, fallback: boolean): boolean {
    const raw = this.getItem(key);
    if (raw === 'true') {
      return true;
    }
    if (raw === 'false') {
      return false;
    }
    return fallback;
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
