import { Maze, MazeConfig } from './maze';
import * as THREE from 'three';

/**
 * MultiLayerMaze - Maze with multiple stacked layers
 */
export class MultiLayerMaze extends Maze {
  private static readonly OPENING_CELL_VALUE = 2;
  private static readonly STAIR_STEP_COUNT = 4;

  constructor(canvas: HTMLCanvasElement, maze: number[][][], config?: MazeConfig) {
    super(canvas, maze, config);
  }

  protected createMaze(): void {
    this.deleteMaze();

    this.maze.forEach((layer, layerIndex) => {
      const mazeLayer = new THREE.Object3D();
      const layerHeight = layerIndex * this.wallHeight;

      // Create walls for this layer
      this.createWallsForLayer(layer, layerHeight, mazeLayer);

      // Create floors (except for first layer which has main floor)
      if (layerIndex > 0) {
        this.createLayerFloorsAndConnectors(layer, layerIndex, layerHeight, mazeLayer);
      } else {
        this.createMainFloor(layer, mazeLayer);
      }

      this.mazeLayers.push(mazeLayer);
      this.scene.add(mazeLayer);
    });

    // Position camera
    this.positionCameraForMultiLayer();
  }

  /**
   * Create walls for a layer
   */
  private createWallsForLayer(
    layer: number[][],
    layerHeight: number,
    mazeLayer: THREE.Object3D
  ): void {
    const rowCount = layer.length;
    const colCount = layer[0]?.length ?? 0;
    const shouldMerge = this.shouldMergeWalls(rowCount, colCount);

    if (!shouldMerge) {
      this.createWallsForLayerDetailed(layer, layerHeight, mazeLayer);
      return;
    }

    // Merge consecutive horizontal wall segments in each row.
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
          const wall = this.meshFactory.createWall({
            x: ((startCol + endCol) * this.cellSize) / 2,
            y: layerHeight + this.wallHeight / 2,
            z: -rowIndex * this.cellSize,
            width: span * this.cellSize,
            height: this.wallHeight,
            depth: this.wallThickness,
          });
          mazeLayer.add(wall);
          startCol = -1;
        }
      }
    }

    // Merge consecutive vertical wall segments in each column.
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
          const wall = this.meshFactory.createWall({
            x: colIndex * this.cellSize,
            y: layerHeight + this.wallHeight / 2,
            z: -((startRow + endRow) * this.cellSize) / 2,
            width: this.wallThickness,
            height: this.wallHeight,
            depth: span * this.cellSize,
          });
          mazeLayer.add(wall);
          startRow = -1;
        }
      }
    }
  }

  private createWallsForLayerDetailed(
    layer: number[][],
    layerHeight: number,
    mazeLayer: THREE.Object3D
  ): void {
    layer.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === 1) {
          // Horizontal wall
          if (colIndex < row.length - 1 && row[colIndex + 1] === 1) {
            const wall = this.meshFactory.createWall({
              x: colIndex * this.cellSize + this.cellSize / 2,
              y: layerHeight + this.wallHeight / 2,
              z: -rowIndex * this.cellSize,
              width: this.cellSize,
              height: this.wallHeight,
              depth: this.wallThickness,
            });
            mazeLayer.add(wall);
          }

          // Vertical wall
          if (rowIndex < layer.length - 1 && layer[rowIndex + 1][colIndex] === 1) {
            const wall = this.meshFactory.createWall({
              x: colIndex * this.cellSize,
              y: layerHeight + this.wallHeight / 2,
              z: -(rowIndex * this.cellSize + this.cellSize / 2),
              width: this.wallThickness,
              height: this.wallHeight,
              depth: this.cellSize,
            });
            mazeLayer.add(wall);
          }
        }
      });
    });
  }

  /**
   * Create small floors and vertical connectors for a non-ground layer.
   */
  private createLayerFloorsAndConnectors(
    layer: number[][],
    layerIndex: number,
    layerHeight: number,
    mazeLayer: THREE.Object3D
  ): void {
    const previousLayer = this.maze[layerIndex - 1];
    const previousLayerObject = this.mazeLayers[layerIndex - 1];
    const connectorBaseHeight = (layerIndex - 1) * this.wallHeight;

    for (let rowIndex = 0; rowIndex < layer.length; rowIndex += 1) {
      const row = layer[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
        const cell = row[colIndex];
        const x = colIndex * this.cellSize;
        const z = -rowIndex * this.cellSize;

        if (cell !== MultiLayerMaze.OPENING_CELL_VALUE) {
          const smallFloor = this.meshFactory.createSmallFloor(x, layerHeight, z, this.cellSize);
          mazeLayer.add(smallFloor);
          continue;
        }

        const canStandOnPreviousLayer = previousLayer[rowIndex]?.[colIndex] !== 1;
        if (!canStandOnPreviousLayer) {
          continue;
        }

        const connector = this.meshFactory.createStairConnector({
          x,
          y: connectorBaseHeight,
          z,
          cellSize: this.cellSize,
          riseHeight: this.wallHeight,
          stepCount: MultiLayerMaze.STAIR_STEP_COUNT,
        });
        previousLayerObject.add(connector);
      }
    }
  }

  /**
   * Create main floor (ground floor)
   */
  private createMainFloor(layer: number[][], mazeLayer: THREE.Object3D): void {
    const floorWidth = layer[0].length * this.cellSize;
    const floorHeight = layer.length * this.cellSize;

    const floor = this.meshFactory.createFloor({
      x: floorWidth / 2 - this.cellSize / 2,
      y: -this.wallThickness / 2,
      z: -(floorHeight / 2) + this.cellSize / 2,
      width: floorWidth,
      height: floorHeight,
    });

    mazeLayer.add(floor);
  }

  /**
   * Position camera for multi-layer maze
   */
  private positionCameraForMultiLayer(): void {
    const firstLayer = this.maze[0];
    const mazeCenterX = (firstLayer[0].length * this.cellSize) / 2 - this.cellSize / 2;
    const mazeCenterZ = -(firstLayer.length * this.cellSize) / 2 + this.cellSize / 2;
    const distance = this.maze.length * this.cellSize;

    this.positionCamera(mazeCenterX, mazeCenterZ, distance);
  }
}
