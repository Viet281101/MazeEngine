-- Add sharing fields for maze publish/unpublish and link-based access.

alter table public.mazes
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  add column if not exists share_slug text,
  add column if not exists published_at timestamptz;

create unique index if not exists mazes_share_slug_unique_idx
  on public.mazes (share_slug)
  where share_slug is not null;

create index if not exists mazes_visibility_updated_at_idx
  on public.mazes (visibility, updated_at desc)
  where visibility in ('unlisted', 'public');

create or replace function public.ensure_maze_sharing_fields()
returns trigger
language plpgsql
as $$
declare
  candidate_slug text;
begin
  if new.visibility is null then
    new.visibility := 'private';
  end if;

  if new.visibility = 'private' then
    new.share_slug := null;
    new.published_at := null;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.published_at is null then
      new.published_at := now();
    end if;
  elsif old.visibility = 'private' then
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  if new.share_slug is null or char_length(trim(new.share_slug)) = 0 then
    loop
      candidate_slug := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
      exit when not exists (
        select 1
        from public.mazes as m
        where m.share_slug = candidate_slug and m.id <> new.id
      );
    end loop;
    new.share_slug := candidate_slug;
  end if;

  return new;
end;
$$;

drop trigger if exists mazes_ensure_sharing_fields on public.mazes;
create trigger mazes_ensure_sharing_fields
before insert or update on public.mazes
for each row
execute function public.ensure_maze_sharing_fields();

create policy "mazes_select_shared"
on public.mazes
for select
to anon, authenticated
using (visibility in ('unlisted', 'public'));
