import {
  getGeneratorsForTopology,
  type GeneratorDefinition,
  type GeneratorId,
  type MazeTopologyId,
} from '../../../generator';
import type { TranslationKey } from '../../i18n';

export interface GeneratorUiDefinition extends GeneratorDefinition {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}

export const TOPOLOGIES: readonly MazeTopologyId[] = [
  'singleLayerRect',
  'multiLayerRect',
  'hexagonal',
  'triangular',
  'circular',
];

export const TOPOLOGY_LAYER_LIMITS = {
  min: 2,
  max: 30,
  defaultValue: 3,
} as const;

const GENERATOR_I18N: Record<
  GeneratorId,
  { titleKey: TranslationKey; descriptionKey: TranslationKey }
> = {
  binaryTree: {
    titleKey: 'generate.binaryTree',
    descriptionKey: 'generate.binaryTreeDescription',
  },
  recursiveBacktrack: {
    titleKey: 'generate.recursiveBacktrack',
    descriptionKey: 'generate.recursiveBacktrackDescription',
  },
  recursiveDivision: {
    titleKey: 'generate.recursiveDivision',
    descriptionKey: 'generate.recursiveDivisionDescription',
  },
  prim: {
    titleKey: 'generate.prim',
    descriptionKey: 'generate.primDescription',
  },
  kruskal: {
    titleKey: 'generate.kruskal',
    descriptionKey: 'generate.kruskalDescription',
  },
  wilson: {
    titleKey: 'generate.wilson',
    descriptionKey: 'generate.wilsonDescription',
  },
};

export function getGeneratorUiDefinitions(
  topology: MazeTopologyId
): readonly GeneratorUiDefinition[] {
  return getGeneratorsForTopology(topology).map(generator => ({
    ...generator,
    titleKey: GENERATOR_I18N[generator.id].titleKey,
    descriptionKey: GENERATOR_I18N[generator.id].descriptionKey,
  }));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
