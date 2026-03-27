import type { GeneratedMazeResult } from './algorithms/binary-tree';
import type { GeneratorId, GeneratorRunInput, MazeTopologyId } from './core/types';

export interface GenerateTaskRequest {
  requestId: number;
  generatorId: GeneratorId;
  topology: MazeTopologyId;
  input: GeneratorRunInput;
}

export interface GenerateTaskSuccess {
  requestId: number;
  ok: true;
  generated: GeneratedMazeResult | null;
}

export interface GenerateTaskFailure {
  requestId: number;
  ok: false;
  error: string;
}

export type GenerateTaskResponse = GenerateTaskSuccess | GenerateTaskFailure;
