import { generateBinaryTreeMaze } from '../algorithms/binary-tree';
import { getTopologyAdapter } from './topology-adapters';
import type { GeneratorDefinition, GeneratorId, GeneratorRunInput, MazeTopologyId } from './types';

const RECT_GRID_TOPOLOGIES: readonly MazeTopologyId[] = ['singleLayerRect', 'multiLayerRect'];

export const GENERATOR_CATALOG: readonly GeneratorDefinition[] = [
  {
    id: 'binaryTree',
    available: true,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
    run: input =>
      generateBinaryTreeMaze(input.rows, input.cols, {
        northBias: input.params?.northBias,
        layers: input.topologyParams?.layers,
        shaftDensity: input.topologyParams?.shaftDensity,
      }),
  },
  {
    id: 'recursiveBacktrack',
    available: false,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
  },
  {
    id: 'recursiveDivision',
    available: false,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
  },
  {
    id: 'prim',
    available: false,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
  },
  {
    id: 'kruskal',
    available: false,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
  },
  {
    id: 'wilson',
    available: false,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
  },
];

export function getGeneratorsForTopology(topology: MazeTopologyId): readonly GeneratorDefinition[] {
  return GENERATOR_CATALOG.filter(generator => generator.supportedTopologies.includes(topology));
}

export function getGeneratorById(id: GeneratorId): GeneratorDefinition | undefined {
  return GENERATOR_CATALOG.find(generator => generator.id === id);
}

export function executeGenerator(
  id: GeneratorId,
  topology: MazeTopologyId,
  input: GeneratorRunInput
) {
  const generator = getGeneratorById(id);
  if (!generator || !generator.available || !generator.run) {
    return null;
  }
  if (!generator.supportedTopologies.includes(topology)) {
    return null;
  }
  const topologyAdapter = getTopologyAdapter(topology);
  const adaptedInput = topologyAdapter.adaptInput(input);
  const generated = generator.run(adaptedInput);
  return topologyAdapter.adaptOutput(generated, adaptedInput);
}
