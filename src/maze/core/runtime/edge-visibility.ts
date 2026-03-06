import * as THREE from 'three';
import type { ResourceManager } from '../../../resources/resource-manager';
import {
  collectEdgeObjects,
  collectFloorGridObjects,
  rebuildEdgesOnLayers,
  setLineSegmentsVisibility,
} from '../../rendering';

export interface EdgeVisibilityRuntime {
  edgeObjects: THREE.LineSegments[];
  floorGridObjects: THREE.LineSegments[];
}

export function createEdgeVisibilityRuntime(): EdgeVisibilityRuntime {
  return {
    edgeObjects: [],
    floorGridObjects: [],
  };
}

export function clearEdgeVisibilityRuntime(runtime: EdgeVisibilityRuntime): EdgeVisibilityRuntime {
  return {
    ...runtime,
    edgeObjects: [],
    floorGridObjects: [],
  };
}

export function refreshEdgeVisibilityRuntime(
  runtime: EdgeVisibilityRuntime,
  mazeLayers: THREE.Object3D[],
  showFloorGrid: boolean
): EdgeVisibilityRuntime {
  const edgeObjects = collectEdgeObjects(mazeLayers);
  const floorGridObjects = collectFloorGridObjects(mazeLayers);
  setLineSegmentsVisibility(floorGridObjects, showFloorGrid);
  return {
    ...runtime,
    edgeObjects,
    floorGridObjects,
  };
}

export function rebuildEdgeVisibilityRuntime(
  runtime: EdgeVisibilityRuntime,
  mazeLayers: THREE.Object3D[],
  showEdges: boolean,
  showFloorGrid: boolean,
  resourceManager: ResourceManager
): EdgeVisibilityRuntime {
  rebuildEdgesOnLayers(mazeLayers, showEdges, showFloorGrid, resourceManager);
  return refreshEdgeVisibilityRuntime(runtime, mazeLayers, showFloorGrid);
}

export function setEdgeObjectsVisibility(runtime: EdgeVisibilityRuntime, visible: boolean): void {
  setLineSegmentsVisibility(runtime.edgeObjects, visible);
}

export function hasEdgeObjects(runtime: EdgeVisibilityRuntime): boolean {
  return runtime.edgeObjects.length > 0;
}
