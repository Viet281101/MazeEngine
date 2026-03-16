# How to Add a Generator

This guide describes the current workflow used in this repository.

## 1. Add Algorithm Implementation

Create a new file in `src/generator/algorithms/`, for example:

- `src/generator/algorithms/prim.ts`

Implementation contract:

- Return `GeneratedMazeResult` (`maze` + `markers.start/end`).
- Respect size limits (reuse `MAZE_SIZE` and clamp inputs).
- Keep algorithm deterministic only when intended (document random behavior).
- Common validation rules are applied in the registry via `applyCommonMazeRules`.
  - If your algorithm needs extra retries (e.g., randomness), you may re-run generation internally,
    but avoid duplicating fixes unless you need immediate feedback on rule failures.

## 2. Register Generator ID and Definition

Update `src/generator/core/types.ts`:

- Add new literal in `GeneratorId`.

Update `src/generator/core/registry.ts`:

- Import algorithm function.
- Add entry to `GENERATOR_CATALOG`:
  - `id`
  - `available`
  - `supportedTopologies`
  - `run` callback

If algorithm is not ready for users yet:

- Keep `available: false` and omit `run`.

## 3. Wire UI Labels/Descriptions

Update `src/sidebar/popup/generate/generate-config.ts`:

- Add i18n mapping for new `GeneratorId` in `GENERATOR_I18N`.

Update locale files:

- `src/i18n/locales/en.json`
- `src/i18n/locales/vi.json`
- `src/i18n/locales/fr.json`

Add keys:

- `generate.<id>`
- `generate.<id>Description`

## 4. Validate Popup Behavior

Run locally:

```bash
npm run dev
```

Manual checks:

- New generator row appears under supported topology.
- Badge is `Ready` when `available: true`.
- Clicking `Generate` updates maze and keeps app responsive.
- For unsupported topologies, generator does not appear.

## 5. Run Quality Gate

```bash
npm run lint
npm run build
npm run test
```

## 6. Optional: Worker/Perf Considerations

No worker-specific code is needed for normal additions because worker uses `executeGenerator` from the same registry.

If algorithm becomes heavy:

- Keep it pure and side-effect free.
- Avoid blocking operations beyond required computation.
- Use existing perf logs in `generate-runner.ts` to compare impact.

## 7. Common Rule Reference

See `docs/maze-rules.md` for the shared single-layer and multi-layer rule set and rule context parameters.
