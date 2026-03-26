# Backend

The backend is currently set up with Supabase to support:

- basic sign-up/sign-in
- per-user maze persistence

## Structure

- `supabase/`: local backend config, migrations, seed file, and setup documentation

## Working Model

- local development uses Supabase running through Docker
- the frontend connects to it through values stored in `frontend/.env`
- schema changes should be added as SQL migrations in `backend/supabase/migrations/`

See details in `backend/supabase/README.md`.
