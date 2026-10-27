create table public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  token       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint push_tokens_token_uniq unique (token)
);

create index push_tokens_user_id_idx
  on public.push_tokens (user_id);

create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.handle_updated_at();

alter table public.push_tokens enable row level security;

create policy "push_tokens_owner_select" on public.push_tokens
  for select using (auth.uid() = user_id);
create policy "push_tokens_owner_insert" on public.push_tokens
  for insert with check (auth.uid() = user_id);
create policy "push_tokens_owner_delete" on public.push_tokens
  for delete using (auth.uid() = user_id);
