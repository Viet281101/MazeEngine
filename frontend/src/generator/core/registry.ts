import { generateBinaryTreeMaze } from '../algorithms/binary-tree';
import type { GeneratedMazeResult } from '../algorithms/binary-tree';
import { applyCommonMazeRules, DEFAULT_GENERATION_ATTEMPTS } from './maze-rules';
import { getTopologyAdapter } from './topology-adapters';
import type { GeneratorDefinition, GeneratorId, GeneratorRunInput, MazeTopologyId } from './types';

const RECT_GRID_TOPOLOGIES: readonly MazeTopologyId[] = ['singleLayerRect', 'multiLayerRect'];

// NOTE: Generators marked unavailable are intentional placeholders for future feature tasks.
// Keep their IDs in catalog so UI/i18n wiring remains stable across incremental deliveries.
export const GENERATOR_CATALOG: readonly GeneratorDefinition[] = [
  {
    id: 'binaryTree',
    available: true,
    supportedTopologies: RECT_GRID_TOPOLOGIES,
    run: input =>
      generateBinaryTreeMaze(input.rows, input.cols, {
        northBias: input.params?.northBias,
        randomizeStartEnd: input.params?.randomizeStartEnd,
        randomizeStartEndLayers: input.params?.randomizeStartEndLayers,
        forceDifferentLayers: input.params?.forceDifferentLayers,
        minConnectorDistance: input.params?.minConnectorDistance,
        minConnectorsPerTransition: input.params?.minConnectorsPerTransition,
        maxConnectorsPerTransition: input.params?.maxConnectorsPerTransition,
        noConnectorOnBorder: input.params?.noConnectorOnBorder,
        complexity: input.params?.complexity,
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
  let lastOutput: GeneratedMazeResult | null = null;
  for (let attempt = 0; attempt < DEFAULT_GENERATION_ATTEMPTS; attempt += 1) {
    const generated = generator.run(adaptedInput);
    const adaptedOutput = topologyAdapter.adaptOutput(generated, adaptedInput);
    const ruleResult = applyCommonMazeRules(adaptedOutput, topology, {
      complexity: adaptedInput.params?.complexity,
      minConnectorDistance: adaptedInput.params?.minConnectorDistance,
      minConnectorsPerTransition: adaptedInput.params?.minConnectorsPerTransition,
      maxConnectorsPerTransition: adaptedInput.params?.maxConnectorsPerTransition,
      noConnectorOnBorder: adaptedInput.params?.noConnectorOnBorder,
    });
    lastOutput = adaptedOutput;
    if (ruleResult.ok) {
      return adaptedOutput;
    }
  }
  return lastOutput;
}
