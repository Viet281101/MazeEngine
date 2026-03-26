-- MazeEngine initial schema for Supabase local/prod

create extension if not exists pgcrypto;

create table if not exists public.mazes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  maze_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mazes_user_id_created_at_idx
  on public.mazes (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mazes_set_updated_at on public.mazes;
create trigger mazes_set_updated_at
before update on public.mazes
for each row
execute function public.set_updated_at();

alter table public.mazes enable row level security;

create policy "mazes_select_own"
on public.mazes
for select
to authenticated
using (auth.uid() = user_id);

create policy "mazes_insert_own"
on public.mazes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "mazes_update_own"
on public.mazes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mazes_delete_own"
on public.mazes
for delete
to authenticated
using (auth.uid() = user_id);
