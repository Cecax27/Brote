create table public.plants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  species     text,
  location    text,
  photo_url   text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger plants_set_updated_at
  before update on public.plants
  for each row execute function public.handle_updated_at();
