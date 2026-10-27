# 006 - Watering Schedule

## Approach

Five layers, built incrementally. The data layer (migration + helpers) comes first; notifications infra and the watering component come next; then the schedule screens build on them; finally home + plant detail are retrofitted to surface "what does my garden need today".

```
Layer 1 — Data layer         Layer 2 — Notifications       Layer 3 — Components        Layer 4 — Screens                       Layer 5 — Integration
────────────────────          ──────────────────────         ──────────────────          ──────────────────────────────           ──────────────────────────────────
watering_schedules table      notifications.ts helpers        WaterNowButton              plants/[id]/watering.tsx (create/edit)    Home: WateringDueSection + bell → /watering
water_now RPC                channel + permission + handler   WateringDueSection          watering.tsx (agenda / calendar view)     Plant detail: Riego section + Regar ahora
watering-schedules.ts CRUD    reconcile → scheduled triggers  TimePickerField                                                       Root layout: foreground handler + response listener
```

### 1. Database migration — `watering_schedules`

A numbered migration creates the table, its enum-free schema, RLS, the updated-at trigger, a uniqueness guarantee, and an index for the "due today" query. It also adds the `water_now` RPC (see §3). Mirrors the conventions of `20260722180208_create_journal_entries_table.sql` and `20260722180216_enable_rls_policies.sql`.

```sql
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

-- One schedule per plant.
create unique index watering_schedules_plant_id_uniq
  on public.watering_schedules (plant_id);

-- Fast "what is due today" lookup, active rows only.
create index watering_schedules_due_idx
  on public.watering_schedules (user_id, next_due_at)
  where active;

create trigger watering_schedules_set_updated_at
  before update on public.watering_schedules
  for each row execute function public.handle_updated_at();
```

RLS, identical shape to `plants`/`journal_entries` owner policies:

```sql
alter table public.watering_schedules enable row level security;

create policy "watering_owner_select" on public.watering_schedules
  for select using (auth.uid() = user_id);
create policy "watering_owner_insert" on public.watering_schedules
  for insert with check (auth.uid() = user_id);
create policy "watering_owner_update" on public.watering_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "watering_owner_delete" on public.watering_schedules
  for delete using (auth.uid() = user_id);
```

Notes:
- `notify_time` is a Postgres `time` (no timezone) — just the clock time. The client combines it with the *date* of `next_due_at` to build the notification trigger (see §5). The generated `database.types.ts` surfaces it as a string like `"09:00:00"`.
- The unique index on `plant_id` collapses "create vs edit" into an **upsert / "one schedule per plant"** model — the schedule screen either updates the existing row or inserts one. No list, no duplication.
- After applying, run `npm run gen-types` so `Database["public"]["Tables"]["watering_schedules"]` and the `water_now` RPC signature become typed.

### 2. The `water_now` RPC

A single server-side function turns the "Water now" action into one atomic round trip: it logs a `watering` journal entry **and** advances the schedule. It is the first RPC in the app — introduced deliberately here because the operation is inherently multi-table and should be atomic (a journal entry without a schedule advance, or vice versa, would silently desync the calendar). `SECURITY INVOKER` (the default) is used so RLS still governs the inserts/updates; it runs as the calling user.

```sql
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

  -- Always record the watering in the journal, whatever the schedule state.
  insert into public.journal_entries (plant_id, user_id, type)
    values (p_plant_id, v_user_id, 'watering');

  select * into v_schedule
    from public.watering_schedules
    where plant_id = p_plant_id
    for update;

  if not found then
    -- Plant has no schedule yet: only the journal entry is created.
    return null;
  end if;

  update public.watering_schedules
    set last_watered_at = now(),
        next_due_at     = now() + (v_schedule.frequency_days || ' days')::interval
    where plant_id = p_plant_id
    returning * into v_schedule;

  return v_schedule;
end $$;
```

Client call: `supabase.rpc("water_now", { p_plant_id: plantId })`. The returned row gives the new `next_due_at` to drive the optimistic UI and notification rescheduling. When a plant has no schedule, `water_now` still creates the journal entry (degraded path) and returns `null` — the helper handles both.

### 3. Data layer — `src/lib/supabase/watering-schedules.ts`

Mirrors `src/lib/supabase/plants.ts` and `journal-entries.ts`: typed helpers that throw on error. Types come from the regenerated `database.types.ts`.

```ts
import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";
import type { Plant } from "./plants";

export type WateringSchedule = Tables<"watering_schedules">;
export type WateringScheduleInsert = TablesInsert<"watering_schedules">;
export type WateringScheduleUpdate = TablesUpdate<"watering_schedules">;

/** Schedule joined with its plant, as returned by the due/agenda queries. */
export type WateringScheduleWithPlant = WateringSchedule & { plants: Plant };

export async function fetchWateringSchedule(plantId: string): Promise<WateringSchedule | null>;
export async function fetchDueToday(): Promise<WateringScheduleWithPlant[]>;
export async function fetchUpcomingSchedules(): Promise<WateringScheduleWithPlant[]>;
export async function createWateringSchedule(s: Omit<WateringScheduleInsert, "user_id"> & { user_id: string }): Promise<WateringSchedule>;
export async function updateWateringSchedule(id: string, updates: WateringScheduleUpdate): Promise<WateringSchedule>;
export async function deleteWateringSchedule(id: string): Promise<void>;
export async function waterNow(plantId: string): Promise<WateringSchedule | null>;
```

- `fetchWateringSchedule` — single select by `plant_id` (`.eq("plant_id", plantId).maybeSingle()`). Used by the schedule screen (`edit` branch) and plant detail's Riego section.
- `fetchDueToday` — `select("*, plants(*)").eq("active", true).lte("next_due_at", endOfToday()).order("next_due_at", { ascending: true })`. The nested `plants(*)` returns the joined `Plant`, so one query yields everything the home section needs. `endOfToday()` is a local helper (current date set to 23:59:59.999 → ISO) so plants due later today still show as "today".
- `fetchUpcomingSchedules` — `select("*, plants(*)").eq("active", true).order("next_due_at", { ascending: true })`. Drives the agenda view's forward expansion.
- `createWateringSchedule` / `updateWateringSchedule` / `deleteWateringSchedule` — same shape as the journal CRUD.
- `waterNow` — `supabase.rpc("water_now", { p_plant_id: plantId }).single()`. Map a null result to `null` (no schedule), preserve `PGRST116` → `null`.

### 4. Notifications infrastructure — `src/lib/notifications.ts`

All `expo-notifications` usage is isolated here so screens import intent, not API surface.

- `requestNotificationPermissions()` — `Notifications.requestPermissionsAsync()`. Called once before the first schedule is saved (iOS prompts; Android grants). On denial, schedules still work, just silently — no crash, no blocking.
- `ensureWateringChannel()` — `Notifications.setNotificationChannelAsync("watering", { name: "Riegos", importance: AndroidImportance.HIGH })`. Android only; called on app startup (root layout). Required before scheduling on Android.
- `reconcileWateringNotifications(schedules: WateringSchedule[])` — the single source of truth for what is scheduled:
  1. `getAllScheduledNotificationsAsync()` → cancel every existing notification whose `identifier` starts with `watering-`.
  2. For each active schedule: compute the trigger moment = date-of-`next_due_at` at the clock time of `notify_time`. If that `Date` is already in the past, fall back to `now + 1 minute` (a gentle, on-brand nudge — *"tu Monstera te está pidiendo agua"* — rather than silently dropping an overdue reminder).
  3. `scheduleNotificationAsync({ identifier: \`watering-${plant_id}\`, content: { title: "Es hora de regar", body: \`Tu \${plantName} necesita un poco de agua.\`, data: { plantId, type: "watering" }, sound: true }, trigger: { date, channelId: "watering" } })` (only if the date is in the future).
- `buildWateringTriggerDate(schedule)` — pure helper combining the `next_due_at` date with `notify_time`'s `HH:mm`. Kept separate so the agenda view can reuse the same date math for its labels.
- `setupNotifications(onResponse: (plantId) => void)` — sets the foreground notification handler (`setNotificationHandler` returning `{ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }`), calls `ensureWateringChannel()`, and registers the response listener (`addNotificationResponseReceivedListener`) that calls `onResponse(plantId)` when the user taps a reminder. Called once from the root layout (§9).

Identifier convention (`watering-${plant_id}`) keeps cancel-and-reschedule idempotent across manual edits, "Water now", deletes, and pause/resume.

### 5. Dates without `Intl`

Following the precedent of `src/lib/journal.ts` (hardcoded Spanish month arrays, no `Intl` polyfill), a small `formatWateringDate(iso)` / `formatWateringDayHeader(iso)` lives alongside the existing `formatEntryDate`. Agenda day headers reuse the same MONTHS array (Spanish, lowercase for in-sentence, capitalized for headers). Always-on-device deterministic formatting.

### 6. `WaterNowButton` — `src/components/WaterNowButton.tsx`

A one-tap "Regar" control reused by the home due-section, plant detail, and the agenda. Props: `plant: { id, name }`, `onWatered?: (schedule: WateringSchedule | null) => void`.

- Optimistic: on press it disables itself with a tiny scale-down (Reanimated, ~150ms) and shows "Regada ✓" for a beat.
- Calls `waterNow(plant.id)`. On success calls `onWatered(updated)` so the parent can refresh its list / reschedule notifications. On error a calm inline Spanish message ("No se pudo registrar el riego. Inténtalo de nuevo.") — no `Alert`.
- No confirmation dialog: watering is a reversible, additive action. The "Are you sure" friction is reserved for deletes (004/005 pattern). This is the "ends in a concrete action" loop.

### 7. `WateringDueSection` — `src/components/WateringDueSection.tsx`

The home screen's answer to *"what does my garden need today"* (mission: the user knows what to do in under five seconds). Props: `items: WateringScheduleWithPlant[]`, `onWatered: (plantId) => void`.

- Title row: "Hoy" (Fraunces `h3`) on the left; a small line-art `watering-can-outline` chip on the right.
- Each item is a `Card` row: plant thumbnail (reuse `PlantCard`'s thumb style) on the left, the plant name (Fraunces) + a single Spanish status line ("Le toca riego" / "Lleva 2 días de retraso") in `caption`, and a `WaterNowButton` on the right.
- **Hidden when `items.length === 0`** — a calm absence rather than an empty state. The guiding principle is "never make the user feel guilty for forgetting to water"; an empty "nothing to water today" panel would do the opposite. Hidden ≈ relaxing.
- Tap on the row body (not the Regar button) navigates to the plant detail.

### 8. `TimePickerField` — `src/components/TimePickerField.tsx`

A calm wrapper over `@react-native-community/datetimepicker` in `mode="time"`. Props: `value: string` (HH:mm), `onChange: (hhmm: string) => void`. Opens the native wheel on press; no custom wheel is built. Keeps the native UX users expect and avoids the complexity/edge cases of a hand-rolled Reanimated wheel. Disabled style follows `Input`'s muted style.

### 9. Schedule screen (create/edit) — `src/app/(app)/plants/[id]/watering.tsx`

States: `loading`, `form`, `saving`, `error`. One screen handles both create and edit via the upsert model.

- Reads `id` (plant). `fetchWateringSchedule(id)` on mount: if a row exists → edit mode (prefill); else create mode.
- Fields:
  - **Frequency** — `Input` numeric, placeholder "Cada 7 días". Helper label "Cada cuántos días la riegas". Validation: integer ≥ 1, Spanish message "Pon un número de días (1 o más)."
  - **Reminder time** — `TimePickerField`, default "09:00".
  - **Active** — a calm toggle (sage when on) with caption "Recordarme los días de riego". Pausing keeps `next_due_at` but cancels its notification (the reconciler drops paused schedules because it only schedules `active=true`). Switching back on re-runs the reconciler.
- Save (`upsert`):
  - **Create** — `createWateringSchedule({ plant_id, user_id, frequency_days, notify_time, active, next_due_at: now(), last_watered_at: null })`. `next_due_at = now()` so the first cycle is immediately visible in "due today". A just-set schedule implying "this is the rhythm I'm committing to" — and the user can instantly `waterNow` if they just watered as part of setup.
  - **Edit** — `updateWateringSchedule(id, ...)`. If `frequency_days` changed, recompute `next_due_at = (last_watered_at || created_at) + frequency_days days` so the calendar reflects the new cadence. The `active` toggle just flips the flag.
- After save: request permissions if `active`, then `reconcileWateringNotifications` (re-fetch the user's schedules) → `router.back()`.

A destructive footer "Eliminar recordatorio" → `Alert.alert("Eliminar recordatorio", "¿Estás seguro? Esta acción no se puede deshacer.", …)` → `deleteWateringSchedule(id)` → reconcile → back.

### 10. Agenda / calendar view — `src/app/(app)/watering.tsx`

Reached from the home header's existing bell icon (`src/app/(app)/index.tsx:88-92`, currently non-functional). Implements "watering calendar view — upcoming waterings for the week/month" as a calm vertical **agenda** (date-grouped list), not a month grid. The notebook-feel product line favors a readable list over a calendar widget.

- `fetchUpcomingSchedules()` then client-side expand: for each active schedule, starting from `next_due_at`, step by `frequency_days` up to 30 days, emitting `{ date, plant }` occurrences. Group by Spanish day header.
- Each row: the date/time caption ("Lun 24 jul · 09:00"), plant name, and a `WaterNowButton` ("Regar"). On water, drop that occurrence from the list (its `next_due_at` advanced past the window) and re-run reconciliation.
- Tapping a row body → plant detail.
- Empty state: `EmptyState` (illustration `flora`) — "Aún no has configurado riegos" with subtitle "Configura el riego de tus plantas para ver aquí los próximos días." There's no "add" action from this screen — schedules are planted per plant, so the nudge is contextual.

### 11. Plant detail integration — `src/app/(app)/plants/[id]/index.tsx`

Add a "Riego" section between the quick actions and the "Fotos" timeline.

- `fetchWateringSchedule(id)` joins the existing `loadData` `Promise.all` (the section reads from `useFocusEffect` already in place from 005; the schedule refreshes on return from the schedule screen).
- When a schedule exists: a `Card` showing the next due date in Spanish ("Próximo riego: 24 jul") with two controls — `WaterNowButton` and a "Editar" ghost button (`router.push("/plants/[id]/watering")`). When overdue, the line reads "Lleva 2 días, le toca riego" (calm, never alarming).
- When no schedule exists: a calm prompt card "¿Con qué frecuencia riegas a {name}?" with a `Configurar riego` button → the schedule screen.
- After a `waterNow` here, optimistically update the section's `next_due_at` and re-run `reconcileWateringNotifications`.

### 12. Home screen integration — `src/app/(app)/index.tsx`

- Load due schedules in `loadPlants`-adjacent state: `dueToday` via `fetchDueToday()`, refreshed on the existing `useFocusEffect`.
- Render `<WateringDueSection items={dueToday} onWatered={refreshDue} />` directly above the plant list when `dueToday.length > 0` (otherwise hidden — decision 7).
- Wire the `bell-outline` icon (`index.tsx:88`) → `router.push("/watering")`.
- Continue to call `reconcileWateringNotifications(fetchUpcomingSchedules result)` on focus so reminders stay correct across sessions.

### 13. Route registration & root notification setup

- `src/app/(app)/_layout.tsx` — add two `Stack.Screen` entries: `plants/[id]/watering` → "Recordatorio de riego", and `watering` → "Riegos".
- `src/app/_layout.tsx` — call `setupNotifications(plantId => router.push({ pathname: "/plants/[id]", params: { id: plantId } }))` inside `RootStack` (it already lives inside the router context so `router` is available). The foreground handler + Android channel + response listener are set once at the root.

## Implementation

### Packages

Per `AGENTS.md`, exact compatible versions for SDK 54 are verified against https://docs.expo.dev/versions/v54.0.0/ before installing — `npx expo install` resolves the SDK-matched versions:

```bash
npx expo install expo-notifications                    # local scheduled notifications
npx expo install @react-native-community/datetimepicker # time picker (notify_time)
```

Already present: `@supabase/supabase-js`, `expo-image`, `react-native-reanimated`, `@expo/vector-icons`, the theme tokens.

### `app.json`

Add the `expo-notifications` plugin and a top-level `notification` config (icon + sage color). Plugin block enables the native notification response listeners that the root setup relies on:

```jsonc
"plugins": [ /* existing... */, ["expo-notifications", { "enableNotificationResponseListeners": true }] ],
"notification": {
  "iosLaunchScreenLogo": "./assets/images/splash-icon.png"
}
```

(The exact notification fields are confirmed against the SDK 54 `expo-notifications` docs during implementation.)

### Files (new)

```
supabase/migrations/<timestamp>_create_watering_schedules.sql   # table + RLS + trigger + index + water_now RPC
src/lib/supabase/watering-schedules.ts                          # typed CRUD + dueToday + upcoming + waterNow rpc
src/lib/notifications.ts                                        # permissions, channel, reconcile, setup, date builder
src/components/WaterNowButton.tsx
src/components/WateringDueSection.tsx
src/components/TimePickerField.tsx
src/app/(app)/plants/[id]/watering.tsx                          # create/edit schedule (upsert model)
src/app/(app)/watering.tsx                                      # agenda / calendar view
```

### Files (modified)

```
app.json                                  # expo-notifications plugin + notification config
package.json                              # expo-notifications, @react-native-community/datetimepicker
src/app/_layout.tsx                       # setupNotifications() once at the root (handler, channel, response nav)
src/app/(app)/_layout.tsx                 # register plants/[id]/watering + watering routes
src/app/(app)/index.tsx                   # WateringDueSection + wire bell → /watering + reconcile on focus
src/app/(app)/plants/[id]/index.tsx       # Riego section (schedule / prompt + Regar + Editar) + reconcile
src/lib/supabase/database.types.ts        # regenerated via `npm run gen-types`
```

### Migrations

One: `supabase/migrations/<timestamp>_create_watering_schedules.sql` (table, unique index on `plant_id`, due index, updated-at trigger, RLS ×4, `water_now` RPC). Followed by `npm run gen-types`.

## Decisions

1. **One schedule per plant (`unique(plant_id)`.** The roadmap says "Create watering schedule per plant" — singular. A unique index makes the schedule screen an upsert and removes a whole class of bugs (dupes, "which schedule wins"). Editing plant can't outlive the plant (`on delete cascade`).

2. **`water_now` is an RPC, not two client calls.** It mutates two tables (`journal_entries` insert + `watering_schedules` update) atomically in one round trip. A partial client-side failure (journal created but schedule not advanced) would silently desync the calendar and never tell the AI correct watering history (010 leans on this). `SECURITY INVOKER` keeps RLS enforcing ownership — the first RPC in the app, introduced deliberately for an inherently multi-table, order-sensitive action.

3. **`next_due_at = now()` on schedule creation, `last_watered_at = null`.** Setting up a schedule is the user committing to a rhythm; "due today" populates immediately and honestly. If they just watered during setup, one tap of `WaterNowButton` seeds `last_watered_at` and advances the cycle. No naggy "wait N days before your first reminder" — calmer is immediate transparency.

4. **Notifications fire once, at `next_due_at`'s date × `notify_time`. If that moment passed, fall back to `now + 1min`.** Mirrors the persona's voice — *"tu Monstera te está pidiendo un poco de agua"* — and is honest about overdue plants, rather than silently dropping or spamming a catch-up batch. Reconciled idempotently via `watering-${plant_id}` identifiers.

5. **Reconcile-on-focus, not background scheduling.** Scheduled local notifications persist across app closes, but drift accrues from clock changes, Mango/deleted plants, manual DB edits, or a failed reconcile last session. On app focus the home screen cancels every `watering-*` notification and reschedules from the current active schedules. Cheap, simple, and self-healing. A background CRON is out of scope (and Heavy/Background tasks are heavyweight for V0.1).

6. **Agenda list, not a month grid.** The "notebook" visual identity reads as a calm day-grouped list better than a calendar widget. A real month grid is more surface to build and more cognitive load to scan. Easy to extract later behind `/watering` without touching `WaterNowButton` or the data layer.

7. **Hide the due-section when empty (no empty state).** The product must "never make the user feel guilty for forgetting to water." A visible "no plants need water today" panel would do the opposite — it'd manufacture a sense of debt. Nothing-to-do is conveyed by calm *absence*: the garden section simply isn't there, and the plant list speaks for itself.

8. **No confirmation on `WaterNowButton`.** Watering is additive and reversible; the "¿estás seguro?" dialog is reserved for destructive ops (delete plant 004, delete journal entry 005). One tap → done → calm "Regada ✓". The reduction of friction is the "concrete action" loop.

9. **`notify_time` as a `time` column, combined client-side with `next_due_at`'s date.** Two columns (`next_due_at` date + `notify_time` clock) keep "when is it due" and "when do I want to be told" separable — a user can be due today but want reminders in the evening. Storing a single merged timestamptz would conflate them and make "remind at 9 AM" awkward to honor across timezones.

10. **Native time picker (datetimepicker).** No hand-rolled wheel. Users expect the native clock-wheel; building one adds Reanimated edge cases and maintenance for no product gain. The minimal native dep is justified and idiomatic in Expo for SDK 54 (version verified against docs).

## Risks

- **`expo-notifications` scheduling limits.** Android caps scheduled notifications per app (historically 250). Reconcile-on-focus keeps the count ≤ active schedules (typically < 50), well under the limit, and stale `watering-*` entries are canceled each pass.
- **Trigger-in-the-past.** `scheduleNotificationAsync` with a past date throws on Android. Covered by the `now + 1min` fallback (decision 4). The reconciler never schedules a date ≤ now.
- **iOS permission denial.** `requestPermissionsAsync()` may return `granted: false`. Schedules still save and "due today" still shows in-app; only the push reminder is silently skipped — no crash, no loop. A future settings screen (013) can re-request.
- **Timezone math.** `next_due_at` is timestamptz; `notify_time` is naive `time`. The client builds the trigger `Date` in local time from the device — consistent with how `new Date()` is used throughout (004/005). If the user travels timezones, the reconciler recomputes on next focus. Acceptable for V0.1; flagged if precise TZ matters later.
- **`water_now` when the plant has no schedule.** The RPC inserts the journal entry anyway and returns `null`; `WaterNowButton` tells the parent "no schedule", so the section offers a "Configurar riego" prompt next time the plant detail loads. Not a silent no-op.
- **RPC RLS trust.** `water_now` is `SECURITY INVOKER`, so the `journal_entries` insert is gated by `journal_owner_insert` (`auth.uid() = user_id`) exactly like the existing client `createJournalEntry`. The new trust surface is just "the function uses `auth.uid()` rather than a passed `user_id`" — narrower, not wider.
- **Notification response listener + router readiness.** `setupNotifications` runs in `RootStack`, which mounts after fonts + auth are ready; `router` is valid there. A tap received before the app launched is queued by expo-notifications and delivered to the listener once mounted — confirmed in SDK 54 docs during implementation.
- **Gen-types drift.** The migration + `npm run gen-types` must both land in the same PR or `WateringSchedule` types won't resolve. The plan lists `database.types.ts` under modified files as a reminder.

## Verification

- On a plant with no schedule, the plant detail shows "¿Con qué frecuencia riegas a {name}?" → tapping "Configurar riego" opens the schedule screen (create branch); saving returns to detail, which now shows "Próximo riego: …".
- Creating a schedule sets `next_due_at = now()`; the plant appears in the home "Hoy" section within seconds (focus refresh).
- `WaterNowButton` on the home due-section: tap → "Regada ✓" → the row leaves the "Hoy" section on next focus; the plant detail's "Próximo riego" advances by `frequency_days`; a `watering` journal entry appears on the plant detail's "Diario".
- Pausing a schedule (active=false): the plant leaves "Hoy" and the agenda; its `watering-<id>` notification is canceled; resuming brings it back.
- The bell icon opens `/watering`: upcoming waterings for ~30 days grouped by Spanish day; "Regar" on a row updates it.
- A reminder fires at `next_due_at`'s date at `notify_time`; tapping the system notification opens the plant detail.
- Overdue plant (open the app after the due time passed): reconciler schedules `now + 1min`; the user gets a gentle reminder without a spam burst.
- Deleting a plant cascades to its watering schedule (FK), and the next reconciler cancels its notification.
- Edit frequency → `next_due_at` recomputes from `last_watered_at`; the agenda reflects the new cadence.
- RLS: a second user's client cannot read/update another user's `watering_schedules` (the existing owner policies).
- `npm run lint` passes; `npx tsc --noEmit` passes (regenerated types resolve `WateringSchedule` and `water_now` args).