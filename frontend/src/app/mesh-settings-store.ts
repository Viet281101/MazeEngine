import {
  normalizeCameraZoomMaxDistance,
  normalizeCameraZoomMinDistance,
  normalizeMeshReductionThreshold,
  normalizeSolutionPathLineWidth,
} from '../utils/maze-normalizers';
import {
  isActionBarOrientation,
  normalizeActionBarScale,
  type ActionBarOrientation,
} from '../utils/actionbar-state';

export interface MeshReductionSettings {
  enabled: boolean;
  threshold: number;
  hideEdgesDuringInteractionEnabled: boolean;
  floorGridEnabled: boolean;
  adaptiveQualityEnabled: boolean;
  allowMultipleMazePopupPanels: boolean;
  toolbarTooltipsEnabled: boolean;
  actionBarVisible: boolean;
  actionBarStatePersistenceEnabled: boolean;
  actionBarOrientation: ActionBarOrientation;
  actionBarScale: number;
  actionBarPosition: { x: number; y: number } | null;
  solutionPathLineWidth: number;
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
  private static readonly ACTION_BAR_VISIBLE_KEY = 'maze_solver_3d_action_bar_visible';
  private static readonly ACTION_BAR_STATE_PERSISTENCE_ENABLED_KEY =
    'maze_solver_3d_action_bar_state_persistence_enabled';
  private static readonly ACTION_BAR_ORIENTATION_KEY = 'maze_solver_3d_action_bar_orientation';
  private static readonly ACTION_BAR_SCALE_KEY = 'maze_solver_3d_action_bar_scale';
  private static readonly ACTION_BAR_POSITION_X_KEY = 'maze_solver_3d_action_bar_position_x';
  private static readonly ACTION_BAR_POSITION_Y_KEY = 'maze_solver_3d_action_bar_position_y';
  private static readonly ACTION_BAR_HAS_CUSTOM_POSITION_KEY =
    'maze_solver_3d_action_bar_has_custom_position';
  private static readonly SOLUTION_PATH_LINE_WIDTH_KEY = 'maze_solver_3d_solution_path_line_width';
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
    const actionBarVisible = this.loadBoolean(
      MeshReductionSettingsStorage.ACTION_BAR_VISIBLE_KEY,
      defaults.actionBarVisible
    );
    const actionBarStatePersistenceEnabled = this.loadBoolean(
      MeshReductionSettingsStorage.ACTION_BAR_STATE_PERSISTENCE_ENABLED_KEY,
      defaults.actionBarStatePersistenceEnabled
    );
    const actionBarOrientation = actionBarStatePersistenceEnabled
      ? this.loadActionBarOrientation(defaults.actionBarOrientation)
      : defaults.actionBarOrientation;
    const actionBarScale = actionBarStatePersistenceEnabled
      ? this.loadActionBarScale(defaults.actionBarScale)
      : defaults.actionBarScale;
    const actionBarPosition = actionBarStatePersistenceEnabled
      ? this.loadActionBarPosition(defaults.actionBarPosition)
      : defaults.actionBarPosition;
    const solutionPathLineWidth = this.loadSolutionPathLineWidth(defaults.solutionPathLineWidth);
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
      actionBarVisible,
      actionBarStatePersistenceEnabled,
      actionBarOrientation,
      actionBarScale,
      actionBarPosition,
      solutionPathLineWidth,
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

  public saveActionBarVisible(visible: boolean): void {
    this.setItem(MeshReductionSettingsStorage.ACTION_BAR_VISIBLE_KEY, String(visible));
  }

  public saveActionBarStatePersistenceEnabled(enabled: boolean): void {
    this.setItem(
      MeshReductionSettingsStorage.ACTION_BAR_STATE_PERSISTENCE_ENABLED_KEY,
      String(enabled)
    );
  }

  public saveActionBarOrientation(orientation: ActionBarOrientation): void {
    this.setItem(MeshReductionSettingsStorage.ACTION_BAR_ORIENTATION_KEY, orientation);
  }

  public saveActionBarScale(scale: number): void {
    const normalized = normalizeActionBarScale(scale);
    this.setItem(MeshReductionSettingsStorage.ACTION_BAR_SCALE_KEY, String(normalized));
  }

  public saveActionBarPosition(position: { x: number; y: number } | null): void {
    this.setItem(
      MeshReductionSettingsStorage.ACTION_BAR_HAS_CUSTOM_POSITION_KEY,
      String(Boolean(position))
    );
    if (!position) {
      return;
    }
    this.setItem(
      MeshReductionSettingsStorage.ACTION_BAR_POSITION_X_KEY,
      String(Math.round(position.x))
    );
    this.setItem(
      MeshReductionSettingsStorage.ACTION_BAR_POSITION_Y_KEY,
      String(Math.round(position.y))
    );
  }

  public saveSolutionPathLineWidth(width: number): void {
    const normalized = normalizeSolutionPathLineWidth(width);
    this.setItem(MeshReductionSettingsStorage.SOLUTION_PATH_LINE_WIDTH_KEY, String(normalized));
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

  private loadSolutionPathLineWidth(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.SOLUTION_PATH_LINE_WIDTH_KEY);
    if (!raw) {
      return normalizeSolutionPathLineWidth(fallback);
    }
    const parsed = Number(raw);
    return normalizeSolutionPathLineWidth(parsed, fallback);
  }

  private loadActionBarOrientation(fallback: ActionBarOrientation): ActionBarOrientation {
    const raw = this.getItem(MeshReductionSettingsStorage.ACTION_BAR_ORIENTATION_KEY);
    return isActionBarOrientation(raw) ? raw : fallback;
  }

  private loadActionBarScale(fallback: number): number {
    const raw = this.getItem(MeshReductionSettingsStorage.ACTION_BAR_SCALE_KEY);
    if (!raw) {
      return normalizeActionBarScale(fallback);
    }
    return normalizeActionBarScale(Number(raw));
  }

  private loadActionBarPosition(
    fallback: { x: number; y: number } | null
  ): { x: number; y: number } | null {
    const hasCustomPosition = this.loadBoolean(
      MeshReductionSettingsStorage.ACTION_BAR_HAS_CUSTOM_POSITION_KEY,
      Boolean(fallback)
    );
    if (!hasCustomPosition) {
      return null;
    }

    const rawX = this.getItem(MeshReductionSettingsStorage.ACTION_BAR_POSITION_X_KEY);
    const rawY = this.getItem(MeshReductionSettingsStorage.ACTION_BAR_POSITION_Y_KEY);
    const parsedX = Number(rawX);
    const parsedY = Number(rawY);
    const hasValidX = Number.isFinite(parsedX);
    const hasValidY = Number.isFinite(parsedY);
    if (hasValidX && hasValidY) {
      return { x: parsedX, y: parsedY };
    }
    return fallback;
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
