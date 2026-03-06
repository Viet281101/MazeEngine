import { generateBinaryTreeMaze } from '../src/generator/algorithms/binary-tree';
import type { ShaftDensity } from '../src/generator/core/types';
import { MULTI_LAYER_MAZE } from '../src/constants/maze';
import { solveMultiLayerMazeWithBfs } from '../src/solve/runtime/multi-layer-bfs';

interface RunConfig {
  runs: number;
  rows: number;
  cols: number;
  layers: number;
  shaftDensity: ShaftDensity;
  solveRateThreshold: number;
}

interface ParsedArgs {
  key: string;
  value: string;
}

function parseArgs(argv: string[]): ParsedArgs[] {
  const parsed: ParsedArgs[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i] as string;
    if (!raw.startsWith('--')) {
      continue;
    }
    const body = raw.slice(2);
    const splitIndex = body.indexOf('=');
    if (splitIndex >= 0) {
      parsed.push({ key: body.slice(0, splitIndex), value: body.slice(splitIndex + 1) });
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      parsed.push({ key: body, value: next });
      i += 1;
      continue;
    }
    parsed.push({ key: body, value: 'true' });
  }
  return parsed;
}

function toInt(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function toFloat(value: string | undefined, fallback: number, min: number, max: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function toShaftDensity(value: string | undefined, fallback: ShaftDensity): ShaftDensity {
  if (value === 'sparse' || value === 'normal' || value === 'dense') {
    return value;
  }
  return fallback;
}

function readConfig(): RunConfig {
  const args = parseArgs(process.argv.slice(2));
  const getArg = (name: string): string | undefined =>
    args.find(entry => entry.key === name)?.value;

  return {
    runs: toInt(getArg('runs'), 300, 10, 5000),
    rows: toInt(getArg('rows'), 31, 5, 120),
    cols: toInt(getArg('cols'), 31, 5, 120),
    layers: toInt(getArg('layers'), 4, 2, 30),
    shaftDensity: toShaftDensity(getArg('shaftDensity'), 'normal'),
    solveRateThreshold: toFloat(getArg('solveRateThreshold'), 0.92, 0, 1),
  };
}

function isConnectorCellValue(cell: number): boolean {
  return (
    cell === MULTI_LAYER_MAZE.OPENING_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE ||
    cell === MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  );
}

function validateDirectedConnector(upperLayer: number[][], row: number, col: number): boolean {
  const connector = upperLayer[row]?.[col];
  if (
    connector !== MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE &&
    connector !== MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE &&
    connector !== MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE &&
    connector !== MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE
  ) {
    return true;
  }

  const directions: Record<number, { row: number; col: number }> = {
    [MULTI_LAYER_MAZE.OPENING_NORTH_CELL_VALUE]: { row: -1, col: 0 },
    [MULTI_LAYER_MAZE.OPENING_EAST_CELL_VALUE]: { row: 0, col: 1 },
    [MULTI_LAYER_MAZE.OPENING_SOUTH_CELL_VALUE]: { row: 1, col: 0 },
    [MULTI_LAYER_MAZE.OPENING_WEST_CELL_VALUE]: { row: 0, col: -1 },
  };
  const offset = directions[connector];
  const targetRow = row + offset.row;
  const targetCol = col + offset.col;
  const target = upperLayer[targetRow]?.[targetCol];
  return target !== undefined && target !== 1;
}

function runMonteCarlo(config: RunConfig): { solved: number; connectorInvalid: number } {
  let solved = 0;
  let connectorInvalid = 0;

  for (let i = 0; i < config.runs; i += 1) {
    const generated = generateBinaryTreeMaze(config.rows, config.cols, {
      northBias: Math.random(),
      layers: config.layers,
      shaftDensity: config.shaftDensity,
    });

    const markers = generated.markers;
    if (!markers.start || !markers.end) {
      continue;
    }

    for (let layerIndex = 1; layerIndex < generated.maze.length; layerIndex += 1) {
      const upperLayer = generated.maze[layerIndex] as number[][];
      for (let row = 1; row < upperLayer.length - 1; row += 1) {
        for (let col = 1; col < (upperLayer[0]?.length ?? 0) - 1; col += 1) {
          if (!isConnectorCellValue(upperLayer[row]?.[col] ?? 1)) {
            continue;
          }
          if (!validateDirectedConnector(upperLayer, row, col)) {
            connectorInvalid += 1;
          }
        }
      }
    }

    const path = solveMultiLayerMazeWithBfs(generated.maze, markers.start, markers.end);
    if (path && path.length > 1) {
      solved += 1;
    }
  }

  return { solved, connectorInvalid };
}

function main(): void {
  const config = readConfig();
  const startedAt = Date.now();
  const result = runMonteCarlo(config);
  const durationMs = Date.now() - startedAt;
  const solveRate = result.solved / config.runs;

  console.info('[check:multilayer] config', config);
  console.info('[check:multilayer] result', {
    runs: config.runs,
    solved: result.solved,
    solveRate: Number(solveRate.toFixed(4)),
    connectorInvalid: result.connectorInvalid,
    durationMs,
  });

  if (solveRate < config.solveRateThreshold) {
    console.error(
      `[check:multilayer] FAILED: solveRate ${solveRate.toFixed(4)} < threshold ${config.solveRateThreshold.toFixed(4)}`
    );
    process.exitCode = 1;
    return;
  }

  console.info('[check:multilayer] PASS');
}

main();
