import type { GeneratedMazeResult } from '../algorithms/binary-tree';
import type { GeneratorRunInput, MazeTopologyId, ShaftDensity } from './types';

export interface TopologyAdapter {
  readonly topology: MazeTopologyId;
  adaptInput(input: GeneratorRunInput): GeneratorRunInput;
  adaptOutput(output: GeneratedMazeResult, input: GeneratorRunInput): GeneratedMazeResult;
}

class IdentityTopologyAdapter implements TopologyAdapter {
  public readonly topology: MazeTopologyId;

  constructor(topology: MazeTopologyId) {
    this.topology = topology;
  }

  public adaptInput(input: GeneratorRunInput): GeneratorRunInput {
    return input;
  }

  public adaptOutput(output: GeneratedMazeResult, input: GeneratorRunInput): GeneratedMazeResult {
    void input;
    return output;
  }
}

class MultiLayerRectTopologyAdapter implements TopologyAdapter {
  public readonly topology: MazeTopologyId = 'multiLayerRect';

  public adaptInput(input: GeneratorRunInput): GeneratorRunInput {
    const layers = this.normalizeLayerCount(input.topologyParams?.layers);
    const shaftDensity = this.normalizeShaftDensity(input.topologyParams?.shaftDensity);
    return {
      ...input,
      topologyParams: {
        ...input.topologyParams,
        layers,
        shaftDensity,
      },
    };
  }

  public adaptOutput(output: GeneratedMazeResult, input: GeneratorRunInput): GeneratedMazeResult {
    const baseLayer = output.maze[0];
    if (!baseLayer || !Array.isArray(baseLayer[0])) {
      return output;
    }

    const layerCount = this.normalizeLayerCount(input.topologyParams?.layers);
    if (layerCount <= 1) {
      return output;
    }

    const layers = Array.from({ length: layerCount }, () => cloneLayer(baseLayer));
    const shaftDensity = this.normalizeShaftDensity(input.topologyParams?.shaftDensity);
    this.applyVerticalShafts(layers, output, shaftDensity);

    return {
      maze: layers,
      markers: output.markers,
    };
  }

  private normalizeLayerCount(value: number | undefined): number {
    const parsed = Number.isFinite(value) ? Math.floor(value as number) : 3;
    return clamp(parsed, 2, 30);
  }

  private normalizeShaftDensity(value: ShaftDensity | undefined): ShaftDensity {
    if (value === 'sparse' || value === 'dense') {
      return value;
    }
    return 'normal';
  }

  private applyVerticalShafts(
    layers: number[][][],
    output: GeneratedMazeResult,
    shaftDensity: ShaftDensity
  ): void {
    const candidates = collectShaftCandidates(layers[0], output);
    if (candidates.length === 0) {
      return;
    }

    const transitionCount = layers.length - 1;
    const shaftsPerTransition = this.computeShaftCountPerTransition(candidates.length, shaftDensity);
    const totalShafts = Math.min(candidates.length, shaftsPerTransition * transitionCount);
    const shaftCells = pickShaftCells(candidates, totalShafts);
    if (shaftCells.length === 0) {
      return;
    }

    for (let z = 0; z < transitionCount; z += 1) {
      for (let i = 0; i < shaftsPerTransition; i += 1) {
        const cellIndex = (z * shaftsPerTransition + i) % shaftCells.length;
        const cell = shaftCells[cellIndex];
        layers[z][cell.row][cell.col] = 2;
        layers[z + 1][cell.row][cell.col] = 2;
      }
    }
  }

  private computeShaftCountPerTransition(candidateCount: number, shaftDensity: ShaftDensity): number {
    const ratioByDensity: Record<ShaftDensity, number> = {
      sparse: 0.015,
      normal: 0.03,
      dense: 0.06,
    };
    const ratio = ratioByDensity[shaftDensity];
    return clamp(Math.round(candidateCount * ratio), 1, 8);
  }
}

interface GridCell {
  row: number;
  col: number;
}

function cloneLayer(layer: number[][]): number[][] {
  return layer.map(row => row.slice());
}

function collectShaftCandidates(layer: number[][], output: GeneratedMazeResult): GridCell[] {
  const walkable = collectInteriorWalkableCells(layer);
  if (walkable.length === 0) {
    return [];
  }

  const excluded = new Set<string>();
  if (output.markers.start) {
    excluded.add(`${output.markers.start.row},${output.markers.start.col}`);
  }
  if (output.markers.end) {
    excluded.add(`${output.markers.end.row},${output.markers.end.col}`);
  }

  const filtered = walkable.filter(cell => !excluded.has(`${cell.row},${cell.col}`));
  const source = filtered.length > 0 ? filtered : walkable;
  const entry =
    source.find(cell => cell.row === output.markers.start.row && cell.col === output.markers.start.col) ??
    source[0];

  return collectReachableInteriorCells(layer, entry, excluded);
}

function collectInteriorWalkableCells(layer: number[][]): GridCell[] {
  const rows = layer.length;
  const cols = layer[0]?.length ?? 0;
  const cells: GridCell[] = [];
  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (layer[row][col] === 0) {
        cells.push({ row, col });
      }
    }
  }
  return cells;
}

function collectReachableInteriorCells(
  layer: number[][],
  start: GridCell,
  excluded: Set<string>
): GridCell[] {
  const rows = layer.length;
  const cols = layer[0]?.length ?? 0;
  const queue: GridCell[] = [start];
  const visited = new Set<string>([`${start.row},${start.col}`]);
  const result: GridCell[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as GridCell;
    const key = `${current.row},${current.col}`;
    const isInterior =
      current.row > 0 && current.row < rows - 1 && current.col > 0 && current.col < cols - 1;
    if (isInterior && layer[current.row][current.col] === 0 && !excluded.has(key)) {
      result.push(current);
    }

    const neighbors: GridCell[] = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];
    neighbors.forEach(next => {
      if (next.row <= 0 || next.row >= rows - 1 || next.col <= 0 || next.col >= cols - 1) {
        return;
      }
      if (layer[next.row][next.col] !== 0) {
        return;
      }
      const nextKey = `${next.row},${next.col}`;
      if (visited.has(nextKey)) {
        return;
      }
      visited.add(nextKey);
      queue.push(next);
    });
  }

  return result;
}

function pickShaftCells(candidates: GridCell[], count: number): GridCell[] {
  if (count <= 0 || candidates.length === 0) {
    return [];
  }
  if (candidates.length <= count) {
    return candidates.slice();
  }

  const picked: GridCell[] = [];
  const center = averagePoint(candidates);
  let first = candidates[0];
  let firstDistance = -1;
  candidates.forEach(cell => {
    const distance = squaredDistance(cell, center);
    if (distance > firstDistance) {
      firstDistance = distance;
      first = cell;
    }
  });
  picked.push(first);

  while (picked.length < count) {
    let best: GridCell | null = null;
    let bestScore = -1;
    candidates.forEach(cell => {
      if (picked.some(p => p.row === cell.row && p.col === cell.col)) {
        return;
      }
      let nearest = Number.POSITIVE_INFINITY;
      picked.forEach(chosen => {
        nearest = Math.min(nearest, squaredDistance(cell, chosen));
      });
      if (nearest > bestScore) {
        bestScore = nearest;
        best = cell;
      }
    });
    if (!best) {
      break;
    }
    picked.push(best);
  }

  return picked;
}

function averagePoint(cells: GridCell[]): GridCell {
  let rowSum = 0;
  let colSum = 0;
  cells.forEach(cell => {
    rowSum += cell.row;
    colSum += cell.col;
  });
  return {
    row: rowSum / cells.length,
    col: colSum / cells.length,
  };
}

function squaredDistance(a: GridCell, b: GridCell): number {
  const dr = a.row - b.row;
  const dc = a.col - b.col;
  return dr * dr + dc * dc;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const ADAPTERS: Record<MazeTopologyId, TopologyAdapter> = {
  singleLayerRect: new IdentityTopologyAdapter('singleLayerRect'),
  multiLayerRect: new MultiLayerRectTopologyAdapter(),
  hexagonal: new IdentityTopologyAdapter('hexagonal'),
  triangular: new IdentityTopologyAdapter('triangular'),
  circular: new IdentityTopologyAdapter('circular'),
};

export function getTopologyAdapter(topology: MazeTopologyId): TopologyAdapter {
  return ADAPTERS[topology];
}
