import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../constants/maze';

export interface MeshReductionSettings {
  enabled: boolean;
  threshold: number;
  hideEdgesDuringInteractionEnabled: boolean;
  floorGridEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  cameraZoomLimitEnabled: boolean;
  cameraZoomMinDistance: number;
  cameraZoomMaxDistance: number;
}

export class MeshReductionSettingsStorage {
  private static readonly ENABLED_KEY = 'maze_solver_3d_mesh_reduction_enabled';
  private static readonly THRESHOLD_KEY = 'maze_solver_3d_mesh_reduction_threshold';
  private static readonly HIDE_EDGES_DURING_INTERACTION_KEY =
    'maze_solver_3d_hide_edges_during_interaction';
  private static readonly FLOOR_GRID_ENABLED_KEY = 'maze_solver_3d_floor_grid_enabled';
  private static readonly ADAPTIVE_QUALITY_KEY = 'maze_solver_3d_adaptive_quality';
  private static readonly CAMERA_ZOOM_LIMIT_ENABLED_KEY =
    'maze_solver_3d_camera_zoom_limit_enabled';
  private static readonly CAMERA_ZOOM_MIN_DISTANCE_KEY = 'maze_solver_3d_camera_zoom_min_distance';
  private static readonly CAMERA_ZOOM_MAX_DISTANCE_KEY = 'maze_solver_3d_camera_zoom_max_distance';

  public load(defaults: MeshReductionSettings): MeshReductionSettings {
    const enabled = this.loadEnabled(defaults.enabled);
    const threshold = this.loadThreshold(defaults.threshold);
    const hideEdgesDuringInteractionEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.HIDE_EDGES_DURING_INTERACTION_KEY,
      defaults.hideEdgesDuringInteractionEnabled
    );
    const floorGridEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.FLOOR_GRID_ENABLED_KEY,
      defaults.floorGridEnabled
    );
    const adaptiveQualityEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.ADAPTIVE_QUALITY_KEY,
      defaults.adaptiveQualityEnabled
    );
    const cameraZoomLimitEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.CAMERA_ZOOM_LIMIT_ENABLED_KEY,
      defaults.cameraZoomLimitEnabled
    );
    const loadedMin = this.loadCameraZoomMinDistance(defaults.cameraZoomMinDistance);
    const loadedMax = this.loadCameraZoomMaxDistance(defaults.cameraZoomMaxDistance);
    const cameraZoomMinDistance = Math.min(loadedMin, loadedMax);
    const cameraZoomMaxDistance = Math.max(loadedMin, loadedMax);
    return {
      enabled,
      threshold,
      hideEdgesDuringInteractionEnabled,
      floorGridEnabled,
      adaptiveQualityEnabled,
      cameraZoomLimitEnabled,
      cameraZoomMinDistance,
      cameraZoomMaxDistance,
    };
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

  public saveFloorGridEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.FLOOR_GRID_ENABLED_KEY, String(enabled));
  }

  public saveCameraZoomLimitEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.CAMERA_ZOOM_LIMIT_ENABLED_KEY, String(enabled));
  }

  public saveCameraZoomMinDistance(distance: number): void {
    const normalized = this.normalizeCameraZoomMinDistance(distance);
    this.setItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MIN_DISTANCE_KEY, String(normalized));
  }

  public saveCameraZoomMaxDistance(distance: number): void {
    const normalized = this.normalizeCameraZoomMaxDistance(distance);
    this.setItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MAX_DISTANCE_KEY, String(normalized));
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

  private loadCameraZoomMinDistance(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MIN_DISTANCE_KEY);
    if (!raw) {
      return this.normalizeCameraZoomMinDistance(fallback);
    }
    const parsed = Number(raw);
    return this.normalizeCameraZoomMinDistance(parsed);
  }

  private loadCameraZoomMaxDistance(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MAX_DISTANCE_KEY);
    if (!raw) {
      return this.normalizeCameraZoomMaxDistance(fallback);
    }
    const parsed = Number(raw);
    return this.normalizeCameraZoomMaxDistance(parsed);
  }

  private normalizeCameraZoomMinDistance(value: number): number {
    if (!Number.isFinite(value)) {
      return CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
    }
    return Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value);
  }

  private normalizeCameraZoomMaxDistance(value: number): number {
    if (!Number.isFinite(value)) {
      return CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;
    }
    const min = CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN;
    const clamped = Math.max(min, value);
    return Math.min(CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX, clamped);
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
