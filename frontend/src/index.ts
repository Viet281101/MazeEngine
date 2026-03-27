/**
 * Main exports for 3D Maze Visualizer
 */

// Resources
export { ResourceManager } from './resources/resource-manager';
export { DisposalHelper } from './resources/disposal-helper';
export { MeshFactory } from './resources/mesh-factory';
export type { WallParams, FloorParams } from './resources/mesh-factory';

// Maze classes
export * from './maze';

// GUI
export { GUIController } from './gui';
export type { GUISettings } from './gui';
