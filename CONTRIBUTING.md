# Contributing

## Development Setup

```bash
npm --prefix frontend install
npm install
npm run supabase:start
npm run supabase:status
npm run dev
```

If this is your first time on the repo:

- Make sure Docker is running locally.
- Run `npm run supabase:init` once if Supabase config has not been initialized yet.
- Copy `frontend/.env.example` to `frontend/.env`.
- Copy the local Supabase URL and anon key from `npm run supabase:status` into `frontend/.env`.

## Before Opening a PR

Run the quality gate locally:

```bash
npm run lint
npm run check:multilayer
npm run build
npm run test
```

`npm run test` already executes lint + build, but running all commands explicitly helps isolate failures faster.

## Coding Guidelines

- Keep TypeScript strict and explicit.
- Reuse existing constants/types instead of hardcoded values.
- Keep UI text in i18n locale files (`frontend/src/i18n/locales/*.json`).
- For new feature logic, prefer small composable functions over large classes.
- Preserve existing naming style:
  - kebab-case for filenames
  - camelCase for variables/functions
  - PascalCase for classes/types/interfaces

## Repository Layout

- `frontend/`: Vite frontend app and all user-facing maze features
- `backend/`: Supabase config, migrations, and backend docs
- `docs/`: architecture, onboarding, and generator documentation
- root `package.json`: convenience scripts for full-stack local development

Most code changes should happen under `frontend/src/`.

## Feature Checklist

When adding or changing behavior:

- Update user-facing docs if workflow changed.
- Add or update translations in `en.json`, `vi.json`, and `fr.json` when needed.
- If you change account/auth/persistence behavior, verify the Account popup still works with local Supabase.
- If you change database behavior, add or update a migration in `backend/supabase/migrations/`.
- Verify new logic works with existing topologies and maze size constraints.
- Validate fallback paths (for example worker fallback to main thread in generation).

## Generator-Specific Changes

If you add a new generator algorithm, also update:

- `frontend/src/generator/core/types.ts` (new `GeneratorId` if needed)
- `frontend/src/generator/core/registry.ts` (register generator + topology support)
- `frontend/src/sidebar/popup/generate/generate-config.ts` (UI labels/descriptions)
- `frontend/src/i18n/locales/*.json` (translated texts)
- `docs/how-to-add-generator.md` if workflow changes
