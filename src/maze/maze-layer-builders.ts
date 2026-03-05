import * as THREE from 'three';
import type { MeshFactory } from '../resources/mesh-factory';

interface WallBuildParams {
  layer: number[][];
  layerHeight: number;
  mazeLayer: THREE.Object3D;
  shouldMerge: boolean;
  cellSize: number;
  wallHeight: number;
  wallThickness: number;
  meshFactory: MeshFactory;
}

interface MainFloorBuildParams {
  layer: number[][];
  mazeLayer: THREE.Object3D;
  floorTopY: number;
  cellSize: number;
  meshFactory: MeshFactory;
  createGridOverlay: (rows: number, cols: number, floorTopY: number) => THREE.LineSegments | null;
}

export function buildWallsForLayer(params: WallBuildParams): void {
  const { layer, layerHeight, mazeLayer, shouldMerge } = params;
  const rowCount = layer.length;
  const colCount = layer[0]?.length ?? 0;

  if (!shouldMerge) {
    buildWallsForLayerDetailed(params);
    return;
  }

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    let startCol = -1;

    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
      const isConnectedPair =
        colIndex < colCount - 1 &&
        layer[rowIndex][colIndex] === 1 &&
        layer[rowIndex][colIndex + 1] === 1;

      if (isConnectedPair) {
        if (startCol === -1) {
          startCol = colIndex;
        }
        continue;
      }

      if (startCol !== -1) {
        const endCol = colIndex;
        const span = endCol - startCol;
        const wall = params.meshFactory.createWall({
          x: ((startCol + endCol) * params.cellSize) / 2,
          y: layerHeight + params.wallHeight / 2,
          z: -rowIndex * params.cellSize,
          width: span * params.cellSize,
          height: params.wallHeight,
          depth: params.wallThickness,
        });
        mazeLayer.add(wall);
        startCol = -1;
      }
    }
  }

  for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
    let startRow = -1;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const isConnectedPair =
        rowIndex < rowCount - 1 &&
        layer[rowIndex][colIndex] === 1 &&
        layer[rowIndex + 1][colIndex] === 1;

      if (isConnectedPair) {
        if (startRow === -1) {
          startRow = rowIndex;
        }
        continue;
      }

      if (startRow !== -1) {
        const endRow = rowIndex;
        const span = endRow - startRow;
        const wall = params.meshFactory.createWall({
          x: colIndex * params.cellSize,
          y: layerHeight + params.wallHeight / 2,
          z: -((startRow + endRow) * params.cellSize) / 2,
          width: params.wallThickness,
          height: params.wallHeight,
          depth: span * params.cellSize,
        });
        mazeLayer.add(wall);
        startRow = -1;
      }
    }
  }
}

function buildWallsForLayerDetailed(params: WallBuildParams): void {
  const { layer, layerHeight, mazeLayer } = params;
  layer.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 1) {
        if (colIndex < row.length - 1 && row[colIndex + 1] === 1) {
          const wall = params.meshFactory.createWall({
            x: colIndex * params.cellSize + params.cellSize / 2,
            y: layerHeight + params.wallHeight / 2,
            z: -rowIndex * params.cellSize,
            width: params.cellSize,
            height: params.wallHeight,
            depth: params.wallThickness,
          });
          mazeLayer.add(wall);
        }

        if (rowIndex < layer.length - 1 && layer[rowIndex + 1][colIndex] === 1) {
          const wall = params.meshFactory.createWall({
            x: colIndex * params.cellSize,
            y: layerHeight + params.wallHeight / 2,
            z: -(rowIndex * params.cellSize + params.cellSize / 2),
            width: params.wallThickness,
            height: params.wallHeight,
            depth: params.cellSize,
          });
          mazeLayer.add(wall);
        }
      }
    });
  });
}

export function buildMainFloorForLayer(params: MainFloorBuildParams): void {
  const rows = params.layer.length;
  const cols = params.layer[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    return;
  }
  const floorWidth = cols * params.cellSize;
  const floorHeight = rows * params.cellSize;

  const floor = params.meshFactory.createFloor({
    x: floorWidth / 2 - params.cellSize / 2,
    y: params.floorTopY,
    z: -(floorHeight / 2) + params.cellSize / 2,
    width: floorWidth,
    height: floorHeight,
  });
  params.mazeLayer.add(floor);

  const grid = params.createGridOverlay(rows, cols, params.floorTopY);
  if (grid) {
    params.mazeLayer.add(grid);
  }
}
