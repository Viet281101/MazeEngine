/// <reference lib="webworker" />

import { executeGenerator } from './core/registry';
import type { GenerateTaskRequest, GenerateTaskResponse } from './worker-protocol';

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<GenerateTaskRequest>) => {
  const task = event.data;
  let response: GenerateTaskResponse;

  try {
    const generated = executeGenerator(task.generatorId, task.topology, task.input);
    response = {
      requestId: task.requestId,
      ok: true,
      generated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation error';
    response = {
      requestId: task.requestId,
      ok: false,
      error: message,
    };
  }

  workerScope.postMessage(response);
};

export {};
