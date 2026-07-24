# 005 - Journal Entries

## Phase 0 — Preflight (foundation check)

- [x] Confirm `journal_entries` table + `journal_entry_type` enum exist (`supabase/migrations/20260722180208_create_journal_entries_table.sql`)
- [x] Confirm RLS policies `journal_owner_select/insert/update/delete` exist (`supabase/migrations/20260722180216_enable_rls_policies.sql`)
- [x] Confirm `plant-photos` storage bucket + folder-based RLS exist (`004` migration)
- [x] Confirm `uploadPlantPhoto` / `deletePlantPhoto` exist in `src/lib/supabase/storage.ts`
- [x] Confirm generated `database.types.ts` already includes `journal_entries` + the enum (regenerate only if drift)
- [x] No new Supabase migration required for `005`

## Phase 1 — Data layer + constants

- [x] Create `src/lib/supabase/journal-entries.ts` — type aliases `JournalEntry`, `JournalEntryInsert`, `JournalEntryUpdate`, `JournalEntryType`
- [x] `fetchJournalEntries(plantId)` — `select("*")`, `.eq("plant_id", plantId)`, `.order("created_at", { ascending: false })`, throw on error
- [x] `createJournalEntry(entry)` — insert + `.select("*").single()`, return row
- [x] `updateJournalEntry(id, updates)` — update + `.select("*").single()`, return row
- [x] `deleteJournalEntry(id)` — delete by `id`, throw on error
- [x] Create `src/lib/journal.ts` — `JOURNAL_ENTRY_TYPES` map (id → Spanish label, MaterialCommunity line-art icon name, accent color)
- [x] `formatEntryDate(iso)` — Spanish short date ("24 jul 2026")
- [x] `formatEntryMonthHeader(iso)` — Spanish month header ("Julio 2026") via hardcoded Spanish month-name arrays (no `Intl`)
- [x] `groupEntriesByMonth(entries)` — returns `{ header, entries }[]` newest-first, one group per month

## Phase 2 — Shared components

- [x] Create `src/components/JournalEntryCard.tsx` — `Card` with type chip (line-art icon + Spanish label on soft type-color tint), content (`bodySmall` when present), optional rounded photo thumbnail (`expo-image`), Spanish date stamp; `onPress` prop; calm press opacity
- [x] Create `src/components/JournalEntryForm.tsx` — reusable fields for add + edit: type chips row (controlled `value`/`onValueChange`, one selected; sage outline default, sage fill when selected), content `Input` multiline (optional), photo picker area (reuse `pickPhotoSource` + `openImagePicker`; preview or `Illustration name="leaf"` placeholder); "Quitar foto" affordance
- [x] Create `src/components/JournalSection.tsx` — "Diario" header (`h2`/Fraunces) + `+` line-art add button; `LoadingSkeleton` while loading; `EmptyState` "Aún no hay entradas en el diario" + action when empty; otherwise grouped-by-month `JournalEntryCard` list

## Phase 3 — Add entry screen

- [x] Create `src/app/(app)/plants/[id]/new-entry.tsx`
- [x] Read `id` + optional `type` query param via `useLocalSearchParams`; resolve initial type (valid param → that chip; else `observation`)
- [x] Render `JournalEntryForm`; type always selected; content + photo optional
- [x] On submit: if photo chosen → `uploadPlantPhoto(user.id, id, uri)` → `photo_url`; then `createJournalEntry({ plant_id: id, user_id: user.id, type, content, photo_url })`; `router.back()`
- [x] `isSaving` loading state on the submit button; inline Spanish error message on failure
- [x] Loading / error states

## Phase 4 — Edit entry screen

- [x] Create `src/app/(app)/plants/[id]/edit-entry.tsx` (reads `entryId` query param)
- [x] Fetch the entry by `entryId`; pre-fill `JournalEntryForm` (type, content, current `photo_url` as preview)
- [x] On submit (`updateJournalEntry`): photo unchanged → keep; replaced → `deletePlantPhoto(old)` (if any) then upload new; removed → `deletePlantPhoto(old)` (if any) + set `photo_url` null; update `type` + `content`; `router.back()`
- [x] Destructive "Eliminar entrada" button → `Alert.alert("Eliminar entrada", "¿Estás seguro? Esta acción no se puede deshacer.", …)` → on confirm `deleteJournalEntry(entryId)` + `deletePlantPhoto(entry.photo_url)` (if any) → `router.back()`
- [x] Loading / not-found / error states

## Phase 5 — Plant detail integration

- [x] In `src/app/(app)/plants/[id]/index.tsx`, add `fetchJournalEntries(id)` to data load; add `journalEntries` + `isJournalLoading` state
- [x] Replace the "Diario" `EmptyState` placeholder with `<JournalSection … />`
- [x] Wire `onAdd` → `router.push({ pathname: "/plants/[id]/new-entry", params: { id } })`
- [x] Wire `onEntryPress` → `router.push({ pathname: "/plants/[id]/edit-entry", params: { id, entryId: entry.id } })`
- [x] Split journal refresh via `useFocusEffect` so entries refresh on return from add/edit
- [x] Loading skeleton for the journal section while fetching

## Phase 6 — Route registration

- [x] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` for `plants/[id]/new-entry` (title "Nueva entrada") and `plants/[id]/edit-entry` (title "Editar entrada")

## Phase 7 — Verification

- [x] `npm run lint` passes (0 errors)
- [x] `npx tsc --noEmit` passes under strict
- [ ] Manual: add entry without photo → appears on detail grouped by month
- [ ] Manual: add entry with photo → uploads to `plant-photos`, thumbnail on card + photo in "Fotos" timeline
- [ ] Manual: `type` query param preselects the chip; invalid/missing defaults to `observation`
- [ ] Manual: edit entry → changes reflected on return (via focus refetch)
- [ ] Manual: replace photo on edit → old file removed, new URL stored, timeline updates
- [ ] Manual: remove photo on edit → `photo_url` null, old file deleted, thumbnail/timeline entry gone
- [ ] Manual: delete entry → confirmation dialog → entry + its photo removed, list refreshes
- [ ] Manual: empty state shows for a plant with no entries; action button opens add screen
- [ ] Manual: returning from add/edit refreshes the journal without reload

## Phase 8 — Roadmap

- [ ] Update `spec/constitution/roadmap.md`: mark all `005-journal-entries` checklist items as `[x]`
