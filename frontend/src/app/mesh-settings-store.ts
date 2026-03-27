import {
  normalizeCameraZoomMaxDistance,
  normalizeCameraZoomMinDistance,
  normalizeMeshReductionThreshold,
} from '../utils/maze-normalizers';

export interface MeshReductionSettings {
  enabled: boolean;
  threshold: number;
  hideEdgesDuringInteractionEnabled: boolean;
  floorGridEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  allowMultipleMazePopupPanels: boolean;
  toolbarTooltipsEnabled: boolean;
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
  private static readonly ALLOW_MULTIPLE_MAZE_POPUP_PANELS_KEY =
    'maze_solver_3d_allow_multiple_maze_popup_panels';
  private static readonly TOOLBAR_TOOLTIPS_ENABLED_KEY = 'maze_solver_3d_toolbar_tooltips_enabled';
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
    const allowMultipleMazePopupPanels = this.loadBoolean(
      MeshReductionSettingsStorage.ALLOW_MULTIPLE_MAZE_POPUP_PANELS_KEY,
      defaults.allowMultipleMazePopupPanels
    );
    const toolbarTooltipsEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.TOOLBAR_TOOLTIPS_ENABLED_KEY,
      defaults.toolbarTooltipsEnabled
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
      allowMultipleMazePopupPanels,
      toolbarTooltipsEnabled,
      cameraZoomLimitEnabled,
      cameraZoomMinDistance,
      cameraZoomMaxDistance,
    };
  }

  public saveEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.ENABLED_KEY, String(enabled));
  }

  public saveThreshold(threshold: number): void {
    const normalized = normalizeMeshReductionThreshold(threshold);
    this.setItem(MeshReductionSettingsStorage.THRESHOLD_KEY, String(normalized));
  }

  public saveHideEdgesDuringInteractionEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.HIDE_EDGES_DURING_INTERACTION_KEY, String(enabled));
  }

  public saveAdaptiveQualityEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.ADAPTIVE_QUALITY_KEY, String(enabled));
  }

  public saveAllowMultipleMazePopupPanels(enabled: boolean): void {
    this.setItem(
      MeshReductionSettingsStorage.ALLOW_MULTIPLE_MAZE_POPUP_PANELS_KEY,
      String(enabled)
    );
  }

  public saveToolbarTooltipsEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.TOOLBAR_TOOLTIPS_ENABLED_KEY, String(enabled));
  }

  public saveFloorGridEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.FLOOR_GRID_ENABLED_KEY, String(enabled));
  }

  public saveCameraZoomLimitEnabled(enabled: boolean): void {
    this.setItem(MeshReductionSettingsStorage.CAMERA_ZOOM_LIMIT_ENABLED_KEY, String(enabled));
  }

  public saveCameraZoomMinDistance(distance: number): void {
    const normalized = normalizeCameraZoomMinDistance(distance);
    this.setItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MIN_DISTANCE_KEY, String(normalized));
  }

  public saveCameraZoomMaxDistance(distance: number): void {
    const normalized = normalizeCameraZoomMaxDistance(distance);
    this.setItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MAX_DISTANCE_KEY, String(normalized));
  }

  private loadEnabled(fallback: boolean): boolean {
    return this.loadBoolean(MeshReductionSettingsStorage.ENABLED_KEY, fallback);
  }

  private loadThreshold(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.THRESHOLD_KEY);
    if (!raw) {
      return normalizeMeshReductionThreshold(fallback);
    }

    const parsed = Number(raw);
    return normalizeMeshReductionThreshold(parsed, fallback);
  }

  private loadCameraZoomMinDistance(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MIN_DISTANCE_KEY);
    if (!raw) {
      return normalizeCameraZoomMinDistance(fallback);
    }
    const parsed = Number(raw);
    return normalizeCameraZoomMinDistance(parsed);
  }

  private loadCameraZoomMaxDistance(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.CAMERA_ZOOM_MAX_DISTANCE_KEY);
    if (!raw) {
      return normalizeCameraZoomMaxDistance(fallback);
    }
    const parsed = Number(raw);
    return normalizeCameraZoomMaxDistance(parsed);
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
