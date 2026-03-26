# Architecture Overview

## Repository Layout

- `frontend/`: the client application and all user-facing maze features
- `backend/`: Supabase local backend config and SQL migrations
- `docs/`: contributor-facing project documentation
- root `package.json`: convenience scripts for running frontend and backend together

## High-Level Modules

- `frontend/src/main.ts`, `frontend/src/index.ts`: app entry and startup wiring.
- `frontend/src/app`: main app orchestration (`MainApp`, preview manager, mesh settings).
- `frontend/src/maze`: maze data structures and controllers.
- `frontend/src/generator`: maze generation algorithms and dispatch system.
- `frontend/src/solve`: maze solving algorithms catalog.
- `frontend/src/sidebar`: toolbar + popup UI (account, maze editor, generate, solve, settings, tutorial).
- `frontend/src/lib`: Supabase client, auth helpers, and maze persistence helpers.
- `frontend/src/resources`: mesh/resource lifecycle helpers.
- `backend/supabase/migrations`: SQL schema and policy history for local/prod database.

## Generation Flow (Generate Popup)

1. UI entry point:
   - `frontend/src/sidebar/popup/generate/index.ts`
   - Builds topology selector, topology parameters, and generator list UI.
2. Generator row controls:
   - `frontend/src/sidebar/popup/generate/generator-row.ts`
   - Collects rows/cols/(optional) north bias and triggers generation.
3. Runtime dispatch:
   - `frontend/src/sidebar/popup/generate/generate-runner.ts`
   - Tries worker execution first, then falls back to main thread if worker fails.
4. Worker execution:
   - `frontend/src/generator/worker.ts`
   - Receives task, calls `executeGenerator`, posts response.
5. Registry and adaptation:
   - `frontend/src/generator/core/registry.ts`
   - Validates generator availability + topology support.
   - Uses topology adapter (`frontend/src/generator/core/topology-adapters.ts`) for input/output adaptation.
   - Applies shared validation rules via `applyCommonMazeRules`.
6. App update:
   - `mazeApp.updateMaze(...)` applies generated maze and markers.

## Account and Persistence Flow

1. Toolbar button:
   - `frontend/src/sidebar/toolbar-config.ts`
   - Adds the Account popup entry and icon.
2. Account popup UI:
   - `frontend/src/sidebar/popup/account/index.ts`
   - Collects email/password and save/load actions.
3. Auth runtime:
   - `frontend/src/lib/auth-service.ts`
   - Handles sign-up, sign-in, sign-out, and current-user lookup.
4. Persistence runtime:
   - `frontend/src/lib/maze-storage-service.ts`
   - Saves maze payloads and lists stored mazes through Supabase.
5. Database:
   - `backend/supabase/migrations/20260326143000_init_auth_and_mazes.sql`
   - Stores per-user maze payloads in `public.mazes` with RLS enabled.

## Key Design Decisions

- Worker-first generation keeps UI responsive for expensive algorithms.
- Topology adapter layer allows generator implementations to stay focused on core grid behavior.
- Registry (`GENERATOR_CATALOG`) is the single source of truth for availability + support matrix.
- Popup i18n keys keep UI strings centralized and translatable.
- Shared rule enforcement keeps generators consistent across single-layer and multi-layer mazes.
- Root scripts coordinate `frontend/` and `backend/` so new contributors can start the full stack from one place.
- Maze persistence stores the full maze payload as `jsonb` to keep the early backend simple and flexible.

## Common Rules

See `docs/maze-rules.md` for the shared rule list, defaults, and rule context parameters.

## Operational Notes

- Active run token in `generate-runner.ts` prevents stale generation results from overwriting newer output.
- `disposeGenerationRunner()` is called when popup container is removed to avoid dangling workers.
- In dev mode, generation/update performance logs are emitted via `console.debug`.
- `npm run dev` depends on Docker access because `supabase start` runs local services through Docker.
