# Contributing

## Development Setup

```bash
npm install
npm run dev
```

## Before Opening a PR

Run the quality gate locally:

```bash
npm run lint
npm run build
npm run test
```

`npm run test` already executes lint + build, but running all commands explicitly helps isolate failures faster.

## Coding Guidelines

- Keep TypeScript strict and explicit.
- Reuse existing constants/types instead of hardcoded values.
- Keep UI text in i18n locale files (`src/sidebar/locales/*.json`).
- For new feature logic, prefer small composable functions over large classes.
- Preserve existing naming style:
  - kebab-case for filenames
  - camelCase for variables/functions
  - PascalCase for classes/types/interfaces

## Feature Checklist

When adding or changing behavior:

- Update user-facing docs if workflow changed.
- Add or update translations in `en.json`, `vi.json`, and `fr.json` when needed.
- Verify new logic works with existing topologies and maze size constraints.
- Validate fallback paths (for example worker fallback to main thread in generation).

## Generator-Specific Changes

If you add a new generator algorithm, also update:

- `src/generator/core/types.ts` (new `GeneratorId` if needed)
- `src/generator/core/registry.ts` (register generator + topology support)
- `src/sidebar/popup/generate/generate-config.ts` (UI labels/descriptions)
- `src/sidebar/locales/*.json` (translated texts)
- `docs/how-to-add-generator.md` if workflow changes
