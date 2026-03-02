import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ResourceManager } from '../resources/resource-manager';
import { DisposalHelper } from '../resources/disposal-helper';
import { MeshFactory } from '../resources/mesh-factory';
import { MESH_REDUCTION } from '../constants/maze';
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

/**
 * Base Maze Class - Manages Three.js scene and rendering
 * Refactored with proper memory management
 */
export abstract class Maze {
  private static readonly INTERACTION_PIXEL_RATIO_CAP = 1.0;
  private static readonly INTERACTION_END_DELAY_MS = 120;

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
  protected meshReductionEnabled: boolean;
  protected meshMergeThreshold: number;

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
  private currentInteractionMode: boolean = false;
  private renderListeners: Set<() => void> = new Set();

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
    this.meshReductionEnabled = MESH_REDUCTION.DEFAULT_ENABLED;
    this.meshMergeThreshold = MESH_REDUCTION.DEFAULT_THRESHOLD;

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
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Initialize resource managers
    this.resourceManager = new ResourceManager();
    this.meshFactory = new MeshFactory(
      this.resourceManager,
      this.wallColor,
      this.floorColor,
      this.wallOpacity,
      this.floorOpacity,
      this.showEdges
    );

    this.init();
  }

  /**
   * Initialize renderer and start animation loop
   */
  protected init(): void {
    this.applyRendererSizeForMode(false);

    // Configure controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.addEventListener('change', () => this.requestRender());
    this.controls.addEventListener('start', () => this.handleInteractionStart());
    this.controls.addEventListener('end', () => this.handleInteractionEnd());

    this.createMaze();
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
    this.clearSolutionPath();
    if (options.preserveCamera) {
      this.rebuildMazePreservingCamera();
      return;
    }
    this.createMaze();
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
    this.animationId = requestAnimationFrame(() => {
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
    this.requestRender();
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
      const y = 0.04 + layerIndex * this.wallHeight;
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
    this.requestRender();
  }

  private handleInteractionStart(): void {
    this.clearInteractionRestoreTimer();
    this.applyRendererSizeForMode(true);
    this.requestRender();
  }

  private handleInteractionEnd(): void {
    this.clearInteractionRestoreTimer();
    this.interactionRestoreTimer = window.setTimeout(() => {
      this.interactionRestoreTimer = null;
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
          if (this.showEdges) {
            child.children.forEach(obj => {
              if (obj instanceof THREE.Mesh) {
                const edges = new THREE.EdgesGeometry(obj.geometry);
                const material = this.resourceManager.getEdgeMaterial();
                const line = new THREE.LineSegments(edges, material);

                line.position.copy(obj.position);
                line.rotation.copy(obj.rotation);

                child.add(line);
              }
            });
          }
        }
      });
    });

    this.requestRender();
  }

  private applyRendererSizeForMode(isInteraction: boolean): void {
    this.currentInteractionMode = isInteraction;
    const { width, height, pixelRatio } = this.getRendererSize(isInteraction);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  private getRendererSize(isInteraction: boolean = false): {
    width: number;
    height: number;
    pixelRatio: number;
  } {
    const stableCap = 1.5;
    const dynamicCap = isInteraction ? Maze.INTERACTION_PIXEL_RATIO_CAP : stableCap;
    const pixelRatio = Math.min(window.devicePixelRatio, dynamicCap);
    const maxSize = this.renderer.capabilities.maxTextureSize;
    const maxDimension = Math.floor(maxSize / pixelRatio);
    const width = Math.min(window.innerWidth, maxDimension);
    const height = Math.min(window.innerHeight, maxDimension);
    return { width, height, pixelRatio };
  }
}
