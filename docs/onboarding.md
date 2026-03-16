# Onboarding (10–20 Minutes)

This guide is a fast path to understand the repo and make a first change safely.

## 1. Quick Start

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## 2. Map the Project (File Landmarks)

Core areas you will touch most often:

- **Generate popup UI**
  - `src/sidebar/popup/generate/index.ts`
  - `src/sidebar/popup/generate/generator-row.ts`
- **Generator registry + adapters**
  - `src/generator/core/registry.ts`
  - `src/generator/core/topology-adapters.ts`
- **Maze rules**
  - `src/generator/core/maze-rules.ts`
  - `docs/maze-rules.md`
- **Generators**
  - `src/generator/algorithms/*`

Supporting docs:

- `docs/architecture.md`
- `docs/how-to-add-generator.md`

## 3. How Generate Works (Mental Model)

1. User picks a topology and generator in the popup.
2. UI collects params in `generator-row.ts` and calls `runGeneration`.
3. `generate-runner.ts` dispatches to the worker (or main thread fallback).
4. Registry adapts input/output and applies shared rules.
5. The maze is updated in the app.

## 4. First Change: Add a Small Option (Example)

A good first task is adding a small option to Binary Tree and wiring it through:

1. **UI**
   - Add a control in `src/sidebar/popup/generate/generator-row.ts`.
2. **Runner input**
   - Pass the new value via `GenerateAction`.
3. **Generator params**
   - Update `src/generator/core/types.ts` to add the field.
   - Use it in `src/generator/algorithms/binary-tree.ts`.
4. **Rules (optional)**
   - If it is a shared rule, add it in `src/generator/core/maze-rules.ts`.
   - Update `docs/maze-rules.md`.

## 5. Quality Gate

```bash
npm run lint
npm run build
npm run test
```

## 6. Common Pitfalls

- **i18n keys**: UI labels must exist in `src/i18n/locales/*.json`.
- **Rule defaults**: If you add a rule param, normalize it in `maze-rules.ts`.
- **Multi-layer quirks**: Remember connector rules only apply to multi-layer output.
- **UI state**: Avoid overwriting user inputs if they already edited a field.

## 7. Where to Ask Questions

If you are unsure about a rule or topology behavior, check `docs/maze-rules.md` and
`docs/architecture.md`. When in doubt, add a short note to docs as part of the change.
