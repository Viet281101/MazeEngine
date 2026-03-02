import {
  executeGenerator,
  type GeneratedMazeResult,
  type GeneratorId,
  type GeneratorRunInput,
  type MazeTopologyId,
  type ShaftDensity,
} from '../../../generator';
import type { GenerateTaskRequest, GenerateTaskResponse } from '../../../generator/worker-protocol';
import { t } from '../../i18n';

interface MultiLayerTopologyParams {
  layers: number;
  shaftDensity: ShaftDensity;
}

interface RunGenerationInput {
  generatorId: GeneratorId;
  topology: MazeTopologyId;
  rows: number;
  cols: number;
  northBias: number;
  multiLayerParams?: MultiLayerTopologyParams;
}

class GenerationWorkerClient {
  private readonly worker: Worker;
  private nextRequestId = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (result: GeneratedMazeResult | null) => void;
      reject: (error: Error) => void;
    }
  >();

  constructor() {
    this.worker = new Worker(new URL('../../../generator/worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.addEventListener('message', (event: MessageEvent<GenerateTaskResponse>) => {
      const response = event.data;
      const resolver = this.pending.get(response.requestId);
      if (!resolver) {
        return;
      }
      this.pending.delete(response.requestId);
      if (response.ok) {
        resolver.resolve(response.generated);
      } else {
        resolver.reject(new Error(response.error));
      }
    });

    this.worker.addEventListener('error', event => {
      const error = new Error(event.message || 'Generator worker error');
      this.flushPendingWithError(error);
    });
  }

  public run(
    generatorId: GeneratorId,
    topology: MazeTopologyId,
    input: GeneratorRunInput
  ): Promise<GeneratedMazeResult | null> {
    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId;
      this.nextRequestId += 1;
      this.pending.set(requestId, { resolve, reject });
      const task: GenerateTaskRequest = {
        requestId,
        generatorId,
        topology,
        input,
      };
      this.worker.postMessage(task);
    });
  }

  private flushPendingWithError(error: Error): void {
    this.pending.forEach(resolver => resolver.reject(error));
    this.pending.clear();
  }

  public dispose(): void {
    this.flushPendingWithError(new Error('Generator worker disposed'));
    this.worker.terminate();
  }
}

let workerClient: GenerationWorkerClient | null = null;
let workerUnavailable = false;
let latestRunToken = 0;

function shouldLogPerf(): boolean {
  return import.meta.env.DEV;
}

function logPerf(stage: string, durationMs: number): void {
  if (!shouldLogPerf()) {
    return;
  }
  console.debug(`[generate] ${stage}: ${durationMs.toFixed(2)}ms`);
}

function getWorkerClient(): GenerationWorkerClient | null {
  if (workerUnavailable || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerClient) {
    try {
      workerClient = new GenerationWorkerClient();
    } catch (error) {
      workerUnavailable = true;
      console.warn('Generator worker initialization failed. Falling back to main thread.', error);
      return null;
    }
  }
  return workerClient;
}

async function generateMaze(input: RunGenerationInput): Promise<GeneratedMazeResult | null> {
  const generatorInput: GeneratorRunInput = {
    rows: input.rows,
    cols: input.cols,
    params: { northBias: input.northBias },
    topologyParams: input.topology === 'multiLayerRect' ? input.multiLayerParams : undefined,
  };
  const client = getWorkerClient();
  if (!client) {
    return executeGenerator(input.generatorId, input.topology, generatorInput);
  }

  try {
    return await client.run(input.generatorId, input.topology, generatorInput);
  } catch (error) {
    workerUnavailable = true;
    console.warn('Generator worker execution failed. Falling back to main thread.', error);
    return executeGenerator(input.generatorId, input.topology, generatorInput);
  }
}

export async function runGeneration(input: RunGenerationInput): Promise<void> {
  const mazeApp = window.mazeApp;
  if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
    console.warn('mazeApp.updateMaze not available');
    window.alert(t('generate.appUnavailable'));
    return;
  }

  const runToken = latestRunToken + 1;
  latestRunToken = runToken;
  const startedAt = performance.now();
  const generated = await generateMaze(input);
  logPerf('generate', performance.now() - startedAt);

  if (runToken !== latestRunToken) {
    return;
  }
  if (!generated) {
    console.warn(
      `Generator "${input.generatorId}" is unavailable for topology "${input.topology}"`
    );
    return;
  }

  const updateStartedAt = performance.now();
  mazeApp.updateMaze(
    generated.maze,
    input.topology === 'multiLayerRect',
    {
      start: generated.markers.start,
      end: generated.markers.end,
    },
    {
      preserveCamera: true,
    }
  );
  logPerf('updateMaze', performance.now() - updateStartedAt);
}

export function disposeGenerationRunner(): void {
  if (workerClient) {
    workerClient.dispose();
    workerClient = null;
  }
  workerUnavailable = false;
  latestRunToken += 1;
}
