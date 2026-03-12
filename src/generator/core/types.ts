import type { GeneratedMazeResult } from '../algorithms/binary-tree';

export type MazeTopologyId =
  | 'singleLayerRect'
  | 'multiLayerRect'
  | 'hexagonal'
  | 'triangular'
  | 'circular';

export type ShaftDensity = 'sparse' | 'normal' | 'dense';
export type MazeComplexity = 'low' | 'normal' | 'high';

export type GeneratorId =
  | 'binaryTree'
  | 'recursiveBacktrack'
  | 'recursiveDivision'
  | 'prim'
  | 'kruskal'
  | 'wilson';

export interface GeneratorRunInput {
  rows: number;
  cols: number;
  params?: {
    northBias?: number;
    randomizeStartEnd?: boolean;
    complexity?: MazeComplexity;
  };
  topologyParams?: {
    layers?: number;
    shaftDensity?: ShaftDensity;
  };
}

export interface GeneratorDefinition {
  id: GeneratorId;
  available: boolean;
  supportedTopologies: readonly MazeTopologyId[];
  run?: (input: GeneratorRunInput) => GeneratedMazeResult;
}
