import * as THREE from 'three';
import { FLOOR_GRID_Y_OFFSET } from '../constants/maze';
import type { ResourceManager } from '../resources/resource-manager';
import { DisposalHelper } from '../resources/disposal-helper';
export { FLOOR_GRID_Y_OFFSET };

export function rebuildEdgesOnLayers(
  mazeLayers: THREE.Object3D[],
  showEdges: boolean,
  showFloorGrid: boolean,
  resourceManager: ResourceManager
): void {
  mazeLayers.forEach(layer => {
    layer.children.forEach(child => {
      if (child instanceof THREE.Group) {
        DisposalHelper.disposeEdgesFromGroup(child);

        if (showEdges || showFloorGrid) {
          child.children.forEach(obj => {
            if (obj instanceof THREE.Mesh) {
              const isFloorSurface = obj.userData.surfaceType === 'floor';
              if (isFloorSurface ? !showFloorGrid : !showEdges) {
                return;
              }

              const edges = resourceManager.getEdgesGeometry(obj.geometry);
              const material = resourceManager.getEdgeMaterial();
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
}

export function collectEdgeObjects(mazeLayers: THREE.Object3D[]): THREE.LineSegments[] {
  return collectLineSegments(mazeLayers, false);
}

export function collectFloorGridObjects(mazeLayers: THREE.Object3D[]): THREE.LineSegments[] {
  return collectLineSegments(mazeLayers, true);
}

function collectLineSegments(
  mazeLayers: THREE.Object3D[],
  floorGrid: boolean
): THREE.LineSegments[] {
  const lines: THREE.LineSegments[] = [];
  mazeLayers.forEach(layer => {
    layer.traverse(object => {
      if (
        object instanceof THREE.LineSegments &&
        (object.userData.isFloorGrid === true) === floorGrid
      ) {
        lines.push(object);
      }
    });
  });
  return lines;
}

export function setLineSegmentsVisibility(
  lineSegments: THREE.LineSegments[],
  visible: boolean
): void {
  lineSegments.forEach(line => {
    line.visible = visible;
  });
}

export function createFloorGridOverlay(
  rows: number,
  cols: number,
  cellSize: number,
  floorTopY: number,
  visible: boolean
): THREE.LineSegments | null {
  if (rows <= 0 || cols <= 0) {
    return null;
  }

  const points: THREE.Vector3[] = [];
  const xMin = -cellSize / 2;
  const xMax = (cols - 0.5) * cellSize;
  const zMax = cellSize / 2;
  const zMin = -(rows - 0.5) * cellSize;
  const y = floorTopY + FLOOR_GRID_Y_OFFSET;

  for (let col = 0; col <= cols; col += 1) {
    const x = xMin + col * cellSize;
    points.push(new THREE.Vector3(x, y, zMin), new THREE.Vector3(x, y, zMax));
  }

  for (let row = 0; row <= rows; row += 1) {
    const z = zMax - row * cellSize;
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
  grid.visible = visible;
  return grid;
}
