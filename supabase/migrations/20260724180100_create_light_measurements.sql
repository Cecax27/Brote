create table public.light_measurements (
  id              uuid primary key default gen_random_uuid(),
  plant_id        uuid references public.plants (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  device_lux      numeric(8,1) not null,
  calibrated_lux  numeric(8,1),
  light_profile   text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index light_measurements_plant_date_idx
  on public.light_measurements (plant_id, created_at desc);

alter table public.light_measurements enable row level security;

create policy "light_measurements_owner_select" on public.light_measurements
  for select using (auth.uid() = user_id);
create policy "light_measurements_owner_insert" on public.light_measurements
  for insert with check (auth.uid() = user_id);
create policy "light_measurements_owner_update" on public.light_measurements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "light_measurements_owner_delete" on public.light_measurements
  for delete using (auth.uid() = user_id);

alter table public.plants add column if not exists light_profile text;
