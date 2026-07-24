# 005 - Journal Entries

## Phase 0 — Preflight (foundation check)

- [ ] Confirm `journal_entries` table + `journal_entry_type` enum exist (`supabase/migrations/20260722180208_create_journal_entries_table.sql`)
- [ ] Confirm RLS policies `journal_owner_select/insert/update/delete` exist (`supabase/migrations/20260722180216_enable_rls_policies.sql`)
- [ ] Confirm `plant-photos` storage bucket + folder-based RLS exist (`004` migration)
- [ ] Confirm `uploadPlantPhoto` / `deletePlantPhoto` exist in `src/lib/supabase/storage.ts`
- [ ] Confirm generated `database.types.ts` already includes `journal_entries` + the enum (regenerate only if drift)
- [ ] No new Supabase migration required for `005`

## Phase 1 — Data layer + constants

- [ ] Create `src/lib/supabase/journal-entries.ts` — type aliases `JournalEntry`, `JournalEntryInsert`, `JournalEntryUpdate`, `JournalEntryType`
- [ ] `fetchJournalEntries(plantId)` — `select("*")`, `.eq("plant_id", plantId)`, `.order("created_at", { ascending: false })`, throw on error
- [ ] `createJournalEntry(entry)` — insert + `.select("*").single()`, return row
- [ ] `updateJournalEntry(id, updates)` — update + `.select("*").single()`, return row
- [ ] `deleteJournalEntry(id)` — delete by `id`, throw on error
- [ ] Create `src/lib/journal.ts` — `JOURNAL_ENTRY_TYPES` map (id → Spanish label, MaterialCommunity line-art icon name, accent color) typed via `satisfies Record<JournalEntryType, …>`
- [ ] `formatEntryDate(iso)` — Spanish short date ("24 jul 2026")
- [ ] `formatEntryMonthHeader(iso)` — Spanish month header ("Julio 2026") via hardcoded Spanish month-name arrays (no `Intl`)
- [ ] `groupEntriesByMonth(entries)` — returns `{ header, entries }[]` newest-first, one group per month

## Phase 2 — Shared components

- [ ] Create `src/components/JournalEntryCard.tsx` — `Card` with type chip (line-art icon + Spanish label on soft type-color tint), content (`bodySmall` when present), optional rounded photo thumbnail (`expo-image`), Spanish date stamp; `onPress` prop; calm 200ms press fade via Reanimated
- [ ] Create `src/components/JournalEntryForm.tsx` — reusable fields for add + edit: type chips row (controlled `value`/`onValueChange`, one selected; sage outline default, sage fill when selected), content `Input` multiline (optional), photo picker area (reuse `pickPhotoSource` + `openImagePicker`; preview or `Illustration name="leaf"` placeholder); edit callers can show a "Quitar foto" affordance
- [ ] Create `src/components/JournalSection.tsx` — "Diario" header (`h3`/Fraunces) + `+` line-art add button; `LoadingSkeleton` while loading; `EmptyState` "Aún no hay entradas en el diario" + action when empty; otherwise grouped-by-month `JournalEntryCard` list

## Phase 3 — Add entry screen

- [ ] Create `src/app/(app)/plants/[id]/new-entry.tsx`
- [ ] Read `id` + optional `type` query param via `useLocalSearchParams`; resolve initial type (valid param → that chip; else `observation`)
- [ ] Render `JournalEntryForm`; type always selected; content + photo optional
- [ ] On submit: if photo chosen → `uploadPlantPhoto(user.id, id, uri)` → `photo_url`; then `createJournalEntry({ plant_id: id, user_id: user.id, type, content, photo_url })`; `router.back()`
- [ ] `uploading` / `saving` loading state on the submit button; inline Spanish error message on failure
- [ ] Loading / error states

## Phase 4 — Edit entry screen

- [ ] Create `src/app/(app)/plants/[id]/edit-entry.tsx` (reads `entryId` query param)
- [ ] Fetch the entry by `entryId`; pre-fill `JournalEntryForm` (type, content, current `photo_url` as preview)
- [ ] On submit (`updateJournalEntry`): photo unchanged → keep; replaced → `deletePlantPhoto(old)` (if any) then upload new; removed → `deletePlantPhoto(old)` (if any) + set `photo_url` null; update `type` + `content`; `router.back()`
- [ ] Destructive "Eliminar entrada" button → `Alert.alert("Eliminar entrada", "¿Estás seguro? Esta acción no se puede deshacer.", …)` → on confirm `deleteJournalEntry(entryId)` + `deletePlantPhoto(entry.photo_url)` (if any) → `router.back()`
- [ ] Loading / not-found / error states

## Phase 5 — Plant detail integration

- [ ] In `src/app/(app)/plants/[id]/index.tsx`, add `fetchJournalEntries(id)` to the existing `Promise.all` in `loadData`; add `journalEntries` + journal-loading state
- [ ] Replace the "Diario" `EmptyState` placeholder (current `plant-detail:240`) with `<JournalSection … />`
- [ ] Wire `onAdd` → `router.push({ pathname: "/plants/[id]/new-entry", params: { id } })`
- [ ] Wire `onEntryPress` → `router.push({ pathname: "/plants/[id]/edit-entry", params: { id, entryId: entry.id } })`
- [ ] Switch `loadData` from `useEffect` to `useFocusEffect` so the journal refreshes on return from add/edit
- [ ] Loading skeleton for the journal section while fetching

## Phase 6 — Route registration

- [ ] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` for `plants/[id]/new-entry` (title "Nueva entrada") and `plants/[id]/edit-entry` (title "Editar entrada")

## Phase 7 — Verification

- [ ] `npm run lint` passes (0 errors)
- [ ] `npx tsc --noEmit` passes under strict
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