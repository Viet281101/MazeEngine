import { Maze, MazeConfig } from '../core';
import * as THREE from 'three';
import { MULTI_LAYER_MAZE } from '../../constants/maze';
import { FLOOR_THICKNESS, type StairDirection } from '../../resources/mesh-factory';
import { computeLayerMetrics } from '../core/model';

const CONNECTOR_DIRECTION_BY_CELL_VALUE: Partial<Record<number, StairDirection>> = {
  [MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE]: 'north',
  [MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE]: 'east',
  [MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE]: 'south',
  [MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE]: 'west',
};

/**
 * MultiLayerMaze - Maze with multiple stacked layers
 */
export class MultiLayerMaze extends Maze {
  constructor(canvas: HTMLCanvasElement, maze: number[][][], config?: MazeConfig) {
    super(canvas, maze, config);
  }

  protected createMaze(): void {
    this.deleteMaze();

    this.maze.forEach((layer, layerIndex) => {
      const mazeLayer = new THREE.Object3D();
      const layerHeight = layerIndex * this.getLayerStride();

      // Create walls for this layer
      this.createWallsForLayer(layer, layerHeight, mazeLayer);

      // Create floors (except for first layer which has main floor)
      if (layerIndex > 0) {
        this.createLayerFloorsAndConnectors(layer, layerIndex, layerHeight, mazeLayer);
      } else {
        this.createMainFloorForLayer(layer, mazeLayer, 0);
      }

      this.mazeLayers.push(mazeLayer);
      this.scene.add(mazeLayer);
    });

    // Position camera
    this.positionCameraForMultiLayer();
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
    const connectorBaseHeight = (layerIndex - 1) * this.getLayerStride();

    for (let rowIndex = 0; rowIndex < layer.length; rowIndex += 1) {
      const row = layer[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
        const cell = row[colIndex];
        const x = colIndex * this.cellSize;
        const z = -rowIndex * this.cellSize;

        const directionFromCell = this.getDirectionFromConnectorCellValue(cell);
        const isConnectorCell =
          cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE || directionFromCell !== null;

        if (!isConnectorCell) {
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
          riseHeight: this.getLayerStride(),
          stepCount: MULTI_LAYER_MAZE.STAIR_STEP_COUNT,
          direction:
            directionFromCell ??
            this.inferConnectorDirection(previousLayer, rowIndex, colIndex) ??
            'east',
        });
        previousLayerObject.add(connector);
      }
    }
  }

  private getDirectionFromConnectorCellValue(cellValue: number): StairDirection | null {
    return CONNECTOR_DIRECTION_BY_CELL_VALUE[cellValue] ?? null;
  }

  private inferConnectorDirection(
    previousLayer: number[][],
    rowIndex: number,
    colIndex: number
  ): StairDirection | null {
    const candidates: Array<{ direction: StairDirection; row: number; col: number }> = [
      { direction: 'north', row: rowIndex - 1, col: colIndex },
      { direction: 'east', row: rowIndex, col: colIndex + 1 },
      { direction: 'south', row: rowIndex + 1, col: colIndex },
      { direction: 'west', row: rowIndex, col: colIndex - 1 },
    ];

    for (const candidate of candidates) {
      if (previousLayer[candidate.row]?.[candidate.col] !== 1) {
        return candidate.direction;
      }
    }
    return null;
  }

  /**
   * Position camera for multi-layer maze
   */
  private positionCameraForMultiLayer(): void {
    const metrics = computeLayerMetrics(this.maze[0], this.cellSize);
    if (!metrics) {
      this.positionCamera(0, 0, Math.max(this.maze.length, 1) * this.cellSize);
      return;
    }
    const distance = this.maze.length * this.cellSize;

    this.positionCamera(metrics.center.x, metrics.center.z, distance);
  }

  private getLayerStride(): number {
    return this.wallHeight + FLOOR_THICKNESS;
  }

  protected getLayerBaseY(layerIndex: number): number {
    return layerIndex * this.getLayerStride();
  }
}
