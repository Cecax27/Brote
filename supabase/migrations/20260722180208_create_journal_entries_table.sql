create type public.journal_entry_type as enum
  ('watering','fertilizing','repotting','pruning','observation');

create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid not null references public.plants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  type        public.journal_entry_type not null,
  content     text,
  photo_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.handle_updated_at();
