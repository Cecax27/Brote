# 006 - Watering Schedule

## Phase 0 — Packages + app.json

- [x] Install `expo-notifications` via `npx expo install expo-notifications` (verify SDK-54-matched version against https://docs.expo.dev/versions/v54.0.0/ before installing)
- [x] Install `@react-native-community/datetimepicker` via `npx expo install @react-native-community/datetimepicker`
- [x] Update `app.json` — add the `expo-notifications` plugin (`enableNotificationResponseListeners: true`) and a top-level `notification` config; confirm exact fields against SDK 54 `expo-notifications` docs
- [x] Confirm `handle_updated_at()` trigger function exists in DB (from `001` fix migration) before referencing it in the new trigger

## Phase 1 — Database migration + types

- [x] Create `supabase/migrations/<timestamp>_create_watering_schedules.sql` — `watering_schedules` table (`id, plant_id FK ON DELETE CASCADE, user_id FK ON DELETE CASCADE, frequency_days integer check ≥ 1, last_watered_at timestamptz, next_due_at timestamptz not null, notify_time time default '09:00', active boolean default true, created_at, updated_at`)
- [x] Add unique index on `plant_id` (one schedule per plant)
- [x] Add index `(user_id, next_due_at) where active` for the due-today query
- [x] Attach `watering_schedules_set_updated_at` trigger using `handle_updated_at()`
- [x] Enable RLS + create policies `watering_owner_select/insert/update/delete` (`auth.uid() = user_id` shape)
- [x] Define `water_now(p_plant_id uuid)` RPC: `SECURITY INVOKER`, inserts a `watering` `journal_entries` row, advances schedule (`last_watered_at = now()`, `next_due_at = now() + frequency_days`) if one exists, returns the updated row or `null`
- [x] Run `npm run gen-types`; commit `src/lib/supabase/database.types.ts` with `watering_schedules` + `water_now` types resolved

## Phase 2 — Data layer

- [x] Create `src/lib/supabase/watering-schedules.ts` — type aliases `WateringSchedule`, `WateringScheduleInsert`, `WateringScheduleUpdate`, `WateringScheduleWithPlant` (join with `plants`)
- [x] `fetchWateringSchedule(plantId)` — `.eq("plant_id", plantId).maybeSingle()`; return `null` on no row
- [x] `fetchDueToday()` — `select("*, plants(*)").eq("active", true).lte("next_due_at", endOfToday()).order("next_due_at", { ascending: true })`
- [x] `fetchUpcomingSchedules()` — `select("*, plants(*)").eq("active", true).order("next_due_at", { ascending: true })`
- [x] `createWateringSchedule`, `updateWateringSchedule`, `deleteWateringSchedule` — typed CRUD that throw on error
- [x] `waterNow(plantId)` — `supabase.rpc("water_now", { p_plant_id: plantId }).single()`; map null result to `null`, preserve `PGRST116`
- [x] Local `endOfToday()` helper (current date set to 23:59:59.999 → ISO) so plants due later today still show

## Phase 3 — Notifications infrastructure

- [x] Create `src/lib/notifications.ts` — `requestNotificationPermissions()` (`Notifications.requestPermissionsAsync()`); silently skip reminders on denial (no crash, no loop)
- [x] `ensureWateringChannel()` — `Notifications.setNotificationChannelAsync("watering", { name: "Riegos", importance: AndroidImportance.HIGH })` (Android only)
- [x] `buildWateringTriggerDate(schedule)` — pure helper: combine `next_due_at`'s date with `notify_time`'s `HH:mm` into a local `Date`
- [x] `reconcileWateringNotifications(schedules)` — cancel all `watering-*` scheduled notifications, then for each active schedule schedule one at the trigger date; fall back to `now + 1 min` when the computed date is in the past; only schedule future dates
- [x] `setupNotifications(onResponse)` — set foreground `NotificationHandler` (`shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false`), call `ensureWateringChannel()`, register response listener → `onResponse(plantId)`

## Phase 4 — Shared components

- [x] Create `src/components/WaterNowButton.tsx` — "Regar" control; on tap calls `waterNow`, optimistic "Regada ✓" (Reanimated scale-down ~150ms), calls `onWatered(updated)`; calm inline Spanish error on failure; no `Alert`, no confirmation
- [x] Create `src/components/WateringDueSection.tsx` — "Hoy" title row (`h3`/Fraunces) + line-art watering-can chip; one `Card` per due plant with thumbnail, name, Spanish status line ("Le toca riego" / "Lleva N días de retraso"), and `WaterNowButton`; row body tap → plant detail; hidden when `items.length === 0`
- [x] Create `src/components/TimePickerField.tsx` — calm wrapper over `@react-native-community/datetimepicker` `mode="time"`; props `value: string` (HH:mm), `onChange`; disabled style follows `Input` muted style

## Phase 5 — Schedule screen (create/edit upsert)

- [x] Create `src/app/(app)/plants/[id]/watering.tsx` — states `loading`, `form`, `saving`, `error`; read `id`, `fetchWateringSchedule(id)` on mount (edit prefill vs create defaults)
- [x] Frequency field — `Input` numeric, placeholder "Cada 7 días", helper "Cada cuántos días la riegas"; validation integer ≥ 1 ("Pon un número de días (1 o más).")
- [x] Reminder time field — `TimePickerField`, default "09:00"
- [x] Active toggle — sage when on, caption "Recordarme los días de riego"
- [x] Save (create): `createWateringSchedule({ plant_id, user_id, frequency_days, notify_time, active, next_due_at: now(), last_watered_at: null })`
- [x] Save (edit): `updateWateringSchedule(id, ...)`; if `frequency_days` changed recompute `next_due_at = (last_watered_at || created_at) + frequency_days days`
- [x] After save: request permissions if `active`, then `reconcileWateringNotifications` (re-fetch the user's active schedules) → `router.back()`
- [x] Destructive footer "Eliminar recordatorio" → `Alert.alert("Eliminar recordatorio", "¿Estás seguro? Esta acción no se puede deshacer.", …)` → `deleteWateringSchedule(id)` → reconcile → `router.back()`
- [x] Loading / not-found / error states

## Phase 6 — Agenda / calendar view

- [x] Create `src/app/(app)/watering.tsx` — `fetchUpcomingSchedules()` then client-side expand per active schedule starting at `next_due_at`, stepping by `frequency_days` up to 30 days, emitting `{ date, plant }` occurrences
- [x] Group occurrences by Spanish day header (hardcoded month-name arrays, no `Intl`)
- [x] Each row: date/time caption ("Lun 24 jul · 09:00"), plant name, `WaterNowButton`; on water, drop that occurrence + reconcile
- [x] Row body tap → plant detail
- [x] Empty state: `EmptyState` (illustration `flora`) — "Aún no has configurado riegos" with subtitle "Configura el riego de tus plantas para ver aquí los próximos días." (no add action — schedules are planted per plant)

## Phase 7 — Plant detail integration

- [x] In `src/app/(app)/plants/[id]/index.tsx`, add `fetchWateringSchedule(id)` to the `loadData` `Promise.all`; add `schedule` state
- [x] Add a "Riego" section between quick actions and the "Fotos" timeline
- [x] Schedule exists: `Card` with Spanish next-due line ("Próximo riego: 24 jul"; "Lleva 2 días, le toca riego" when overdue) + `WaterNowButton` + "Editar" ghost (`router.push("/plants/[id]/watering")`)
- [x] No schedule: calm prompt card "¿Con qué frecuencia riegas a {name}?" with "Configurar riego" button → schedule screen
- [x] After `waterNow`: optimistically update the section's `next_due_at` and re-run `reconcileWateringNotifications`
- [x] Schedule refreshes via the existing `useFocusEffect` (already in place from `005`)

## Phase 8 — Home screen integration

- [x] In `src/app/(app)/index.tsx`, add `dueToday` state loaded via `fetchDueToday()` on the existing `useFocusEffect`
- [x] Render `<WateringDueSection items={dueToday} onWatered={refreshDue} />` above the plant list when `dueToday.length > 0`; render nothing when empty
- [x] Wire the `bell-outline` header icon (`index.tsx`) → `router.push("/watering")`
- [x] Call `reconcileWateringNotifications` (from `fetchUpcomingSchedules()` result) on focus so reminders stay correct across sessions

## Phase 9 — Route registration + root notification setup

- [x] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` for `plants/[id]/watering` (title "Recordatorio de riego") and `watering` (title "Riegos")
- [x] Update `src/app/_layout.tsx` — in `RootStack`, call `setupNotifications(plantId => router.push({ pathname: "/plants/[id]", params: { id: plantId } }))` once (foreground handler + Android channel + response nav)

## Phase 10 — Verification

- [x] `npm run lint` passes (0 errors)
- [x] `npx tsc --noEmit` passes under strict (regenerated types resolve `WateringSchedule` + `water_now`)
- [x] Manual: plant with no schedule → detail shows "¿Con qué frecuencia riegas a {name}?" → "Configurar riego" opens schedule screen (create); saving returns to detail showing "Próximo riego: …"
- [x] Manual: creating a schedule sets `next_due_at = now()`; the plant appears in the home "Hoy" section on focus
- [x] Manual: `WaterNowButton` on the due-section → "Regada ✓"; row leaves "Hoy" on next focus; plant detail's "Próximo riego" advances by `frequency_days`; a `watering` journal entry appears in the plant's "Diario"
- [x] Manual: pause (active=false) → plant leaves "Hoy" and agenda; its `watering-<id>` notification is canceled; resume brings it back
- [x] Manual: bell icon opens `/watering`; upcoming ~30 days grouped by Spanish day; "Regar" on a row updates it
- [x] Manual: reminder fires at `next_due_at`'s date at `notify_time`; tapping the system notification opens the plant detail
- [x] Manual: overdue plant → reconciler schedules `now + 1min`; a single gentle reminder, no spam burst
- [x] Manual: deleting a plant cascades to its `watering_schedules` row; the next reconciler cancels its notification
- [x] Manual: edit frequency → `next_due_at` recomputes from `last_watered_at`; agenda reflects the new cadence
- [x] Manual: RLS — a second user's client cannot read/update another user's `watering_schedules`

## Phase 11 — Roadmap

- [x] Update `spec/constitution/roadmap.md`: mark all `006-watering-schedule` checklist items as `[x]`