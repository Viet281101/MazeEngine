import * as THREE from 'three';
import { ResourceManager } from './resource-manager';

export interface WallParams {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface FloorParams {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  rotationX?: number;
}

/**
 * MeshFactory - Factory pattern to create meshes
 * Use ResourceManager to reuse geometries
 */
export class MeshFactory {
  constructor(
    private resourceManager: ResourceManager,
    private wallColor: THREE.Color,
    private floorColor: THREE.Color,
    private wallOpacity: number,
    private floorOpacity: number,
    private showEdges: boolean
  ) {}

  /**
   * Create wall mesh with edges (if enabled)
   */
  createWall(params: WallParams): THREE.Group {
    const { x, y, z, width, height, depth } = params;

    const geometry = this.resourceManager.getBoxGeometry(width, height, depth);
    const material = this.resourceManager.getMaterial(
      'wall',
      'wall',
      this.wallColor,
      this.wallOpacity
    );

    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, z);
    wall.userData.sharedGeometry = true;
    wall.userData.sharedMaterial = true;

    const group = new THREE.Group();
    group.add(wall);

    if (this.showEdges) {
      this.addEdgesToGroup(group, geometry, x, y, z);
    }

    return group;
  }

  /**
   * Create floor mesh with edges (if enabled)
   */
  createFloor(params: FloorParams): THREE.Group {
    const { x, y, z, width, height, rotationX = -Math.PI / 2 } = params;

    const geometry = this.resourceManager.getPlaneGeometry(width, height);
    const material = this.resourceManager.getMaterial(
      'floor',
      'floor',
      this.floorColor,
      this.floorOpacity
    );

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = rotationX;
    floor.position.set(x, y, z);
    floor.userData.sharedGeometry = true;
    floor.userData.sharedMaterial = true;

    const group = new THREE.Group();
    group.add(floor);

    if (this.showEdges) {
      this.addEdgesToGroup(group, geometry, x, y, z, rotationX);
    }

    return group;
  }

  /**
   * Create small floor (for multi-layer maze)
   */
  createSmallFloor(x: number, y: number, z: number, size: number): THREE.Group {
    return this.createFloor({
      x,
      y,
      z,
      width: size,
      height: size,
      rotationX: -Math.PI / 2,
    });
  }

  /**
   * Add edges to a group
   */
  private addEdgesToGroup(
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    x: number,
    y: number,
    z: number,
    rotationX: number = 0
  ): void {
    const edges = this.resourceManager.getEdgesGeometry(geometry);
    const material = this.resourceManager.getEdgeMaterial();
    const line = new THREE.LineSegments(edges, material);

    line.position.set(x, y, z);
    line.rotation.x = rotationX;
    line.renderOrder = 1;
    line.userData.sharedGeometry = true;
    line.userData.sharedMaterial = true;

    group.add(line);
  }

  /**
   * Update settings
   */
  updateSettings(settings: {
    wallColor?: THREE.Color;
    floorColor?: THREE.Color;
    wallOpacity?: number;
    floorOpacity?: number;
    showEdges?: boolean;
  }): void {
    if (settings.wallColor) this.wallColor = settings.wallColor;
    if (settings.floorColor) this.floorColor = settings.floorColor;
    if (settings.wallOpacity !== undefined) this.wallOpacity = settings.wallOpacity;
    if (settings.floorOpacity !== undefined) this.floorOpacity = settings.floorOpacity;
    if (settings.showEdges !== undefined) this.showEdges = settings.showEdges;
  }
}
