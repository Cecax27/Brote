# Roadmap

## V0.1 Base — "The First Watering"

Each feature below has its own `spec/features/NNN-name/` with `spec.md`, `plan.md`, and `tasks.md`.

### 001-supabase-foundation
What: Everything needed to talk to the database.
- [x] Install `@supabase/supabase-js` + `@react-native-async-storage/async-storage`
- [x] Create Supabase client with env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- [x] Database migration — `plants` table (id, user_id, name, species, location, photo_url, notes, created_at, updated_at)
- [x] Database migration — `journal_entries` table (id, plant_id, user_id, type, content, photo_url, created_at, updated_at)
- [x] Row Level Security policies — users can only access their own data
- [x] Generate TypeScript types from database schema

### 002-authentication
What: Users can create accounts, log in, and reset their password.
- [ ] Auth context + provider (session, user, signIn, signUp, signOut, resetPassword)
- [ ] Supabase Auth listeners (`onAuthStateChange`) for session persistence
- [ ] Sign up screen — email, password, confirm password, display name
- [ ] Log in screen — email + password
- [ ] Forgot password screen — request reset link
- [ ] Reset password screen — new password via deep link (scheme: `brote`)
- [ ] Auth guard — redirect unauthenticated users to log in
- [ ] Logout
- [ ] Form validation + error messages (Spanish)

### 003-app-foundation
What: The app looks and feels like Brote. Navigation structure, theme, and the home screen.
- [ ] Load fonts — `Fraunces` + `Inter` (per visual guide)
- [ ] Design tokens — colors, spacing, typography scale, border radii, shadows
- [ ] Root layout with (auth) and (app) route groups
- [ ] Home screen — greeting, plant summary, "What does my garden need today?"
- [ ] Plant detail screen (placeholder/scaffold)
- [ ] Shared UI components — Button, Input, Card, Avatar, EmptyState, LoadingSkeleton
- [ ] Watercolor illustration placeholders
- [ ] Loading states and empty states for all screens

### 004-plant-management
What: Users can add, view, edit, and delete their plants. Photos included.
- [ ] Create plant screen — name (required), species, location, photo (camera + gallery), notes
- [ ] Image picker integration (expo-image-picker)
- [ ] Plant list — rendered on home screen, sorted by newest first
- [ ] Plant card component — photo, name, species, quick status
- [ ] Plant detail screen — full info, photo, quick actions (journal, edit, delete)
- [ ] Edit plant screen — pre-filled form
- [ ] Delete plant — confirmation dialog, cascades to journal entries
- [ ] Form validation (Spanish error messages)

### 005-journal-entries
What: Each plant has a chronological logbook of care events.
- [ ] Add journal entry — type (watering, fertilizing, repotting, pruning, observation), content, optional photo
- [ ] Journal entry list — grouped by month, rendered on plant detail screen
- [ ] Journal entry card component
- [ ] Edit journal entry
- [ ] Delete journal entry — confirmation dialog
- [ ] Empty state — "Aún no hay entradas en el diario"

## V0.2 Tools

[ ] Irrigation schedule
[ ] Push notifications for water
[ ] Light tool


## V0.3 IA Integration

[ ] IA api integrations (chatgpt, deepseek)
[ ] IA Chat
[ ] IA integration with database


## V0.4 Inventory
[ ] Database model for inventory
[ ] CRUD for inventory

## Backlog / Ideas

- Health Indicator

- AI Integration

- Import Expenses with AI

- Automatic rules for categories. Ex. description with "amazon" is online purchase.

> Each new feature is created as `spec/features/NNN-name/` with `spec.md`, `plan.md`, and `tasks.md` before any code is touched.