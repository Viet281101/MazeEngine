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

export interface StairConnectorParams {
  x: number;
  y: number;
  z: number;
  cellSize: number;
  riseHeight: number;
  stepCount?: number;
}

/**
 * MeshFactory - Factory pattern to create meshes
 * Use ResourceManager to reuse geometries
 */
export class MeshFactory {
  private static readonly DEFAULT_STAIR_STEP_COUNT = 4;

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
   * Create compact symbolic stairs to connect two layers within one maze cell.
   */
  createStairConnector(params: StairConnectorParams): THREE.Group {
    const {
      x,
      y,
      z,
      cellSize,
      riseHeight,
      stepCount = MeshFactory.DEFAULT_STAIR_STEP_COUNT,
    } = params;
    const steps = Math.max(1, Math.floor(stepCount));

    const group = new THREE.Group();
    group.position.set(x, y, z);

    const geometry = this.getStairGeometry(cellSize, riseHeight, steps);

    const material = this.resourceManager.getMaterial(
      'wall',
      'wall',
      this.wallColor,
      this.wallOpacity
    );
    const stairs = new THREE.Mesh(geometry, material);
    stairs.position.set(0, 0, -cellSize / 2);
    stairs.userData.sharedGeometry = true;
    stairs.userData.sharedMaterial = true;
    group.add(stairs);

    if (this.showEdges) {
      const edges = this.resourceManager.getEdgesGeometry(geometry);
      const edgeMaterial = this.resourceManager.getEdgeMaterial();
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
      edgeLines.position.copy(stairs.position);
      edgeLines.renderOrder = 1;
      edgeLines.userData.sharedGeometry = true;
      edgeLines.userData.sharedMaterial = true;
      group.add(edgeLines);
    }

    return group;
  }

  private getStairGeometry(
    cellSize: number,
    riseHeight: number,
    stepCount: number
  ): THREE.ExtrudeGeometry {
    const geometryKey = `stair-${cellSize}-${riseHeight}-${stepCount}`;
    return this.resourceManager.getCustomGeometry(geometryKey, () => {
      // Build one solid stair volume so edges only draw on the outer shell.
      const stepDepth = cellSize / stepCount;
      const stepRise = riseHeight / stepCount;
      const halfRun = cellSize / 2;

      const profile = new THREE.Shape();
      profile.moveTo(-halfRun, 0);

      for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
        const xEdge = -halfRun + stepIndex * stepDepth;
        const yEdge = (stepIndex + 1) * stepRise;
        profile.lineTo(xEdge, yEdge);
        profile.lineTo(xEdge + stepDepth, yEdge);
      }

      profile.lineTo(halfRun, 0);
      profile.lineTo(-halfRun, 0);

      return new THREE.ExtrudeGeometry(profile, {
        depth: cellSize,
        bevelEnabled: false,
        steps: 1,
      });
    }) as THREE.ExtrudeGeometry;
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
