# 001 - Supabase Foundation

## Approach

Ship a data-only foundation: dependencies, env, a typed client, two tables with RLS, and generated types. No UI. The migrations are written as SQL files under `supabase/migrations/` (version controlled, the canonical source of truth) and applied to the linked remote project; the same files replay cleanly on any fresh local stack via `supabase db reset`.

Tooling: adopt the **Supabase CLI local development workflow** for authoring migrations (create the `./supabase` directory with `supabase init`, link it to the remote project), and apply migrations to the remote through the MCP `supabase_apply_migration` tool (or `supabase db push` once linked). Generate types from the live schema with `supabase gen types`.

### File layout (new)

```
.env                              # local only, gitignored
.env.example                      # committed placeholders
supabase/
  config.toml                     # from `supabase init`, committed
  migrations/
    <ts>_create_updated_at_function.sql
    <ts>_create_plants_table.sql
    <ts>_create_journal_entries_table.sql
    <ts>_enable_rls_policies.sql
src/lib/supabase/
  client.ts                       # typed createClient
  database.types.ts               # generated, committed
```

## Implementation

### 1. Dependencies
```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install -D supabase
```
`supabase` CLI is a dev dependency so `gen types` and migrations are reproducible across machines.

### 2. Environment vars
- `.env` (gitignored):
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
  ```
- `.env.example` committed with the same keys but placeholder values.
- Append `.env` to `.gitignore` (current `.gitignore` only ignores `.env*.local`).
- Value for the anon key: use the **modern publishable key** (`sb_publishable_…`) returned by `supabase_get_publishable_keys`, stored under the roadmap-named var `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The legacy anon key is available as a fallback but not preferred for new apps.
- `EXPO_PUBLIC_*` is the Expo convention for vars exposed to the client bundle; accessed via `process.env.EXPO_PUBLIC_SUPABASE_URL` at runtime.

### 3. Supabase client — `src/lib/supabase/client.ts`
```ts
import 'react-native-url-polyfill/auto';  // only if deep-link parsing needs it (defer unless required)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionUrl: true,
    },
  },
);
```
- `react-native-url-polyfill` is optional and only added if auth deep-link handling in `002` proves to need it; it is **not** part of this feature's scope unless lint/build fails without it.

### 4. Migrations (applied in order)
**a. `updated_at` helper** — one reusable trigger function:
```sql
-- enable moddatetime once
create extension if not exists moddatetime;
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
```

**b. `plants`**
```sql
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
```

**c. `journal_entries`** + enum
```sql
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
```

**d. RLS + policies** (identical pattern per table)
```sql
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
```
`journal_entries.user_id` is stored explicitly (not derived from the plant) so RLS checks are a single `auth.uid()` comparison and survive even if a plant is deleted; the FK `plant_id … on delete cascade` still removes entries when a plant goes away.

### 5. Generate types
```bash
npx supabase init                # creates ./supabase/config.toml
npx supabase link --project-ref bjhubejmjmwrwusrpruk
npx supabase gen types --lang typescript --linked > src/lib/supabase/database.types.ts
```
Add an npm script: `"gen-types": "supabase gen types --lang typescript --linked > src/lib/supabase/database.types.ts"`.

### 6. Verification
- `supabase_get_advisors` (security): expect zero new warnings (RLS enabled, no public access).
- Manually: with a test session, a `.select()` on `plants` returns only the current user's rows; cross-user insert/update delete are rejected by RLS.
- `npm run lint` passes; project compiles in strict mode with the `@/lib/supabase/client` import.

## Decisions

- **Ids are `uuid` with `gen_random_uuid()`.** Matches `auth.users.id` and the Supabase convention; avoids sequential-id enumeration and works offline.
- **`journal_entries.type` is a Postgres enum**, not text. Type-safe and generates a TS enum in `database.types.ts`. Trade-off: adding a new type later needs a migration — acceptable.
- **RLS keyed on explicit `user_id` column** (not on the plant relationship) for `journal_entries`. Keeps policies a single `auth.uid()` check and decouples journal ownership from plant existence.
- **Env var name follows the roadmap** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) even though the value is the modern publishable key, to avoid churn against the roadmap and keep the legacy anon fallback available.
- **CLI tracked in repo (`supabase/` committed) + migrations authored by hand** rather than via `db diff`. For a brand-new schema with hand-written RLS, hand-authored migrations are clearer and free of diff noise; `db diff` is adopted later when changes come through Studio.
- **Package manager: npm.** Confirmed everywhere (README, `package-lock.json`, AGENTS.md). The stale `packageManager: yarn` field and `tech-stack.md` references to Pnpm/Turborepo/`packages/supabase`/`@repo/` (remnants of another project's docs) were removed before this feature started.

## Risks

- **`react-native-url-polyfill`** may be required for `detectSessionUrl`/deep-link auth parsing in `002`, but adding it now is speculative. Mitigation: don't add it here; revisit when `002` lands.
- **AsyncStorage on web** (Expo web target) needs `@react-native-async-storage/async-storage` web polyfill — already shipped by the lib. Acceptable for V0.1.
- **Migrations applied directly to the remote via MCP** skip the local `db reset` verification gate until Docker is set up. Mitigation: keep migration SQL hand-reviewed; re-run `db reset --linked` on a throwaway branch if needed before merging.
- **Type regeneration drift:** if schema changes later without regenerating types, the client types go stale. Mitigation: `gen-types` npm script + (future) CI job per Supabase docs.