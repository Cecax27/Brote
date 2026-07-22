# 001 - Supabase Foundation

**Status:** Planning

## What makes

Establishes everything the app needs to talk to its database securely:

- A Supabase client usable across the app (typed, with persistent session storage).
- Environment variables for the Supabase URL and publishable key (never in source).
- Two core tables — `plants` and `journal_entries` — that form the "living memory" of each plant.
- Row Level Security so every user can only ever reach their own data.
- TypeScript types generated from the live database schema, wired into the client.

This feature ships no UI. It only lays the data foundation that `002-authentication` and later features consume.

## Why

The mission makes each **plant** the core unit, with a full history per plant. Before any screen, auth flow, or AI conversation can exist, three things must be true: the app can reach Supabase, the schema exists, and a user's data is isolated from everyone else's. Doing this first — and only this — means every subsequent feature can assume a safe, typed data layer instead of retrofitting security and types later. It also satisfies the constitution's hard limit: *no secrets in source code*.

## Acceptance criteria

1. `@supabase/supabase-js` and `@react-native-async-storage/async-storage` are installed and listed in `package.json`.
2. `src/lib/supabase/client.ts` exports a typed `supabase` client built from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The client configures a custom `AsyncStorage`-backed `storage` for session persistence.
3. A `.env` file exists at the repo root with the two variables populated (gitignored, never committed). A `.env.example` is committed with placeholder values.
4. The `supabase/migrations/` directory exists with applied migrations for `plants` and `journal_entries`, tracked in version control.
5. `plants` table has columns: `id (uuid pk)`, `user_id (uuid, refs auth.users, on delete cascade)`, `name (text, not null)`, `species (text)`, `location (text)`, `photo_url (text)`, `notes (text)`, `created_at (timestamptz default now)`, `updated_at (timestamptz default now)`.
6. `journal_entries` table has columns: `id (uuid pk)`, `plant_id (uuid, refs plants, on delete cascade)`, `user_id (uuid, refs auth.users, on delete cascade)`, `type (journal_entry_type enum)`, `content (text)`, `photo_url (text)`, `created_at (timestamptz default now)`, `updated_at (timestamptz default now)`.
7. `journal_entries.type` is a Postgres enum with values: `watering`, `fertilizing`, `repotting`, `pruning`, `observation`.
8. `updated_at` auto-updates on every row update via a shared trigger (e.g. `moddatetime` extension).
9. RLS is enabled on both tables. Policies exist for `select`, `insert`, `update`, `delete` restricting every operation to rows where `user_id = auth.uid()`.
10. A user cannot read, create, update, or delete another user's plants or journal entries (verified by query).
11. `src/lib/supabase/database.types.ts` is generated from the live schema and the client is typed as `SupabaseClient<Database>`.
12. `npm run lint` passes with no new errors.
13. Adding the env vars and importing `supabase` from `@/lib/supabase/client` compiles under `strict` TypeScript.
14. `supabase_get_advisors` (security) reports no new warnings introduced by this feature.

## Out of reach

- Auth UI and flows (belongs to `002-authentication`).
- Storage buckets and uploaded `photo_url` resolution (belongs to `004-plant-management`).
- Any screen, component, navigation, or theme work (belongs to `003-app-foundation`).
- Seed data beyond what is needed to verify RLS (no production-realistic fixtures).
- Local Supabase Docker stack (local CLI workflow is adopted, but running `supabase start` locally is not required for acceptance; migrations are applied to the linked remote project).