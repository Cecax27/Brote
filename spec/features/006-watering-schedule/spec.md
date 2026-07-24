# 006 - Watering Schedule

**Status:** Done

## What makes

Each plant gets a per-plant watering cadence and a gentle reminder when its turn comes. The home screen finally answers *"what does my garden need today?"* for real, and a "Regar" tap closes the loop — it logs a watering journal entry and advances the calendar, in one action.

- **Watering schedule per plant** — one schedule per plant (frequency in days, reminder clock time, active toggle). Setup lives on the plant detail; the screen is an upsert (create-or-edit) since the unique-on-`plant_id` constraint guarantees a single row.
- **"Water now" quick action** — a one-tap "Regar" button (no confirmation dialog) that creates a `watering` journal entry and advances `next_due_at` by `frequency_days`, atomically, via a single `water_now` RPC. Reused from the home "Hoy" list, the plant detail, and the agenda.
- **Watering calendar view** — a calm vertical agenda at `/watering` (reached from the home bell icon), listing upcoming waterings for the next ~30 days grouped by Spanish day header. A month-grid calendar widget is deliberately not built.
- **Local scheduled notifications** — `expo-notifications` fires a reminder at the date of `next_due_at` at the `notify_time` clock time. Overdue reminders fall back to `now + 1 minute` rather than silently dropping or spamming a catch-up batch. Reconciled idempotently on app focus via `watering-${plant_id}` identifiers.
- **Home "Hoy" section** — plants due today (or overdue) surface as a small section above the plant list. It is hidden by default; when there's nothing to water, the section simply isn't there — calm absence, never a guilt-inducing empty panel.
- **Plant detail "Riego" section** — shows the next due date in Spanish ("Próximo riego: 24 jul") with a `Regar` button and an "Editar" link when a schedule exists, or a calm prompt card ("¿Con qué frecuencia riegas a {name}?") with a "Configurar riego" button when it doesn't.
- **Pause / resume / delete** — toggling `active=false` pauses reminders (cancels its notification, leaves `next_due_at`); resuming re-runs reconciliation. Deleting a schedule needs a confirmation dialog (the destructive pattern from 004/005); deleting a plant cascades to its schedule via FK.
- **Form validation** — Spanish error messages. Frequency is an integer ≥ 1; reminder time defaults to "09:00".

## Why

The mission says the home screen answers a single question: *"what does my garden need today?"* Features `001`–`005` built plants and their living memory, but the home screen's plant list doesn't *tell the user what to do* — the pillar promise ("open the app and know what to do in under five seconds") is still unmet. `006` is the first feature that surfaces a *call to action*, not just data.

The watering schedule is the most-repeatable, most-anxiety-inducing care event for a beginner — exactly the plant-care moment the app exists to make calm. So `006` designs the whole loop around removing friction: a one-tap "Regar" that writes the journal entry *and* advances the schedule in one server-side call; a hidden-when-empty due section so "nothing to water today" reads as peace, not debt; a gentle overdue reminder phrased as Flora would say it ("tu Monstera te está pidiendo un poco de agua"), never as an alarm.

The `water_now` RPC is the first server-side function in the app. It is introduced deliberately: the action inherently touches two tables (`journal_entries` insert + `watering_schedules` update) and must be atomic — a partial client-side failure would silently desync the calendar, and the history it corrupts is exactly the history the AI consultation (`008`/`010`) is specified to *"consider before responding"* ("watering history, fertilizations, repottings"). `SECURITY INVOKER` keeps RLS enforcing ownership; the new trust surface is narrower than a passed `user_id`.

Notifications land here because watering is the only recurring care event scheduled in V0.1, and because `next_due_at` already encodes *when*. The reconcile-on-focus strategy (cancel every `watering-*` notification, reschedule from active schedules on every app foreground) keeps reminders self-healing across clock changes, manual DB edits, and deleted plants without introducing a background task — appropriate for V0.1 and easy to swap for a heavier mechanism later.

## Acceptance criteria

1. A numbered Supabase migration creates the `watering_schedules` table with columns `id, plant_id (FK → plants, ON DELETE CASCADE), user_id (FK → auth.users, ON DELETE CASCADE), frequency_days (integer, check ≥ 1), last_watered_at (timestamptz, nullable), next_due_at (timestamptz, not null), notify_time (time, default '09:00'), active (boolean, default true), created_at, updated_at`. A `handle_updated_at` trigger is attached.
2. The migration adds a unique index on `plant_id` (one schedule per plant), an index on `(user_id, next_due_at) where active` for the "due today" query, and RLS policies `watering_owner_select/insert/update/delete` (same `auth.uid() = user_id` shape as `plants` and `journal_entries`).
3. The migration defines a `water_now(p_plant_id uuid)` RPC, `SECURITY INVOKER`, that inserts a `watering` `journal_entries` row for the caller's plant, and (if a schedule exists) advances `last_watered_at = now()` and `next_due_at = now() + frequency_days`, returning the updated schedule row; when no schedule exists it still inserts the journal entry and returns `null`. RLS governs the inserts/updates.
4. After applying the migration, `npm run gen-types` is run and committed so `Database["public"]["Tables"]["watering_schedules"]` and the `water_now` RPC signature resolve under TypeScript strict mode.
5. `src/lib/supabase/watering-schedules.ts` exposes typed helpers that throw on error: `fetchWateringSchedule(plantId)`, `fetchDueToday()`, `fetchUpcomingSchedules()`, `createWateringSchedule`, `updateWateringSchedule`, `deleteWateringSchedule`, and `waterNow(plantId)` (calls the RPC). `fetchDueToday`/`fetchUpcomingSchedules` join `plants` via `select("*, plants(*)")` so each row carries its plant for UI.
6. A `WaterNowButton` component displays a "Regar" control; on tap it calls `waterNow`, shows a brief "Regada ✓" state, calls `onWatered` with the returned schedule (or `null` when the plant had no schedule), and surfaces a calm inline Spanish error on failure — no `Alert`, no confirmation dialog. It is reused by the home due-section, plant detail, and agenda.
7. The home screen at `src/app/(app)/index.tsx` fetches `fetchDueToday()` on focus, renders a `WateringDueSection` above the plant list when there are due plants, and renders nothing (no empty state) when there are none. Tapping the bell icon in the header navigates to `/watering`.
8. The plant detail at `src/app/(app)/plants/[id]/index.tsx` fetches the plant's schedule in its existing `loadData`/`useFocusEffect` flow and renders a "Riego" section: either the next-due date ("Próximo riego: 24 jul"; "Lleva 2 días, le toca riego" when overdue) with a `WaterNowButton` and "Editar" control, or a calm prompt card ("¿Con qué frecuencia riegas a {name}?") with a "Configurar riego" button, depending on whether a schedule exists.
9. The schedule screen at `src/app/(app)/plants/[id]/watering.tsx` handles both create and edit (upsert model): it loads the existing schedule by `plant_id` and prefills when one exists; otherwise shows defaults. Fields: frequency (integer ≥ 1, Spanish validation), reminder time (`TimePickerField` defaulting to "09:00"), and an active toggle. On save it creates (`next_due_at = now()`, `last_watered_at = null`) or updates (recomputing `next_due_at` from `last_watered_at` when `frequency_days` changes); on destroy it shows an `Alert.alert` confirmation and calls `deleteWateringSchedule`.
10. A `WateringDueSection` component renders one `Card` row per due plant with the plant thumbnail, name, a Spanish status line ("Le toca riego" / "Lleva N días de retraso"), and a `WaterNowButton`. It is hidden when the list is empty. Row body tap (not the Regar button) navigates to the plant detail.
11. Local notifications via `expo-notifications` are scheduled at the `next_due_at` date combined with the `notify_time` clock time (both supplied by the client). Past trigger times fall back to `now + 1 minute`. When the user taps a reminder, the app navigates to that plant's detail screen.
12. Notification lifecycle is driven by `reconcileWateringNotifications` in `src/lib/notifications.ts`: on app focus it cancels every existing scheduled notification whose identifier starts with `watering-` and reschedules one per active schedule. Pausing a schedule (`active=false`) sets it falls out of the reschedule. Identifier format `watering-${plant_id}` keeps reconcile idempotent across manual edits, "Water now", pause/resume, and delete.
13. The root layout at `src/app/_layout.tsx` calls a `setupNotifications(onResponse)` helper once on mount to register the foreground notification handler (`shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false`), create the Android `"watering"` notification channel, and register the response listener that routes taps to the plant detail. The foreground handler + channel setup run exactly once.
14. `app.json` adds the `expo-notifications` plugin and notification config; `package.json` adds `expo-notifications` and `@react-native-community/datetimepicker` via `npx expo install` at SDK-54-matched versions (verified against https://docs.expo.dev/versions/v54.0.0/ before install).
15. Date formatting for the Spanish day headers and "Próximo riego" lines uses hardcoded Spanish month-name arrays (no `Intl` polyfill), consistent with the `src/lib/journal.ts` precedent from `005`.
16. Visual style follows the `brote-visual-guide` and theme tokens: warm-white background (`#F8F6F2`), brown-black body text (`#3F3A36`), sage primary (`#6E8E6A`), Fraunces for titles, Inter for body, radii ≥ 16, soft shadows, slow (150–350ms) fade/scale micro-interactions. No emoji as icons; line-art MaterialCommunity icons only.
17. All Supabase access goes through the typed client and RLS (the `watering_owner_*` policies guarantee users only read/modify their own schedules). The `water_now` RPC runs as `SECURITY INVOKER` so the same RLS policies still gate its `journal_entries` insert and `watering_schedules` update. No client may read or write another user's schedules.
18. `npm run lint` passes with no errors.
19. `npx tsc --noEmit` passes under strict mode.

## Out of reach

- Background CRON / ETask-based scheduling — V0.1 reconciles notifications on app focus only. A heavier background mechanism is a future enhancement if focus-reconcile proves insufficient.
- AI-generated watering frequency suggestions — `010-ai-consultation` can suggest a cadence; `006` only lets the user set one manually.
- Plant health indicator / badge derived from watering adherence — `014-health-indicator`.
- Fertilizing, repotting, or pruning schedules — `006` is watering-only. The journal entry types exist (`005`); generalized care scheduling is a later abstraction.
- Per-plant notification override / quiet hours — `013-settings-profile`.
- A month-grid calendar widget on `/watering` — V0.1 ships a vertical agenda (day-grouped list). A grid can be added later behind the same route without touching the data layer or `WaterNowButton`.
- Smart "skip next watering if it rained" / weather integration — out of scope.
- Multi-user shared schedule ownership — schedules are per-user via `user_id`; sharing plants across accounts is `013`+.
- Swapping the reminder channel/sound or rich-notification custom actions — V0.1 uses the default system notification with a title + body + plant deep-link.