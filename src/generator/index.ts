export {
  generateBinaryTreeMaze,
  type GeneratedMazeResult,
  type MazeMarker,
} from './algorithms/binary-tree';
export {
  GENERATOR_CATALOG,
  executeGenerator,
  getGeneratorById,
  getGeneratorsForTopology,
} from './core/registry';
export { getTopologyAdapter, type TopologyAdapter } from './core/topology-adapters';
export type {
  GeneratorDefinition,
  GeneratorId,
  GeneratorRunInput,
  MazeComplexity,
  MazeTopologyId,
  ShaftDensity,
} from './core/types';
