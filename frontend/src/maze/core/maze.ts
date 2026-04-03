import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { ResourceManager } from '../../resources/resource-manager';
import { DisposalHelper } from '../../resources/disposal-helper';
import { MeshFactory } from '../../resources/mesh-factory';
import { MAZE_RENDER_TIMING, SOLUTION_PATH_LINE_WIDTH } from '../../constants/maze';
import type { MarkerPoint, SolutionPath } from '../../types/maze';
import {
  clearInitialQualityUpgradeTimerApi,
  clearInteractionRestoreTimerApi,
  destroyMazeLifecycleApi,
  handleInteractionEndApi,
  handleInteractionStartApi,
  initMazeLifecycleApi,
  requestRenderApi,
  scheduleInitialQualityUpgradeApi,
  stopAnimationApi,
} from './api';
import { MazeSettingsService, shouldMergeWallsForMeshSettings } from './settings';
import {
  computeLayerMetrics,
  createFeatureDefaults,
  createVisualDefaults,
  resolveGeometryDefaults,
} from './model';
import type { CameraState, MazeCenter, MazeConfig, RenderQualityInfo } from './model';
import {
  attachWebGLContextLifecycle,
  createRenderLoopRuntime,
  detachWebGLContextLifecycle,
  disposeMazeLayers,
  clearSolutionPathLine,
  type RenderLoopRuntime,
  upsertSolutionPathLine,
} from './lifecycle';
import {
  applyRendererSizeForRuntime,
  configureCameraZoomLimitsForControls,
  createRenderSizeRuntime,
  applyBackgroundColor,
  applyCameraState,
  readCameraState,
  type RenderSizeRuntime,
} from './view';
import {
  createAdaptiveQualityRuntime,
  clearEdgeVisibilityRuntime,
  createEdgeVisibilityRuntime,
  createInteractionRuntime,
  hasEdgeObjects,
  rebuildEdgeVisibilityRuntime,
  refreshEdgeVisibilityRuntime,
  resetAdaptiveQualityRuntime,
  setEdgeObjectsVisibility,
  updateAdaptiveQualityRuntime,
  type AdaptiveQualityRuntime,
  type EdgeVisibilityRuntime,
  type InteractionRuntime,
} from './runtime';
import {
  createFloorGridOverlay as createFloorGridOverlayMesh,
  setSolutionPathLineWidth as setSolutionPathLineWidthForRender,
  updateSolutionPathLineResolution,
} from '../rendering';
import { buildMainFloorForLayer, buildWallsForLayer } from '../builders';

/**
 * Base Maze Class - Manages Three.js scene and rendering
 * Refactored with proper memory management
 */
export abstract class Maze {
  // Three.js core
  protected canvas: HTMLCanvasElement;
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected renderer: THREE.WebGLRenderer;
  protected controls: OrbitControls;

  // Maze data
  protected maze: number[][][];
  protected mazeLayers: THREE.Object3D[] = [];
  protected solutionPathLine: LineSegments2 | null = null;

  // Configuration
  protected wallHeight: number;
  protected wallThickness: number;
  protected cellSize: number;

  // Visual properties
  protected wallColor: THREE.Color;
  protected floorColor: THREE.Color;
  protected wallOpacity: number;
  protected floorOpacity: number;
  protected showEdges: boolean;
  protected showFloorGrid: boolean;
  protected meshReductionEnabled: boolean;
  protected meshMergeThreshold: number;
  protected cameraZoomLimitEnabled: boolean;
  protected cameraZoomMinDistance: number;
  protected cameraZoomMaxDistance: number;
  protected solutionPathLineWidth: number = SOLUTION_PATH_LINE_WIDTH.DEFAULT;

  // Resource management
  protected resourceManager: ResourceManager;
  protected meshFactory: MeshFactory;

  // Animation control
  private renderLoopRuntime: RenderLoopRuntime = createRenderLoopRuntime();
  private isDisposed: boolean = false;
  private preserveCameraOnRebuild: boolean = false;
  private interactionRuntime: InteractionRuntime = createInteractionRuntime();
  private renderListeners: Set<() => void> = new Set();
  private edgeVisibilityRuntime: EdgeVisibilityRuntime = createEdgeVisibilityRuntime();
  private hideEdgesDuringInteractionEnabled: boolean = false;
  private adaptiveQualityEnabled: boolean = true;
  private renderSizeRuntime: RenderSizeRuntime = createRenderSizeRuntime();
  private adaptiveQualityRuntime: AdaptiveQualityRuntime = createAdaptiveQualityRuntime();
  private backgroundColor: THREE.Color = new THREE.Color(0x000000);
  private backgroundAlpha: number = 1;
  private settingsService: MazeSettingsService;
  private cachedCenter: MazeCenter | null = null;
  private readonly handleContextLost: (event: Event) => void;
  private readonly handleContextRestored: () => void;

  constructor(canvas: HTMLCanvasElement, maze: number[][][], config: MazeConfig = {}) {
    this.canvas = canvas;
    this.maze = maze;

    const geometryDefaults = resolveGeometryDefaults(config);
    this.wallHeight = geometryDefaults.wallHeight;
    this.wallThickness = geometryDefaults.wallThickness;
    this.cellSize = geometryDefaults.cellSize;

    const visualDefaults = createVisualDefaults();
    this.wallColor = visualDefaults.wallColor;
    this.floorColor = visualDefaults.floorColor;
    this.wallOpacity = visualDefaults.wallOpacity;
    this.floorOpacity = visualDefaults.floorOpacity;
    this.showEdges = visualDefaults.showEdges;
    this.showFloorGrid = visualDefaults.showFloorGrid;

    const featureDefaults = createFeatureDefaults();
    this.meshReductionEnabled = featureDefaults.meshReductionEnabled;
    this.meshMergeThreshold = featureDefaults.meshMergeThreshold;
    this.cameraZoomLimitEnabled = featureDefaults.cameraZoomLimitEnabled;
    this.cameraZoomMinDistance = featureDefaults.cameraZoomMinDistance;
    this.cameraZoomMaxDistance = featureDefaults.cameraZoomMaxDistance;

    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.getClearColor(this.backgroundColor);
    this.backgroundAlpha = this.renderer.getClearAlpha();
    this.handleContextLost = event => {
      event.preventDefault();
      this.stopAnimation();
      this.renderLoopRuntime.isRendering = false;
      this.renderLoopRuntime.needsRender = true;
    };
    this.handleContextRestored = () => {
      this.renderer.setClearColor(this.backgroundColor, this.backgroundAlpha);
      this.resetAdaptiveQualityMetrics();
      this.applyRendererSizeForMode(this.interactionRuntime.currentInteractionMode);
      this.requestRender();
    };
    attachWebGLContextLifecycle(this.renderer.domElement, {
      onLost: this.handleContextLost,
      onRestored: this.handleContextRestored,
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Initialize resource managers
    this.resourceManager = new ResourceManager();
    this.meshFactory = new MeshFactory(
      this.resourceManager,
      this.wallColor,
      this.floorColor,
      this.wallOpacity,
      this.floorOpacity,
      this.showEdges,
      this.showFloorGrid
    );
    this.settingsService = new MazeSettingsService({
      wallColor: this.wallColor,
      floorColor: this.floorColor,
      meshFactory: this.meshFactory,
      resourceManager: this.resourceManager,
      getMaze: () => this.maze,
      getWallOpacity: () => this.wallOpacity,
      setWallOpacity: value => {
        this.wallOpacity = value;
      },
      getFloorOpacity: () => this.floorOpacity,
      setFloorOpacity: value => {
        this.floorOpacity = value;
      },
      getShowEdges: () => this.showEdges,
      setShowEdges: value => {
        this.showEdges = value;
      },
      getShowFloorGrid: () => this.showFloorGrid,
      setShowFloorGrid: value => {
        this.showFloorGrid = value;
      },
      getMeshReductionEnabled: () => this.meshReductionEnabled,
      setMeshReductionEnabled: value => {
        this.meshReductionEnabled = value;
      },
      getMeshMergeThreshold: () => this.meshMergeThreshold,
      setMeshMergeThreshold: value => {
        this.meshMergeThreshold = value;
      },
      getHideEdgesDuringInteractionEnabled: () => this.hideEdgesDuringInteractionEnabled,
      setHideEdgesDuringInteractionEnabled: value => {
        this.hideEdgesDuringInteractionEnabled = value;
      },
      getEdgesTemporarilyHidden: () => this.interactionRuntime.edgesTemporarilyHidden,
      setEdgesTemporarilyHidden: value => {
        this.interactionRuntime.edgesTemporarilyHidden = value;
      },
      getCurrentInteractionMode: () => this.interactionRuntime.currentInteractionMode,
      hasEdgeObjects: () => hasEdgeObjects(this.edgeVisibilityRuntime),
      getAdaptiveQualityEnabled: () => this.adaptiveQualityEnabled,
      setAdaptiveQualityEnabled: value => {
        this.adaptiveQualityEnabled = value;
      },
      getCameraZoomLimitEnabled: () => this.cameraZoomLimitEnabled,
      setCameraZoomLimitEnabled: value => {
        this.cameraZoomLimitEnabled = value;
      },
      getCameraZoomMinDistance: () => this.cameraZoomMinDistance,
      setCameraZoomMinDistance: value => {
        this.cameraZoomMinDistance = value;
      },
      getCameraZoomMaxDistance: () => this.cameraZoomMaxDistance,
      setCameraZoomMaxDistance: value => {
        this.cameraZoomMaxDistance = value;
      },
      updateMeshFactorySettings: settings => {
        this.meshFactory.updateSettings(settings);
      },
      rebuildEdges: () => this.rebuildEdges(),
      setEdgeVisibility: visible => this.setEdgeVisibility(visible),
      rebuildMazePreservingCamera: () => this.rebuildMazePreservingCamera(),
      resetAdaptiveQualityMetrics: () => this.resetAdaptiveQualityMetrics(),
      applyRendererSizeForCurrentMode: () =>
        this.applyRendererSizeForMode(this.interactionRuntime.currentInteractionMode),
      configureCameraZoomLimits: () => this.configureCameraZoomLimits(),
      updateControls: () => this.controls.update(),
      requestRender: () => this.requestRender(),
    });

    this.init();
  }

  /**
   * Initialize renderer and start animation loop
   */
  protected init(): void {
    initMazeLifecycleApi({
      controls: this.controls,
      applyRendererSizeForMode: isInteraction => this.applyRendererSizeForMode(isInteraction),
      scheduleInitialQualityUpgrade: () => this.scheduleInitialQualityUpgrade(),
      configureCameraZoomLimits: () => this.configureCameraZoomLimits(),
      requestRender: () => this.requestRender(),
      handleInteractionStart: () => this.handleInteractionStart(),
      handleInteractionEnd: () => this.handleInteractionEnd(),
      createMaze: () => this.createMaze(),
      refreshEdgeVisibilityRuntime: () => this.refreshEdgeVisibilityRuntime(),
    });
  }

  /**
   * Abstract method - must implement in subclass
   */
  protected abstract createMaze(): void;

  /**
   * Update maze data and rebuild geometry without recreating renderer/controls
   */
  public updateMazeData(maze: number[][][], options: { preserveCamera?: boolean } = {}): void {
    if (this.isDisposed) return;
    this.maze = maze;
    this.cachedCenter = null;
    this.configureCameraZoomLimits();
    this.clearSolutionPath();
    if (options.preserveCamera) {
      this.rebuildMazePreservingCamera();
      return;
    }
    this.createMaze();
    this.refreshEdgeVisibilityRuntime();
    this.requestRender();
  }

  /**
   * Position camera to view entire maze
   */
  protected positionCamera(centerX: number, centerZ: number, distance: number): void {
    if (this.preserveCameraOnRebuild) {
      return;
    }
    this.camera.position.set(centerX, 10, distance);
    this.controls.target.set(centerX, 0, centerZ);
    this.controls.update();
    this.controls.saveState();
  }

  /**
   * Request a render on the next animation frame
   */
  public requestRender(): void {
    requestRenderApi({
      isDisposed: () => this.isDisposed,
      renderLoopRuntime: this.renderLoopRuntime,
      controls: this.controls,
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      updateAdaptiveQuality: nowMs => this.updateAdaptiveQuality(nowMs),
      notifyRenderListeners: () => this.renderListeners.forEach(listener => listener()),
      requestRender: () => this.requestRender(),
    });
  }

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    stopAnimationApi(this.renderLoopRuntime);
  }

  /**
   * Resize handler
   */
  public resize(): void {
    if (this.isDisposed) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.resetAdaptiveQualityMetrics();
    this.applyRendererSizeForMode(this.interactionRuntime.currentInteractionMode);
    if (this.solutionPathLine) {
      updateSolutionPathLineResolution(
        this.solutionPathLine,
        this.canvas.clientWidth,
        this.canvas.clientHeight
      );
    }
    this.requestRender();
  }

  /**
   * Delete maze layers while keeping the scene
   */
  public deleteMaze(): void {
    this.clearSolutionPath();
    disposeMazeLayers(this.scene, this.mazeLayers);
    this.mazeLayers = [];
    this.edgeVisibilityRuntime = clearEdgeVisibilityRuntime(this.edgeVisibilityRuntime);
    this.interactionRuntime.edgesTemporarilyHidden = false;
  }

  /**
   * Destroy entire maze instance
   */
  public destroy(): void {
    destroyMazeLifecycleApi({
      isDisposed: () => this.isDisposed,
      setDisposed: value => {
        this.isDisposed = value;
      },
      stopAnimation: () => this.stopAnimation(),
      clearInteractionRestoreTimer: () => this.clearInteractionRestoreTimer(),
      clearInitialQualityUpgradeTimer: () => this.clearInitialQualityUpgradeTimer(),
      detachWebGLContextLifecycle: () =>
        detachWebGLContextLifecycle(this.renderer.domElement, {
          onLost: this.handleContextLost,
          onRestored: this.handleContextRestored,
        }),
      deleteMaze: () => this.deleteMaze(),
      disposeControls: () => this.controls.dispose(),
      disposeResourceManager: () => this.resourceManager.dispose(),
      disposeScene: () => DisposalHelper.disposeScene(this.scene),
      disposeRenderer: () => this.renderer.dispose(),
    });
  }

  // ========== PUBLIC API ==========

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getMazeData(): number[][][] {
    return this.maze.map(layer => layer.map(row => row.slice()));
  }

  /**
   * Internal fast path that returns the current maze data by reference.
   * Do not mutate the returned value outside controlled update flows.
   */
  public getMazeDataRef(): number[][][] {
    return this.maze;
  }

  public getMazeLayerCount(): number {
    return this.maze.length;
  }

  public getCameraState(): CameraState {
    return readCameraState(this.camera, this.controls);
  }

  public setCameraOrbitEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  public pickCellFromClientPoint(
    clientX: number,
    clientY: number,
    layerIndex: number = 0
  ): MarkerPoint | null {
    const layer = this.maze[layerIndex];
    if (!layer || layer.length === 0 || (layer[0]?.length ?? 0) === 0) {
      return null;
    }

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);

    const planeHeight = this.getLayerBaseY(layerIndex);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeHeight);
    const hitPoint = new THREE.Vector3();
    const hasHit = raycaster.ray.intersectPlane(plane, hitPoint);
    if (!hasHit) {
      return null;
    }

    const col = Math.round(hitPoint.x / this.cellSize);
    const row = Math.round(-hitPoint.z / this.cellSize);
    if (row < 0 || row >= layer.length) {
      return null;
    }
    if (col < 0 || col >= (layer[row]?.length ?? 0)) {
      return null;
    }

    return { row, col, layerIndex };
  }

  public getMazeCenter(): MazeCenter {
    if (this.cachedCenter) {
      return this.cachedCenter;
    }
    const metrics = computeLayerMetrics(this.maze[0], this.cellSize);
    return (this.cachedCenter = metrics?.center ?? { x: 0, z: 0 });
  }

  public getRenderQualityInfo(): RenderQualityInfo {
    return {
      pixelRatio: this.renderSizeRuntime.pixelRatio,
      adaptiveScale: this.adaptiveQualityRuntime.adaptiveQualityScale,
      adaptiveEnabled: this.adaptiveQualityEnabled,
    };
  }

  public setCameraState(state: CameraState): void {
    applyCameraState(this.camera, this.controls, state);
    this.requestRender();
  }

  private createInteractionApiContext() {
    return {
      interactionRuntime: this.interactionRuntime,
      isDisposed: () => this.isDisposed,
      getShowEdges: () => this.showEdges,
      hideEdgesDuringInteractionEnabled: this.hideEdgesDuringInteractionEnabled,
      hasEdgeObjects: () => hasEdgeObjects(this.edgeVisibilityRuntime),
      setEdgeVisibility: (visible: boolean) => this.setEdgeVisibility(visible),
      applyRendererSizeForMode: (isInteraction: boolean) =>
        this.applyRendererSizeForMode(isInteraction),
      requestRender: () => this.requestRender(),
    };
  }

  public updateWallColor(color: string): void {
    this.settingsService.updateWallColor(color);
  }

  public updateFloorColor(color: string): void {
    this.settingsService.updateFloorColor(color);
  }

  public updateWallOpacity(opacity: number): void {
    this.settingsService.updateWallOpacity(opacity);
  }

  public updateFloorOpacity(opacity: number): void {
    this.settingsService.updateFloorOpacity(opacity);
  }

  public toggleEdges(showEdges: boolean): void {
    this.settingsService.toggleEdges(showEdges);
  }

  public setFloorGridEnabled(enabled: boolean): void {
    this.settingsService.setFloorGridEnabled(enabled);
  }

  public isFloorGridEnabled(): boolean {
    return this.showFloorGrid;
  }

  public setMeshReductionEnabled(enabled: boolean): void {
    this.settingsService.setMeshReductionEnabled(enabled);
  }

  public isMeshReductionEnabled(): boolean {
    return this.meshReductionEnabled;
  }

  public setMeshMergeThreshold(threshold: number): void {
    this.settingsService.setMeshMergeThreshold(threshold);
  }

  public getMeshMergeThreshold(): number {
    return this.meshMergeThreshold;
  }

  protected getLayerBaseY(layerIndex: number): number {
    return layerIndex * this.wallHeight;
  }

  protected shouldMergeWalls(rows: number, cols: number): boolean {
    return shouldMergeWallsForMeshSettings(
      rows,
      cols,
      this.meshReductionEnabled,
      this.meshMergeThreshold
    );
  }

  protected createWallsForLayer(
    layer: number[][],
    layerHeight: number,
    mazeLayer: THREE.Object3D
  ): void {
    const rowCount = layer.length;
    const colCount = layer[0]?.length ?? 0;
    buildWallsForLayer({
      layer,
      layerHeight,
      mazeLayer,
      shouldMerge: this.shouldMergeWalls(rowCount, colCount),
      cellSize: this.cellSize,
      wallHeight: this.wallHeight,
      wallThickness: this.wallThickness,
      meshFactory: this.meshFactory,
    });
  }

  protected createMainFloorForLayer(
    layer: number[][],
    mazeLayer: THREE.Object3D,
    floorTopY: number = 0
  ): void {
    buildMainFloorForLayer({
      layer,
      mazeLayer,
      floorTopY,
      cellSize: this.cellSize,
      meshFactory: this.meshFactory,
      createGridOverlay: (rows, cols, y) => this.createFloorGridOverlay(rows, cols, y),
    });
  }

  public addRenderListener(listener: () => void): void {
    this.renderListeners.add(listener);
  }

  public removeRenderListener(listener: () => void): void {
    this.renderListeners.delete(listener);
  }

  public setHideEdgesDuringInteractionEnabled(enabled: boolean): void {
    this.settingsService.setHideEdgesDuringInteractionEnabled(enabled);
  }

  public isHideEdgesDuringInteractionEnabled(): boolean {
    return this.hideEdgesDuringInteractionEnabled;
  }

  public setAdaptiveQualityEnabled(enabled: boolean): void {
    this.settingsService.setAdaptiveQualityEnabled(enabled);
  }

  public isAdaptiveQualityEnabled(): boolean {
    return this.adaptiveQualityEnabled;
  }

  public setCameraZoomLimitEnabled(enabled: boolean): void {
    this.settingsService.setCameraZoomLimitEnabled(enabled);
  }

  public isCameraZoomLimitEnabled(): boolean {
    return this.cameraZoomLimitEnabled;
  }

  public setCameraZoomMinDistance(distance: number): void {
    this.settingsService.setCameraZoomMinDistance(distance);
  }

  public getCameraZoomMinDistance(): number {
    return this.cameraZoomMinDistance;
  }

  public setCameraZoomMaxDistance(distance: number): void {
    this.settingsService.setCameraZoomMaxDistance(distance);
  }

  public getCameraZoomMaxDistance(): number {
    return this.cameraZoomMaxDistance;
  }

  public setBackgroundColor(color: THREE.ColorRepresentation, alpha: number = 1): void {
    const next = applyBackgroundColor(
      this.renderer,
      this.backgroundColor,
      this.backgroundAlpha,
      color,
      alpha
    );
    if (!next.changed) {
      return;
    }
    this.backgroundAlpha = next.alpha;
    this.requestRender();
  }

  public setSolutionPath(path: SolutionPath, layerIndex: number = 0): void {
    const next = upsertSolutionPathLine({
      scene: this.scene,
      currentLine: this.solutionPathLine,
      path,
      layerIndex,
      maze: this.maze,
      cellSize: this.cellSize,
      getLayerBaseY: index => this.getLayerBaseY(index),
      lineWidth: this.solutionPathLineWidth,
      viewportWidth: this.canvas.clientWidth,
      viewportHeight: this.canvas.clientHeight,
    });
    this.solutionPathLine = next.line;
    this.requestRender();
  }

  public setSolutionPathLineWidth(width: number): void {
    if (!Number.isFinite(width) || width <= 0) {
      return;
    }
    this.solutionPathLineWidth = width;
    if (this.solutionPathLine) {
      setSolutionPathLineWidthForRender(this.solutionPathLine, width);
    }
    this.requestRender();
  }

  public clearSolutionPath(): void {
    const hadLine = this.solutionPathLine !== null;
    this.solutionPathLine = clearSolutionPathLine(this.scene, this.solutionPathLine);
    if (hadLine) {
      this.requestRender();
    }
  }

  private rebuildMazePreservingCamera(): void {
    this.preserveCameraOnRebuild = true;
    try {
      this.createMaze();
    } finally {
      this.preserveCameraOnRebuild = false;
    }
    this.refreshEdgeVisibilityRuntime();
    this.requestRender();
  }

  private handleInteractionStart(): void {
    handleInteractionStartApi(this.createInteractionApiContext());
  }

  private handleInteractionEnd(): void {
    handleInteractionEndApi(
      this.createInteractionApiContext(),
      MAZE_RENDER_TIMING.INTERACTION_END_DELAY_MS
    );
  }

  private clearInteractionRestoreTimer(): void {
    clearInteractionRestoreTimerApi(this.createInteractionApiContext());
  }

  private scheduleInitialQualityUpgrade(): void {
    scheduleInitialQualityUpgradeApi(
      this.createInteractionApiContext(),
      MAZE_RENDER_TIMING.INITIAL_QUALITY_UPGRADE_DELAY_MS
    );
  }

  private configureCameraZoomLimits(): void {
    const range = configureCameraZoomLimitsForControls({
      controls: this.controls,
      enabled: this.cameraZoomLimitEnabled,
      minDistance: this.cameraZoomMinDistance,
      maxDistance: this.cameraZoomMaxDistance,
    });
    this.cameraZoomMinDistance = range.minDistance;
    this.cameraZoomMaxDistance = range.maxDistance;
  }

  private updateAdaptiveQuality(nowMs: number): void {
    const next = updateAdaptiveQualityRuntime(
      this.adaptiveQualityRuntime,
      this.adaptiveQualityEnabled,
      nowMs
    );
    this.adaptiveQualityRuntime = next.runtime;

    if (next.shouldApplyRendererSize) {
      this.applyRendererSizeForMode(this.interactionRuntime.currentInteractionMode);
      this.renderLoopRuntime.needsRender = true;
    }
  }

  private resetAdaptiveQualityMetrics(): void {
    this.adaptiveQualityRuntime = resetAdaptiveQualityRuntime();
  }

  private clearInitialQualityUpgradeTimer(): void {
    clearInitialQualityUpgradeTimerApi(this.createInteractionApiContext());
  }

  /**
   * Rebuild edges on all maze layers
   */
  private rebuildEdges(): void {
    this.edgeVisibilityRuntime = rebuildEdgeVisibilityRuntime(
      this.edgeVisibilityRuntime,
      this.mazeLayers,
      this.showEdges,
      this.showFloorGrid,
      this.resourceManager
    );
    this.requestRender();
  }

  private refreshEdgeVisibilityRuntime(): void {
    this.edgeVisibilityRuntime = refreshEdgeVisibilityRuntime(
      this.edgeVisibilityRuntime,
      this.mazeLayers,
      this.showFloorGrid
    );
  }

  protected createFloorGridOverlay(
    rows: number,
    cols: number,
    floorTopY: number
  ): THREE.LineSegments | null {
    return createFloorGridOverlayMesh(rows, cols, this.cellSize, floorTopY, this.showFloorGrid);
  }

  private setEdgeVisibility(visible: boolean): void {
    setEdgeObjectsVisibility(this.edgeVisibilityRuntime, visible);
  }

  private applyRendererSizeForMode(isInteraction: boolean): void {
    this.interactionRuntime.currentInteractionMode = isInteraction;
    this.renderSizeRuntime = applyRendererSizeForRuntime({
      runtime: this.renderSizeRuntime,
      renderer: this.renderer,
      canvas: this.canvas,
      isInteraction,
      adaptiveEnabled: this.adaptiveQualityEnabled,
      adaptiveScale: this.adaptiveQualityRuntime.adaptiveQualityScale,
    });
  }
}
