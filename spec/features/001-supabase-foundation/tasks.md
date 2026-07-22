# 001 - Supabase Foundation

## Phase 0 — Setup

- [x] Confirm Supabase project is empty (no tables, no migrations) — verified during planning
- [x] Resolve package-manager conflict: removed stale `packageManager: yarn` from `package.json`, corrected `tech-stack.md` (Pnpm→Npm, dropped packages/supabase + @repo/ + Turborepo) — done

## Phase 1 — Dependencies & environment

- [x] Install `@supabase/supabase-js` and `@react-native-async-storage/async-storage` (runtime)
- [x] Install `supabase` CLI as dev dependency
- [x] Create `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
- [x] Create `.env.example` with placeholder values, commit it
- [x] Add `.env` to `.gitignore` (currently only `.env*.local` is ignored)
- [x] Add `gen-types` npm script to `package.json`

## Phase 2 — Supabase CLI project

- [x] Run `npx supabase init` → create `./supabase/config.toml`
- [x] Run `npx supabase link --project-ref bjhubejmjmwrwusrpruk`
- [x] Create `supabase/migrations/` directory

## Phase 3 — Database schema migrations

- [x] Migration: enable `moddatetime` + create `handle_updated_at()` trigger function
- [x] Migration: create `public.plants` table + `set_updated_at` trigger
- [x] Migration: create `journal_entry_type` enum
- [x] Migration: create `public.journal_entries` table + `set_updated_at` trigger
- [x] Migration: enable RLS on both tables
- [x] Migration: policies for `plants` (select/insert/update/delete, `auth.uid() = user_id`)
- [x] Migration: policies for `journal_entries` (select/insert/update/delete, `auth.uid() = user_id`)
- [x] Migration: fix `moddatetime` extension schema + lock `handle_updated_at` search_path (security)
- [x] Apply all migrations to the remote project (MCP `supabase_apply_migration`, or `supabase db push` after link)

## Phase 4 — Typed client

- [x] Generate `src/lib/supabase/database.types.ts` from live schema
- [x] Write `src/lib/supabase/client.ts` — typed `createClient<Database>` with `AsyncStorage` session storage
- [x] Confirm `@/lib/supabase/client` resolves under the `@/*` path alias

## Phase 5 — Verification

- [x] `npm run lint` passes with no new errors
- [x] Project compiles in strict TypeScript with the client import (`npx tsc --noEmit`)
- [x] `supabase_get_advisors` (security): no warnings (fixed search_path + extension schema)
- [x] RLS spot check: a row for user A is invisible/unwritable as user B
- [x] Both `plants` and `journal_entries` show in `supabase_list_tables` with correct columns
- [x] Migrations tracked locally and on remote

## Phase 6 — Roadmap

- [x] Update `spec/constitution/roadmap.md`: mark `001-supabase-foundation` checklist items and feature section as Done