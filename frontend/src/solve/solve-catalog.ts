import { CLASSICAL_SOLVE_ALGORITHM_KEYS } from './classical';
import { HEURISTIC_SOLVE_ALGORITHM_KEYS } from './heuristic';
import { METAHEURISTIC_SOLVE_ALGORITHM_KEYS } from './metaheuristic';
import { NAVIGATION_SOLVE_ALGORITHM_KEYS } from './navigation';
import { SHORTEST_PATH_SOLVE_ALGORITHM_KEYS } from './shortest-path';

const CATEGORY_FILE_KEYS = {
  classical: CLASSICAL_SOLVE_ALGORITHM_KEYS,
  shortestPath: SHORTEST_PATH_SOLVE_ALGORITHM_KEYS,
  heuristic: HEURISTIC_SOLVE_ALGORITHM_KEYS,
  navigation: NAVIGATION_SOLVE_ALGORITHM_KEYS,
  metaheuristic: METAHEURISTIC_SOLVE_ALGORITHM_KEYS,
} as const;

export type SolveAlgorithmCategory = keyof typeof CATEGORY_FILE_KEYS;
export type SolveAlgorithmFileKey = (typeof CATEGORY_FILE_KEYS)[SolveAlgorithmCategory][number];

export interface SolveAlgorithmDefinition {
  id: SolveAlgorithmFileKey;
  fileKey: SolveAlgorithmFileKey;
  category: SolveAlgorithmCategory;
  label: string;
}

const UPPERCASE_TOKENS = new Set([
  'a',
  'bfs',
  'bug1',
  'bug2',
  'dfs',
  'ida',
  'iddfs',
  'k',
  'q',
  'spfa',
]);

function toAlgorithmLabel(fileKey: SolveAlgorithmFileKey): string {
  return fileKey
    .split('-')
    .map(token => {
      if (UPPERCASE_TOKENS.has(token)) {
        return token.toUpperCase();
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
}

const categoryEntries = Object.entries(CATEGORY_FILE_KEYS) as [
  SolveAlgorithmCategory,
  readonly SolveAlgorithmFileKey[],
][];

// NOTE: This catalog intentionally includes algorithms planned for future feature tasks.
// Some algorithm implementation files are placeholders while UI/content is prepared in advance.
export const SOLVE_ALGORITHMS_BY_CATEGORY: Readonly<
  Record<SolveAlgorithmCategory, readonly SolveAlgorithmDefinition[]>
> = categoryEntries.reduce(
  (acc, [category, fileKeys]) => {
    acc[category] = fileKeys.map(fileKey => ({
      id: fileKey,
      fileKey,
      category,
      label: toAlgorithmLabel(fileKey),
    }));
    return acc;
  },
  {} as Record<SolveAlgorithmCategory, readonly SolveAlgorithmDefinition[]>
);
