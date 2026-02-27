import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ResourceManager } from '../resources/ResourceManager';
import { DisposalHelper } from '../resources/DisposalHelper';
import { MeshFactory } from '../resources/MeshFactory';
import { MESH_REDUCTION } from '../constants/maze';

export interface MazeConfig {
  wallHeight?: number;
  wallThickness?: number;
  cellSize?: number;
}

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
  private renderListeners: Set<() => void> = new Set();

  constructor(canvas: HTMLCanvasElement, maze: number[][][], config: MazeConfig = {}) {
    this.canvas = canvas;
    this.maze = maze;

    // Configuration với defaults
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
    const { width, height, pixelRatio } = this.getRendererSize();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);

    // Configure controls
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.addEventListener('change', () => this.requestRender());

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
  public updateMazeData(maze: number[][][]): void {
    if (this.isDisposed) return;
    this.maze = maze;
    this.createMaze();
    this.requestRender();
  }

  /**
   * Position camera to view entire maze
   */
  protected positionCamera(centerX: number, centerZ: number, distance: number): void {
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
    const { width, height, pixelRatio } = this.getRendererSize();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height);
    this.requestRender();
  }

  /**
   * Delete maze layers (giữ scene)
   */
  public deleteMaze(): void {
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
    this.meshReductionEnabled = enabled;
    this.createMaze();
    this.requestRender();
  }

  public isMeshReductionEnabled(): boolean {
    return this.meshReductionEnabled;
  }

  public setMeshMergeThreshold(threshold: number): void {
    const nextThreshold = Math.max(MESH_REDUCTION.MIN_THRESHOLD, Math.floor(threshold));
    if (this.meshMergeThreshold === nextThreshold) return;
    this.meshMergeThreshold = nextThreshold;
    this.createMaze();
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

  private getRendererSize(): { width: number; height: number; pixelRatio: number } {
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    const maxSize = this.renderer.capabilities.maxTextureSize;
    const maxDimension = Math.floor(maxSize / pixelRatio);
    const width = Math.min(window.innerWidth, maxDimension);
    const height = Math.min(window.innerHeight, maxDimension);
    return { width, height, pixelRatio };
  }
}
