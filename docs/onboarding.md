# Onboarding (10–20 Minutes)

This guide is a fast path to understand the repo and make a first change safely.

## 1. Quick Start

```bash
npm --prefix frontend install
npm install
npm run supabase:start
npm run supabase:status
npm run dev
```

Open the Vite URL shown in the terminal.

If this is your first time on the repo:

1. Make sure Docker is running.
2. Run `npm run supabase:init` once if `backend/config.toml` has not been created yet.
3. Run `npm run supabase:reset` after migrations change.
4. Create `frontend/.env` from `frontend/.env.example` and copy the local anon key from
   `npm run supabase:status`.

## 2. Map the Project (File Landmarks)

Core areas you will touch most often:

- **Workspace entry points**
  - `package.json`
  - `frontend/package.json`
  - `backend/supabase/README.md`
- **Generate popup UI**
  - `frontend/src/sidebar/popup/generate/index.ts`
  - `frontend/src/sidebar/popup/generate/generator-row.ts`
- **Account/auth + saved mazes**
  - `frontend/src/sidebar/popup/account/index.ts`
  - `frontend/src/lib/auth-service.ts`
  - `frontend/src/lib/maze-storage-service.ts`
- **Generator registry + adapters**
  - `frontend/src/generator/core/registry.ts`
  - `frontend/src/generator/core/topology-adapters.ts`
- **Maze rules**
  - `frontend/src/generator/core/maze-rules.ts`
  - `docs/maze-rules.md`
- **Generators**
  - `frontend/src/generator/algorithms/*`
- **Database schema**
  - `backend/supabase/migrations/*`

Supporting docs:

- `docs/architecture.md`
- `docs/how-to-add-generator.md`

## 3. How Generate Works (Mental Model)

1. User picks a topology and generator in the popup.
2. UI collects params in `generator-row.ts` and calls `runGeneration`.
3. `generate-runner.ts` dispatches to the worker (or main thread fallback).
4. Registry adapts input/output and applies shared rules.
5. The maze is updated in the app.
6. If the user is signed in, they can save/load mazes from the Account popup through Supabase.

## 4. First Change: Add a Small Option (Example)

A good first task is adding a small option to Binary Tree and wiring it through:

1. **UI**
   - Add a control in `frontend/src/sidebar/popup/generate/generator-row.ts`.
2. **Runner input**
   - Pass the new value via `GenerateAction`.
3. **Generator params**
   - Update `frontend/src/generator/core/types.ts` to add the field.
   - Use it in `frontend/src/generator/algorithms/binary-tree.ts`.
4. **Rules (optional)**
   - If it is a shared rule, add it in `frontend/src/generator/core/maze-rules.ts`.
   - Update `docs/maze-rules.md`.

## 5. Quality Gate

```bash
npm run lint
npm run check:multilayer
npm run build
npm run test
```

## 6. Common Pitfalls

- **i18n keys**: UI labels must exist in `frontend/src/i18n/locales/*.json`.
- **New repo layout**: almost all app code now lives under `frontend/src`, not root `src`.
- **Supabase env**: account/save/load UI will not work until `frontend/.env` contains the local URL and anon key.
- **Docker permissions**: if `npm run dev` fails at `supabase start`, your shell session may not have Docker group access yet.
- **Rule defaults**: If you add a rule param, normalize it in `maze-rules.ts`.
- **Multi-layer quirks**: Remember connector rules only apply to multi-layer output.
- **UI state**: Avoid overwriting user inputs if they already edited a field.

## 7. Where to Ask Questions

If you are unsure about a rule or topology behavior, check `docs/maze-rules.md` and
`docs/architecture.md`. When in doubt, add a short note to docs as part of the change.
