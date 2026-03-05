import { Maze, MazeConfig } from './maze';
import * as THREE from 'three';

/**
 * SingleLayerMaze - Maze with a single layer
 */
export class SingleLayerMaze extends Maze {
  constructor(canvas: HTMLCanvasElement, maze: number[][][], config?: MazeConfig) {
    super(canvas, maze, config);
  }

  protected createMaze(): void {
    this.deleteMaze();

    const mazeLayer = new THREE.Object3D();
    const layer = this.maze[0];
    if (!Array.isArray(layer) || layer.length === 0 || !Array.isArray(layer[0])) {
      this.mazeLayers.push(mazeLayer);
      this.scene.add(mazeLayer);
      this.positionCamera(0, 0, this.cellSize);
      return;
    }

    // Create walls
    this.createWallsForLayer(layer, 0, mazeLayer);

    // Create main floor
    this.createMainFloorForLayer(layer, mazeLayer, 0);

    // Add to scene
    this.mazeLayers.push(mazeLayer);
    this.scene.add(mazeLayer);

    // Position camera
    this.positionCameraForMaze(layer);
  }

  /**
   * Position camera to view entire maze
   */
  private positionCameraForMaze(layer: number[][]): void {
    const rows = layer.length;
    const cols = layer[0]?.length ?? 0;
    if (rows === 0 || cols === 0) {
      this.positionCamera(0, 0, this.cellSize);
      return;
    }
    const mazeCenterX = (cols * this.cellSize) / 2 - this.cellSize / 2;
    const mazeCenterZ = -(rows * this.cellSize) / 2 + this.cellSize / 2;
    const distance = rows * this.cellSize;

    this.positionCamera(mazeCenterX, mazeCenterZ, distance);
  }
}
