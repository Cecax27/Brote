create table public.watering_schedules (
  id              uuid primary key default gen_random_uuid(),
  plant_id        uuid not null references public.plants (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  frequency_days  integer not null check (frequency_days >= 1),
  last_watered_at timestamptz,
  next_due_at     timestamptz not null,
  notify_time     time not null default '09:00',
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index watering_schedules_plant_id_uniq
  on public.watering_schedules (plant_id);

create index watering_schedules_due_idx
  on public.watering_schedules (user_id, next_due_at)
  where active;

create trigger watering_schedules_set_updated_at
  before update on public.watering_schedules
  for each row execute function public.handle_updated_at();

alter table public.watering_schedules enable row level security;

create policy "watering_owner_select" on public.watering_schedules
  for select using (auth.uid() = user_id);
create policy "watering_owner_insert" on public.watering_schedules
  for insert with check (auth.uid() = user_id);
create policy "watering_owner_update" on public.watering_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watering_owner_delete" on public.watering_schedules
  for delete using (auth.uid() = user_id);

create or replace function public.water_now(p_plant_id uuid)
returns public.watering_schedules
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_schedule public.watering_schedules%rowtype;
  v_user_id  uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.journal_entries (plant_id, user_id, type)
    values (p_plant_id, v_user_id, 'watering');

  select * into v_schedule
    from public.watering_schedules
    where plant_id = p_plant_id
    for update;

  if not found then
    return null;
  end if;

  update public.watering_schedules
    set last_watered_at = now(),
        next_due_at     = now() + (v_schedule.frequency_days || ' days')::interval
    where plant_id = p_plant_id
    returning * into v_schedule;

  return v_schedule;
end $$;
