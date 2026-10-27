create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plant_id   uuid references public.plants (id) on delete cascade,
  title      text not null default 'Conversación con Flora',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_created_idx
  on public.ai_conversations (user_id, created_at desc);

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (char_length(content) between 1 and 4000),
  photo_url       text,
  created_at      timestamptz not null default now()
);

create index ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at);

alter table public.ai_conversations enable row level security;

create policy "ai_conv_owner_select" on public.ai_conversations
  for select using (auth.uid() = user_id);
create policy "ai_conv_owner_insert" on public.ai_conversations
  for insert with check (auth.uid() = user_id);
create policy "ai_conv_owner_update" on public.ai_conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conv_owner_delete" on public.ai_conversations
  for delete using (auth.uid() = user_id);

alter table public.ai_messages enable row level security;

create policy "ai_msg_owner_select" on public.ai_messages
  for select using (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
create policy "ai_msg_owner_insert" on public.ai_messages
  for insert with check (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
create policy "ai_msg_owner_update" on public.ai_messages
  for update using (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
create policy "ai_msg_owner_delete" on public.ai_messages
  for delete using (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
