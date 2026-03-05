import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ResourceManager } from '../resources/resource-manager';
import { DisposalHelper } from '../resources/disposal-helper';
import { MeshFactory } from '../resources/mesh-factory';
import { CAMERA_ZOOM_LIMIT, MESH_REDUCTION } from '../constants/maze';
import type { SolutionPath } from '../types/maze';

export interface MazeConfig {
  wallHeight?: number;
  wallThickness?: number;
  cellSize?: number;
}

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface MazeCenter {
  x: number;
  z: number;
}

interface RenderQualityInfo {
  pixelRatio: number;
  adaptiveScale: number;
  adaptiveEnabled: boolean;
}

/**
 * Base Maze Class - Manages Three.js scene and rendering
 * Refactored with proper memory management
 */
export abstract class Maze {
  private static readonly STABLE_PIXEL_RATIO_CAP = 1.25;
  private static readonly INTERACTION_PIXEL_RATIO_CAP = 0.85;
  private static readonly MIN_PIXEL_RATIO = 0.5;
  private static readonly INTERACTION_END_DELAY_MS = 120;
  private static readonly INITIAL_QUALITY_UPGRADE_DELAY_MS = 300;
  private static readonly ADAPTIVE_QUALITY_MIN_SCALE = 0.6;
  private static readonly ADAPTIVE_QUALITY_MAX_SCALE = 1.0;
  private static readonly ADAPTIVE_QUALITY_DECREASE_STEP = 0.08;
  private static readonly ADAPTIVE_QUALITY_INCREASE_STEP = 0.04;
  private static readonly ADAPTIVE_QUALITY_HIGH_FRAME_TIME_MS = 26;
  private static readonly ADAPTIVE_QUALITY_LOW_FRAME_TIME_MS = 16;
  private static readonly ADAPTIVE_QUALITY_UPDATE_COOLDOWN_MS = 280;
  private static readonly ADAPTIVE_QUALITY_EMA_ALPHA = 0.18;
  private static readonly FLOOR_GRID_Y_OFFSET = 0.001;

  // Three.js core
  protected canvas: HTMLCanvasElement;
  protected scene: THREE.Scene;
  protected camera: THREE.PerspectiveCamera;
  protected renderer: THREE.WebGLRenderer;
  protected controls: OrbitControls;

  // Maze data
  protected maze: number[][][];
  protected mazeLayers: THREE.Object3D[] = [];
  protected solutionPathLine: THREE.Line | null = null;

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

  // Resource management
  protected resourceManager: ResourceManager;
  protected meshFactory: MeshFactory;

  // Animation control
  private animationId: number | null = null;
  private needsRender: boolean = true;
  private isRendering: boolean = false;
  private isDisposed: boolean = false;
  private preserveCameraOnRebuild: boolean = false;
  private interactionRestoreTimer: number | null = null;
  private initialQualityUpgradeTimer: number | null = null;
  private currentInteractionMode: boolean = false;
  private renderListeners: Set<() => void> = new Set();
  private edgeObjects: THREE.LineSegments[] = [];
  private floorGridObjects: THREE.LineSegments[] = [];
  private edgesTemporarilyHidden: boolean = false;
  private hideEdgesDuringInteractionEnabled: boolean = false;
  private adaptiveQualityEnabled: boolean = true;
  private currentRenderWidth: number = 0;
  private currentRenderHeight: number = 0;
  private currentRenderPixelRatio: number = 0;
  private adaptiveQualityScale: number = Maze.ADAPTIVE_QUALITY_MAX_SCALE;
  private frameTimeEmaMs: number | null = null;
  private lastRenderTimestampMs: number | null = null;
  private lastAdaptiveAdjustmentMs: number = 0;
  private backgroundColor: THREE.Color = new THREE.Color(0x000000);
  private backgroundAlpha: number = 1;
  private readonly handleContextLost: (event: Event) => void;
  private readonly handleContextRestored: () => void;

  constructor(canvas: HTMLCanvasElement, maze: number[][][], config: MazeConfig = {}) {
    this.canvas = canvas;
    this.maze = maze;

    // Configuration defaults
    this.wallHeight = config.wallHeight ?? 1;
    this.wallThickness = config.wallThickness ?? 0.1;
    this.cellSize = config.cellSize ?? 1;

    // Visual defaults
    this.wallColor = new THREE.Color(0x808080);
    this.floorColor = new THREE.Color(0xc0c0c0);
    this.wallOpacity = 1.0;
    this.floorOpacity = 1.0;
    this.showEdges = true;
    this.showFloorGrid = false;
    this.meshReductionEnabled = MESH_REDUCTION.DEFAULT_ENABLED;
    this.meshMergeThreshold = MESH_REDUCTION.DEFAULT_THRESHOLD;
    this.cameraZoomLimitEnabled = CAMERA_ZOOM_LIMIT.DEFAULT_ENABLED;
    this.cameraZoomMinDistance = CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
    this.cameraZoomMaxDistance = CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;

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
      this.isRendering = false;
      this.needsRender = true;
    };
    this.handleContextRestored = () => {
      this.renderer.setClearColor(this.backgroundColor, this.backgroundAlpha);
      this.resetAdaptiveQualityMetrics();
      this.applyRendererSizeForMode(this.currentInteractionMode);
      this.requestRender();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);
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

    this.init();
  }

  /**
   * Initialize renderer and start animation loop
   */
  protected init(): void {
    // Start at interaction quality to avoid a heavy first frame when users drag immediately.
    this.applyRendererSizeForMode(true);
    this.scheduleInitialQualityUpgrade();

    // Configure controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.configureCameraZoomLimits();
    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.addEventListener('start', () => this.handleInteractionStart());
    this.controls.addEventListener('end', () => this.handleInteractionEnd());

    this.createMaze();
    this.refreshEdgeObjectCache();
    this.refreshFloorGridObjectCache();
    this.requestRender();
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
    this.configureCameraZoomLimits();
    this.clearSolutionPath();
    if (options.preserveCamera) {
      this.rebuildMazePreservingCamera();
      return;
    }
    this.createMaze();
    this.refreshEdgeObjectCache();
    this.refreshFloorGridObjectCache();
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
    if (this.isDisposed) return;
    this.needsRender = true;
    if (this.isRendering) return;

    this.isRendering = true;
    this.animationId = requestAnimationFrame(timestampMs => {
      if (this.isDisposed) {
        this.isRendering = false;
        return;
      }

      if (!this.needsRender) {
        this.isRendering = false;
        return;
      }

      this.needsRender = false;
      const needsMore = this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.updateAdaptiveQuality(timestampMs);
      this.renderListeners.forEach(listener => listener());
      this.isRendering = false;

      if (needsMore || this.needsRender) {
        this.requestRender();
      }
    });
  }

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Resize handler
   */
  public resize(): void {
    if (this.isDisposed) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.resetAdaptiveQualityMetrics();
    this.applyRendererSizeForMode(this.currentInteractionMode);
    this.requestRender();
  }

  /**
   * Delete maze layers while keeping the scene
   */
  public deleteMaze(): void {
    this.clearSolutionPath();
    this.mazeLayers.forEach(layer => {
      DisposalHelper.disposeObject(layer);
      this.scene.remove(layer);
    });
    this.mazeLayers = [];
    this.edgeObjects = [];
    this.floorGridObjects = [];
    this.edgesTemporarilyHidden = false;
  }

  /**
   * Destroy entire maze instance
   */
  public destroy(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    // Stop animation
    this.stopAnimation();
    this.clearInteractionRestoreTimer();
    this.clearInitialQualityUpgradeTimer();

    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );

    // Delete maze
    this.deleteMaze();

    // Dispose controls
    this.controls.dispose();

    // Dispose resources
    this.resourceManager.dispose();

    // Dispose scene
    DisposalHelper.disposeScene(this.scene);

    // Dispose renderer
    this.renderer.dispose();
  }

  // ========== PUBLIC API ==========

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getMazeData(): number[][][] {
    return this.maze.map(layer => layer.map(row => row.slice()));
  }

  public getCameraState(): CameraState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
  }

  public getMazeCenter(): MazeCenter {
    const firstLayer = this.maze[0];
    const rows = firstLayer?.length ?? 0;
    const cols = firstLayer?.[0]?.length ?? 0;
    const centerX = (cols * this.cellSize) / 2 - this.cellSize / 2;
    const centerZ = -(rows * this.cellSize) / 2 + this.cellSize / 2;
    return { x: centerX, z: centerZ };
  }

  public getRenderQualityInfo(): RenderQualityInfo {
    return {
      pixelRatio: this.currentRenderPixelRatio,
      adaptiveScale: this.adaptiveQualityScale,
      adaptiveEnabled: this.adaptiveQualityEnabled,
    };
  }

  public setCameraState(state: CameraState): void {
    this.camera.position.copy(state.position);
    this.controls.target.copy(state.target);
    this.controls.update();
    this.controls.saveState();
    this.requestRender();
  }

  public updateWallColor(color: string): void {
    this.wallColor.set(color);
    this.resourceManager.updateMaterialColor('wall', this.wallColor);
    this.meshFactory.updateSettings({ wallColor: this.wallColor });
    this.requestRender();
  }

  public updateFloorColor(color: string): void {
    this.floorColor.set(color);
    this.resourceManager.updateMaterialColor('floor', this.floorColor);
    this.meshFactory.updateSettings({ floorColor: this.floorColor });
    this.requestRender();
  }

  public updateWallOpacity(opacity: number): void {
    this.wallOpacity = opacity;
    this.resourceManager.updateMaterialOpacity('wall', opacity);
    this.meshFactory.updateSettings({ wallOpacity: opacity });
    this.requestRender();
  }

  public updateFloorOpacity(opacity: number): void {
    this.floorOpacity = opacity;
    this.resourceManager.updateMaterialOpacity('floor', opacity);
    this.meshFactory.updateSettings({ floorOpacity: opacity });
    this.requestRender();
  }

  public toggleEdges(showEdges: boolean): void {
    if (this.showEdges === showEdges) return;

    this.showEdges = showEdges;
    this.meshFactory.updateSettings({ showEdges });
    this.rebuildEdges();
    this.refreshEdgeObjectCache();
    if (!showEdges) {
      this.edgesTemporarilyHidden = false;
    } else if (this.currentInteractionMode && this.hideEdgesDuringInteractionEnabled) {
      this.setEdgeVisibility(false);
      this.edgesTemporarilyHidden = true;
    }
    this.requestRender();
  }

  public setFloorGridEnabled(enabled: boolean): void {
    if (this.showFloorGrid === enabled) {
      return;
    }

    this.showFloorGrid = enabled;
    this.meshFactory.updateSettings({ showFloorGrid: enabled });
    this.rebuildEdges();
  }

  public isFloorGridEnabled(): boolean {
    return this.showFloorGrid;
  }

  public setMeshReductionEnabled(enabled: boolean): void {
    if (this.meshReductionEnabled === enabled) return;
    const shouldRebuild = this.shouldRebuildForMeshConfig(enabled, this.meshMergeThreshold);
    this.meshReductionEnabled = enabled;
    if (shouldRebuild) {
      this.rebuildMazePreservingCamera();
      return;
    }
    this.requestRender();
  }

  public isMeshReductionEnabled(): boolean {
    return this.meshReductionEnabled;
  }

  public setMeshMergeThreshold(threshold: number): void {
    const nextThreshold = Math.max(MESH_REDUCTION.MIN_THRESHOLD, Math.floor(threshold));
    if (this.meshMergeThreshold === nextThreshold) return;
    const shouldRebuild = this.shouldRebuildForMeshConfig(this.meshReductionEnabled, nextThreshold);
    this.meshMergeThreshold = nextThreshold;
    if (shouldRebuild) {
      this.rebuildMazePreservingCamera();
      return;
    }
    this.requestRender();
  }

  public getMeshMergeThreshold(): number {
    return this.meshMergeThreshold;
  }

  protected getLayerBaseY(layerIndex: number): number {
    return layerIndex * this.wallHeight;
  }

  protected shouldMergeWalls(rows: number, cols: number): boolean {
    if (!this.meshReductionEnabled) {
      return false;
    }
    return rows >= this.meshMergeThreshold || cols >= this.meshMergeThreshold;
  }

  public addRenderListener(listener: () => void): void {
    this.renderListeners.add(listener);
  }

  public removeRenderListener(listener: () => void): void {
    this.renderListeners.delete(listener);
  }

  public setHideEdgesDuringInteractionEnabled(enabled: boolean): void {
    this.hideEdgesDuringInteractionEnabled = enabled;

    if (!enabled && this.edgesTemporarilyHidden) {
      this.setEdgeVisibility(true);
      this.edgesTemporarilyHidden = false;
      this.requestRender();
      return;
    }

    if (enabled && this.currentInteractionMode && this.showEdges && this.edgeObjects.length > 0) {
      this.setEdgeVisibility(false);
      this.edgesTemporarilyHidden = true;
      this.requestRender();
    }
  }

  public isHideEdgesDuringInteractionEnabled(): boolean {
    return this.hideEdgesDuringInteractionEnabled;
  }

  public setAdaptiveQualityEnabled(enabled: boolean): void {
    if (this.adaptiveQualityEnabled === enabled) {
      return;
    }
    this.adaptiveQualityEnabled = enabled;
    this.resetAdaptiveQualityMetrics();
    if (!this.currentInteractionMode) {
      this.applyRendererSizeForMode(this.currentInteractionMode);
    }
    this.requestRender();
  }

  public isAdaptiveQualityEnabled(): boolean {
    return this.adaptiveQualityEnabled;
  }

  public setCameraZoomLimitEnabled(enabled: boolean): void {
    if (this.cameraZoomLimitEnabled === enabled) {
      return;
    }
    this.cameraZoomLimitEnabled = enabled;
    this.configureCameraZoomLimits();
    this.controls.update();
    this.requestRender();
  }

  public isCameraZoomLimitEnabled(): boolean {
    return this.cameraZoomLimitEnabled;
  }

  public setCameraZoomMinDistance(distance: number): void {
    const normalizedMin = this.normalizeCameraZoomMinDistance(distance);
    if (Math.abs(this.cameraZoomMinDistance - normalizedMin) < 0.001) {
      return;
    }
    this.cameraZoomMinDistance = normalizedMin;
    if (this.cameraZoomMaxDistance < normalizedMin) {
      this.cameraZoomMaxDistance = normalizedMin;
    }
    this.configureCameraZoomLimits();
    this.controls.update();
    this.requestRender();
  }

  public getCameraZoomMinDistance(): number {
    return this.cameraZoomMinDistance;
  }

  public setCameraZoomMaxDistance(distance: number): void {
    const normalizedMax = this.normalizeCameraZoomMaxDistance(distance);
    if (Math.abs(this.cameraZoomMaxDistance - normalizedMax) < 0.001) {
      return;
    }
    this.cameraZoomMaxDistance = normalizedMax;
    if (this.cameraZoomMinDistance > normalizedMax) {
      this.cameraZoomMinDistance = normalizedMax;
    }
    this.configureCameraZoomLimits();
    this.controls.update();
    this.requestRender();
  }

  public getCameraZoomMaxDistance(): number {
    return this.cameraZoomMaxDistance;
  }

  public setBackgroundColor(color: THREE.ColorRepresentation, alpha: number = 1): void {
    const nextAlpha = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
    const previousHex = this.backgroundColor.getHex();
    this.backgroundColor.set(color);
    const colorChanged = this.backgroundColor.getHex() !== previousHex;
    const alphaChanged = Math.abs(this.backgroundAlpha - nextAlpha) > 0.0001;
    if (!colorChanged && !alphaChanged) {
      return;
    }
    this.backgroundAlpha = nextAlpha;
    this.renderer.setClearColor(this.backgroundColor, this.backgroundAlpha);
    this.requestRender();
  }

  public setSolutionPath(path: SolutionPath, layerIndex: number = 0): void {
    this.clearSolutionPath();
    if (path.length < 2) {
      this.requestRender();
      return;
    }

    const targetLayer = this.maze[layerIndex];
    if (!targetLayer || targetLayer.length === 0) {
      this.requestRender();
      return;
    }

    const points: THREE.Vector3[] = [];
    const rows = targetLayer.length;
    const cols = targetLayer[0]?.length ?? 0;

    path.forEach(cell => {
      if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) {
        return;
      }
      const x = cell.col * this.cellSize;
      const y = 0.04 + this.getLayerBaseY(layerIndex);
      const z = -cell.row * this.cellSize;
      points.push(new THREE.Vector3(x, y, z));
    });

    if (points.length < 2) {
      this.requestRender();
      return;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff3b30,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    this.solutionPathLine = new THREE.Line(geometry, material);
    this.solutionPathLine.renderOrder = 2;
    this.scene.add(this.solutionPathLine);
    this.requestRender();
  }

  public clearSolutionPath(): void {
    if (!this.solutionPathLine) {
      return;
    }

    this.scene.remove(this.solutionPathLine);
    this.solutionPathLine.geometry.dispose();
    const material = this.solutionPathLine.material;
    if (Array.isArray(material)) {
      material.forEach(item => item.dispose());
    } else {
      material.dispose();
    }
    this.solutionPathLine = null;
    this.requestRender();
  }

  private shouldMergeWallsForConfig(
    rows: number,
    cols: number,
    enabled: boolean,
    threshold: number
  ): boolean {
    if (!enabled) {
      return false;
    }
    return rows >= threshold || cols >= threshold;
  }

  private shouldRebuildForMeshConfig(nextEnabled: boolean, nextThreshold: number): boolean {
    const currentEnabled = this.meshReductionEnabled;
    const currentThreshold = this.meshMergeThreshold;

    return this.maze.some(layer => {
      const rows = layer.length;
      const cols = layer[0]?.length ?? 0;
      const currentMerge = this.shouldMergeWallsForConfig(
        rows,
        cols,
        currentEnabled,
        currentThreshold
      );
      const nextMerge = this.shouldMergeWallsForConfig(rows, cols, nextEnabled, nextThreshold);
      return currentMerge !== nextMerge;
    });
  }

  private rebuildMazePreservingCamera(): void {
    this.preserveCameraOnRebuild = true;
    try {
      this.createMaze();
    } finally {
      this.preserveCameraOnRebuild = false;
    }
    this.refreshEdgeObjectCache();
    this.refreshFloorGridObjectCache();
    this.requestRender();
  }

  private handleInteractionStart(): void {
    this.clearInteractionRestoreTimer();
    this.clearInitialQualityUpgradeTimer();
    if (this.hideEdgesDuringInteractionEnabled && this.showEdges && this.edgeObjects.length > 0) {
      this.setEdgeVisibility(false);
      this.edgesTemporarilyHidden = true;
    }
    this.applyRendererSizeForMode(true);
    this.requestRender();
  }

  private handleInteractionEnd(): void {
    this.clearInteractionRestoreTimer();
    this.interactionRestoreTimer = window.setTimeout(() => {
      this.interactionRestoreTimer = null;
      if (this.edgesTemporarilyHidden && this.showEdges) {
        this.setEdgeVisibility(true);
      }
      this.edgesTemporarilyHidden = false;
      this.applyRendererSizeForMode(false);
      this.requestRender();
    }, Maze.INTERACTION_END_DELAY_MS);
  }

  private clearInteractionRestoreTimer(): void {
    if (this.interactionRestoreTimer === null) {
      return;
    }
    window.clearTimeout(this.interactionRestoreTimer);
    this.interactionRestoreTimer = null;
  }

  private scheduleInitialQualityUpgrade(): void {
    this.clearInitialQualityUpgradeTimer();
    this.initialQualityUpgradeTimer = window.setTimeout(() => {
      this.initialQualityUpgradeTimer = null;
      if (this.isDisposed) {
        return;
      }
      this.applyRendererSizeForMode(false);
      this.requestRender();
    }, Maze.INITIAL_QUALITY_UPGRADE_DELAY_MS);
  }

  private configureCameraZoomLimits(): void {
    if (!this.cameraZoomLimitEnabled) {
      this.controls.minDistance = 0;
      this.controls.maxDistance = Infinity;
      return;
    }

    const minDistance = this.normalizeCameraZoomMinDistance(this.cameraZoomMinDistance);
    const maxDistance = Math.max(
      minDistance,
      this.normalizeCameraZoomMaxDistance(this.cameraZoomMaxDistance)
    );

    this.cameraZoomMinDistance = minDistance;
    this.cameraZoomMaxDistance = maxDistance;
    this.controls.minDistance = minDistance;
    this.controls.maxDistance = maxDistance;
  }

  private normalizeCameraZoomMinDistance(value: number): number {
    if (!Number.isFinite(value)) {
      return CAMERA_ZOOM_LIMIT.DEFAULT_MIN_DISTANCE;
    }
    const clamped = Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value);
    return Math.min(CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX, clamped);
  }

  private normalizeCameraZoomMaxDistance(value: number): number {
    if (!Number.isFinite(value)) {
      return CAMERA_ZOOM_LIMIT.DEFAULT_MAX_DISTANCE;
    }
    return Math.min(
      CAMERA_ZOOM_LIMIT.MAX_DISTANCE_MAX,
      Math.max(CAMERA_ZOOM_LIMIT.MIN_DISTANCE_MIN, value)
    );
  }

  private updateAdaptiveQuality(nowMs: number): void {
    if (!this.adaptiveQualityEnabled) {
      return;
    }

    if (this.lastRenderTimestampMs === null) {
      this.lastRenderTimestampMs = nowMs;
      return;
    }

    const deltaMs = nowMs - this.lastRenderTimestampMs;
    this.lastRenderTimestampMs = nowMs;
    if (!Number.isFinite(deltaMs) || deltaMs <= 0 || deltaMs > 200) {
      return;
    }

    if (this.frameTimeEmaMs === null) {
      this.frameTimeEmaMs = deltaMs;
    } else {
      this.frameTimeEmaMs =
        this.frameTimeEmaMs + (deltaMs - this.frameTimeEmaMs) * Maze.ADAPTIVE_QUALITY_EMA_ALPHA;
    }

    if (nowMs - this.lastAdaptiveAdjustmentMs < Maze.ADAPTIVE_QUALITY_UPDATE_COOLDOWN_MS) {
      return;
    }

    let nextScale = this.adaptiveQualityScale;
    if (this.frameTimeEmaMs > Maze.ADAPTIVE_QUALITY_HIGH_FRAME_TIME_MS) {
      nextScale = Math.max(
        Maze.ADAPTIVE_QUALITY_MIN_SCALE,
        this.adaptiveQualityScale - Maze.ADAPTIVE_QUALITY_DECREASE_STEP
      );
    } else if (this.frameTimeEmaMs < Maze.ADAPTIVE_QUALITY_LOW_FRAME_TIME_MS) {
      nextScale = Math.min(
        Maze.ADAPTIVE_QUALITY_MAX_SCALE,
        this.adaptiveQualityScale + Maze.ADAPTIVE_QUALITY_INCREASE_STEP
      );
    }

    if (Math.abs(nextScale - this.adaptiveQualityScale) < 0.001) {
      return;
    }

    this.adaptiveQualityScale = nextScale;
    this.lastAdaptiveAdjustmentMs = nowMs;
    this.applyRendererSizeForMode(this.currentInteractionMode);
    this.needsRender = true;
  }

  private resetAdaptiveQualityMetrics(): void {
    this.frameTimeEmaMs = null;
    this.lastRenderTimestampMs = null;
    this.lastAdaptiveAdjustmentMs = 0;
    this.adaptiveQualityScale = Maze.ADAPTIVE_QUALITY_MAX_SCALE;
  }

  private clearInitialQualityUpgradeTimer(): void {
    if (this.initialQualityUpgradeTimer === null) {
      return;
    }
    window.clearTimeout(this.initialQualityUpgradeTimer);
    this.initialQualityUpgradeTimer = null;
  }

  /**
   * Rebuild edges on all maze layers
   */
  private rebuildEdges(): void {
    this.mazeLayers.forEach(layer => {
      layer.children.forEach(child => {
        if (child instanceof THREE.Group) {
          // Remove old edges
          DisposalHelper.disposeEdgesFromGroup(child);

          // Add new edges if needed
          if (this.showEdges || this.showFloorGrid) {
            child.children.forEach(obj => {
              if (obj instanceof THREE.Mesh) {
                const isFloorSurface = obj.userData.surfaceType === 'floor';
                if (isFloorSurface ? !this.showFloorGrid : !this.showEdges) {
                  return;
                }
                const edges = this.resourceManager.getEdgesGeometry(obj.geometry);
                const material = this.resourceManager.getEdgeMaterial();
                const line = new THREE.LineSegments(edges, material);

                line.position.copy(obj.position);
                line.rotation.copy(obj.rotation);
                line.renderOrder = 1;
                line.userData.isFloorGrid = isFloorSurface;
                line.userData.sharedGeometry = true;
                line.userData.sharedMaterial = true;

                child.add(line);
              }
            });
          }
        }
      });
    });

    this.refreshEdgeObjectCache();
    this.refreshFloorGridObjectCache();
    this.requestRender();
  }

  private refreshEdgeObjectCache(): void {
    const lines: THREE.LineSegments[] = [];
    this.mazeLayers.forEach(layer => {
      layer.traverse(object => {
        if (object instanceof THREE.LineSegments && object.userData.isFloorGrid !== true) {
          lines.push(object);
        }
      });
    });
    this.edgeObjects = lines;
  }

  private refreshFloorGridObjectCache(): void {
    const lines: THREE.LineSegments[] = [];
    this.mazeLayers.forEach(layer => {
      layer.traverse(object => {
        if (object instanceof THREE.LineSegments && object.userData.isFloorGrid === true) {
          lines.push(object);
        }
      });
    });
    this.floorGridObjects = lines;
    this.setFloorGridVisibility(this.showFloorGrid);
  }

  private setFloorGridVisibility(visible: boolean): void {
    this.floorGridObjects.forEach(line => {
      line.visible = visible;
    });
  }

  protected createFloorGridOverlay(
    rows: number,
    cols: number,
    floorTopY: number
  ): THREE.LineSegments | null {
    if (rows <= 0 || cols <= 0) {
      return null;
    }

    const points: THREE.Vector3[] = [];
    const xMin = -this.cellSize / 2;
    const xMax = (cols - 0.5) * this.cellSize;
    const zMax = this.cellSize / 2;
    const zMin = -(rows - 0.5) * this.cellSize;
    const y = floorTopY + Maze.FLOOR_GRID_Y_OFFSET;

    for (let col = 0; col <= cols; col += 1) {
      const x = xMin + col * this.cellSize;
      points.push(new THREE.Vector3(x, y, zMin), new THREE.Vector3(x, y, zMax));
    }

    for (let row = 0; row <= rows; row += 1) {
      const z = zMax - row * this.cellSize;
      points.push(new THREE.Vector3(xMin, y, z), new THREE.Vector3(xMax, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthTest: true,
      depthWrite: false,
    });
    const grid = new THREE.LineSegments(geometry, material);
    grid.userData.isFloorGrid = true;
    grid.visible = this.showFloorGrid;
    return grid;
  }

  private setEdgeVisibility(visible: boolean): void {
    this.edgeObjects.forEach(edge => {
      edge.visible = visible;
    });
  }

  private applyRendererSizeForMode(isInteraction: boolean): void {
    this.currentInteractionMode = isInteraction;
    const { width, height, pixelRatio } = this.getRendererSize(isInteraction);
    if (
      width === this.currentRenderWidth &&
      height === this.currentRenderHeight &&
      Math.abs(pixelRatio - this.currentRenderPixelRatio) < 0.001
    ) {
      return;
    }
    this.currentRenderWidth = width;
    this.currentRenderHeight = height;
    this.currentRenderPixelRatio = pixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  private getRendererSize(isInteraction: boolean = false): {
    width: number;
    height: number;
    pixelRatio: number;
  } {
    const dynamicCap = isInteraction
      ? Maze.INTERACTION_PIXEL_RATIO_CAP
      : Maze.STABLE_PIXEL_RATIO_CAP;
    const adaptiveScale = this.adaptiveQualityEnabled ? this.adaptiveQualityScale : 1;
    const adaptiveCap = dynamicCap * adaptiveScale;
    const pixelRatio = Math.max(
      Maze.MIN_PIXEL_RATIO,
      Math.min(window.devicePixelRatio, adaptiveCap)
    );
    const maxSize = this.renderer.capabilities.maxTextureSize;
    const maxDimension = Math.floor(maxSize / pixelRatio);
    const canvasWidth = Math.max(Math.floor(this.canvas.clientWidth), 1);
    const canvasHeight = Math.max(Math.floor(this.canvas.clientHeight), 1);
    const width = Math.min(canvasWidth, maxDimension);
    const height = Math.min(canvasHeight, maxDimension);
    return { width, height, pixelRatio };
  }
}
