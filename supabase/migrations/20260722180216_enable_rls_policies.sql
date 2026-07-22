alter table public.plants enable row level security;
alter table public.journal_entries enable row level security;

create policy "plants_owner_select" on public.plants
  for select using (auth.uid() = user_id);
create policy "plants_owner_insert" on public.plants
  for insert with check (auth.uid() = user_id);
create policy "plants_owner_update" on public.plants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plants_owner_delete" on public.plants
  for delete using (auth.uid() = user_id);

create policy "journal_owner_select" on public.journal_entries
  for select using (auth.uid() = user_id);
create policy "journal_owner_insert" on public.journal_entries
  for insert with check (auth.uid() = user_id);
create policy "journal_owner_update" on public.journal_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal_owner_delete" on public.journal_entries
  for delete using (auth.uid() = user_id);
