# Architecture Overview

## High-Level Modules

- `src/main.ts`, `src/index.ts`: app entry and startup wiring.
- `src/app`: main app orchestration (`MainApp`, preview manager, mesh settings).
- `src/maze`: maze data structures and controllers.
- `src/generator`: maze generation algorithms and dispatch system.
- `src/solve`: maze solving algorithms catalog.
- `src/sidebar`: toolbar + popup UI (maze editor, generate, solve, settings, tutorial).
- `src/resources`: mesh/resource lifecycle helpers.

## Generation Flow (Generate Popup)

1. UI entry point:
   - `src/sidebar/popup/generate/index.ts`
   - Builds topology selector, topology parameters, and generator list UI.
2. Generator row controls:
   - `src/sidebar/popup/generate/generator-row.ts`
   - Collects rows/cols/(optional) north bias and triggers generation.
3. Runtime dispatch:
   - `src/sidebar/popup/generate/generate-runner.ts`
   - Tries worker execution first, then falls back to main thread if worker fails.
4. Worker execution:
   - `src/generator/worker.ts`
   - Receives task, calls `executeGenerator`, posts response.
5. Registry and adaptation:
   - `src/generator/core/registry.ts`
   - Validates generator availability + topology support.
   - Uses topology adapter (`src/generator/core/topology-adapters.ts`) for input/output adaptation.
   - Applies shared validation rules via `applyCommonMazeRules`.
6. App update:
   - `mazeApp.updateMaze(...)` applies generated maze and markers.

## Key Design Decisions

- Worker-first generation keeps UI responsive for expensive algorithms.
- Topology adapter layer allows generator implementations to stay focused on core grid behavior.
- Registry (`GENERATOR_CATALOG`) is the single source of truth for availability + support matrix.
- Popup i18n keys keep UI strings centralized and translatable.
- Shared rule enforcement keeps generators consistent across single-layer and multi-layer mazes.

## Common Rules

See `docs/maze-rules.md` for the shared rule list, defaults, and rule context parameters.

## Operational Notes

- Active run token in `generate-runner.ts` prevents stale generation results from overwriting newer output.
- `disposeGenerationRunner()` is called when popup container is removed to avoid dangling workers.
- In dev mode, generation/update performance logs are emitted via `console.debug`.
