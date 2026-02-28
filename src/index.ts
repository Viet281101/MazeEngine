/**
 * Main exports for 3D Maze Visualizer
 */

// Resources
export { ResourceManager } from './resources/resource-manager';
export { DisposalHelper } from './resources/disposal-helper';
export { MeshFactory } from './resources/mesh-factory';
export type { WallParams, FloorParams } from './resources/mesh-factory';

// Maze classes
export { Maze } from './maze/maze';
export type { MazeConfig } from './maze/maze';
export { SingleLayerMaze } from './maze/single-layer-maze';
export { MultiLayerMaze } from './maze/multi-layer-maze';

// GUI
export { GUIController } from './gui';
export type { GUISettings } from './gui';

// Main controller
export type { MazeController } from './maze/maze-controller';
