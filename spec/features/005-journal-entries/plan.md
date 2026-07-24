# 005 - Journal Entries

## Approach

Four layers, built incrementally. The data layer and shared components come first; then the add/edit screens build on them; finally the plant detail is retrofitted to show the real journal.

```
Layer 1 — Data + constants     Layer 2 — Components           Layer 3 — Screens                 Layer 4 — Integration
──────────────────────         ──────────────────────          ──────────────────────────         ──────────────────────────────
journal-entries.ts             JournalEntryCard               plants/[id]/new-entry.tsx          Plant detail: replace "Diario" placeholder
journal.ts (type labels/icons) JournalEntryForm               plants/[id]/edit-entry.tsx         Journal feeds + refresh-on-focus
                              JournalSection                                                    _layout.tsx route registration
```

### 1. Verify the foundation (no migration)

Before any code, confirm what `001`/`004` already shipped — `005` reuses all of it:

- `journal_entries` table: `id, plant_id (FK, ON DELETE CASCADE), user_id (FK, ON DELETE CASCADE), type (enum), content (text, nullable), photo_url (text, nullable), created_at, updated_at` + the `handle_updated_at` trigger (`supabase/migrations/20260722180208_create_journal_entries_table.sql`).
- `journal_entry_type` enum: `watering, fertilizing, repotting, pruning, observation` (same migration).
- RLS policies `journal_owner_select/insert/update/delete` (`supabase/migrations/20260722180216_enable_rls_policies.sql`).
- `plant-photos` storage bucket + folder-based RLS (`plant-photos` migration from `004`).
- `uploadPlantPhoto(userId, plantId, uri)` and `deletePlantPhoto(url)` helpers (`src/lib/supabase/storage.ts`).

If any of the above were ever missing, a migration would fix it — but as of this plan they all exist, so **`005` ships zero migrations**. The generated TypeScript types already include `journal_entries` and the enum.

### 2. Data layer — `src/lib/supabase/journal-entries.ts`

Mirrors `src/lib/supabase/plants.ts` exactly: typed helpers that throw on error.

```ts
import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";

export type JournalEntry = Tables<"journal_entries">;
export type JournalEntryInsert = TablesInsert<"journal_entries">;
export type JournalEntryUpdate = TablesUpdate<"journal_entries">;
export type JournalEntryType = Database["public"]["Enums"]["journal_entry_type"];

export async function fetchJournalEntries(plantId: string): Promise<JournalEntry[]>;
export async function createJournalEntry(entry: Omit<JournalEntryInsert, "user_id"> & { user_id: string }): Promise<JournalEntry>;
export async function updateJournalEntry(id: string, updates: JournalEntryUpdate): Promise<JournalEntry>;
export async function deleteJournalEntry(id: string): Promise<void>;
```

`fetchJournalEntries` selects `*` for the plant, `.order("created_at", { ascending: false })`. `createJournalEntry` inserts + `.select("*").single()`. `updateJournalEntry` updates by `id` + `.select("*").single()`. `deleteJournalEntry` deletes by `id`. `user_id` is supplied by the caller from `useAuth().user.id` (RLS also enforces it server-side).

### 3. Journal constants — `src/lib/journal.ts`

A single source of truth for the five care types' Spanish labels, MaterialCommunity line-art icon names, and accent colors:

```ts
export const JOURNAL_ENTRY_TYPES = {
  watering:     { label: "Riego",          icon: "watering-can-outline", color: "#6E8E6A" },
  fertilizing:  { label: "Fertilización",  icon: "sprout",               color: "#A8C29A" },
  repotting:    { label: "Trasplante",      icon: "flower-tulip-outline", color: "#C7A47B" },
  pruning:      { label: "Poda",            icon: "content-cut",          color: "#D7B65A" },
  observation:  { label: "Observación",     icon: "eye-outline",          color: "#7B756E" },
} as const satisfies Record<JournalEntryType, { label: string; icon: string; color: string }>;
```

Also a `formatEntryDate(iso)` helper returning a Spanish date string (e.g. "24 jul 2026") and a `formatEntryMonthHeader(iso)` returning "Julio 2026", using a hardcoded Spanish month-name array so no `Intl` polyfill is needed on the device.

### 4. `JournalEntryCard` — `src/components/JournalEntryCard.tsx`

Props: `entry: JournalEntry` + `onPress`. Renders inside a `Card`:
- a type chip (rounded, soft tint of the type color) with the line-art icon + Spanish label;
- the content text (Inter `bodySmall`) when present;
- an optional rounded photo thumbnail (48–56px, `expo-image`) when `photo_url` is set;
- the date stamp (Inter `caption`, secondary text) in Spanish.

`onPress` opens the edit screen. Calm fade (200ms) on press-in via Reanimated, consistent with the guide's animation principles.

### 5. `JournalEntryForm` — `src/components/JournalEntryForm.tsx`

Reusable fields shared by the add and edit screens (mirrors how `PlantForm` is shared in `004`):
- **Type chips** — a wrap row of the five `JOURNAL_ENTRY_TYPES`, one selected at a time (controlled via `value`/`onValueChange`). Sage outline by default, sage fill when selected.
- **Content** — `Input` multiline, placeholder "¿Qué has hecho con tu planta?" (optional).
- **Photo area** — the same picker pattern as `004`: tap → `pickPhotoSource()` → `openImagePicker(source)`; shows the selected image preview or a watercolor placeholder (`Illustration name="leaf"`). Edit screens additionally show a "Quitar foto" affordance to clear the selection.

### 6. `JournalSection` — `src/components/JournalSection.tsx`

Props: `plantId`, `entries: JournalEntry[]`, `isLoading`, `onAdd: () => void`, `onEntryPress: (entry) => void`. Renders:
- a row: "Diario" (Fraunces `h3`) on the left, a `+` line-art button on the right (calls `onAdd`).
- a `LoadingSkeleton` while `isLoading`.
- when `entries.length === 0`: a calm `EmptyState` titled "Aún no hay entradas en el diario" with subtitle "Registra un riego, una poda, o cualquier cuidado." and an action button that calls `onAdd`.
- otherwise: entries grouped by month via a `groupEntriesByMonth(entries)` util, each group rendered as a month header (`bodyMedium`, secondary text) followed by its `JournalEntryCard`s.

### 7. Add entry screen — `src/app/(app)/plants/[id]/new-entry.tsx`

States: `form`, `uploading`, `saving`, `error`.

- Reads `id` (plant) and an optional `type` query param via `useLocalSearchParams`. Resolves the initial type: valid param → that chip; else `observation`.
- Renders `JournalEntryForm`. Validation: a type is always selected; content/photo optional.
- On submit:
  1. If a photo was chosen: `uploadPlantPhoto(user.id, id, uri)` → `photo_url`.
  2. `createJournalEntry({ plant_id: id, user_id: user.id, type, content, photo_url })`.
  3. `router.back()`.
- Loading state on the submit button while `uploading`/`saving`; Spanish error surfaced inline.

### 8. Edit entry screen — `src/app/(app)/plants/[id]/edit-entry.tsx`

Reads `id` (plant) and `entryId` (`useLocalSearchParams`). States: `loading`, `form`, `saving`, `error`.

- Fetches the entry by `entryId` (single select), guards ownership (a not-found/error shows the same "no encontrada" pattern as the plant detail in `004`).
- Pre-fills `JournalEntryForm` with the entry's `type`, `content`, and photo URL (as a preview to replace/keep/remove).
- On submit (`updateJournalEntry`):
  - photo unchanged → keep `photo_url`;
  - photo replaced → if an old `photo_url` existed, `deletePlantPhoto(old)`; then upload the new one and store its URL;
  - photo removed → `deletePlantPhoto(old)` if present; set `photo_url` to `null`;
  - update `type` + `content` accordingly.
- Destructive "Eliminar entrada" button → `Alert.alert("Eliminar entrada", "¿Estás seguro? Esta acción no se puede deshacer.", …)` → on confirm `deleteJournalEntry(entryId)` (+ `deletePlantPhoto` of its photo) → `router.back()`.

### 9. Plant detail integration — `src/app/(app)/plants/[id]/index.tsx`

- Replace the literal "Diario" `EmptyState` (plant-detail:240) with `<JournalSection … />`.
- Add `fetchJournalEntries(id)` to the existing `Promise.all` in `loadData`; expose `journalEntries` + a `journalLoading` slice of state to the section.
- Wire `onAdd` → `router.push({ pathname: "/plants/[id]/new-entry", params: { id } })`.
- Wire `onEntryPress` → `router.push({ pathname: "/plants/[id]/edit-entry", params: { id, entryId: entry.id } })`.
- Switch `loadData`'s `useEffect` to `useFocusEffect` so the journal refreshes when the user returns from add/edit. (The current `useEffect([loadData])` only runs on mount and wouldn't pick up newly created entries when the screen is still mounted under the pushed route.)

### 10. Route registration — `src/app/(app)/_layout.tsx`

Add two `Stack.Screen` entries:
- `plants/[id]/new-entry` → title "Nueva entrada".
- `plants/[id]/edit-entry` → title "Editar entrada".

## Implementation

### Packages

None — `expo-image-picker`, `expo-image`, `react-native-reanimated`, and `@supabase/supabase-js` are already installed (from `003`/`004`).

### Files (new)

```
src/lib/supabase/journal-entries.ts
src/lib/journal.ts
src/components/JournalEntryCard.tsx
src/components/JournalEntryForm.tsx
src/components/JournalSection.tsx
src/app/(app)/plants/[id]/new-entry.tsx
src/app/(app)/plants/[id]/edit-entry.tsx
```

### Files (modified)

```
src/app/(app)/plants/[id]/index.tsx   # replace "Diario" placeholder + load + refresh journal; use useFocusEffect
src/app/(app)/_layout.tsx             # register new-entry + edit-entry routes
```

### Migrations

None.

## Decisions

1. **No migration.** The `journal_entries` table, its enum, RLS, the `plant-photos` bucket, and the upload/delete helpers all exist from `001`/`004`. `005` is purely an app-layer feature. Caught in `plan.md` preflight.

2. **Reuse the `plant-photos` bucket for journal photos.** A journal photo is still a photo of that plant; the `plant-photos` folder-based RLS (`{user_id}/…`) already enforces ownership, and `004`'s photo timeline already merges `plants.photo_url` with `journal_entries.photo_url` — keeping them in one bucket keeps that merge trivial and avoids a second bucket + migration.

3. **Journal rendered inline on plant detail, not a separate route.** Matches the roadmap ("rendered on plant detail screen") and the "main unit is the plant" principle. Risk: a very long history in one `ScrollView`. Mitigated for V0.1 (typical counts are small); a dedicated diary route can be extracted later without touching `JournalEntryCard`.

4. **Mapped groups in `ScrollView`, not a `SectionList`.** Nesting a virtualized `SectionList` inside the detail `ScrollView` is awkward; a mapped, grouped render inside the existing scroll is simpler and fine for V0.1 counts. (This is the reciprocal of decision 3's future-extract path.)

5. **Type preselect via query param.** `new-entry.tsx` accepts `?type=watering|…` so a future "Riego ahora" shortcut (`006`) can open this screen pre-filled, without `006` having to know anything about the form. Encodes the "everything ends in a concrete action" loop early.

6. **Storage cleanup on edit and delete.** Replacing or removing an entry's photo (and deleting an entry) calls `deletePlantPhoto` on the old URL so the bucket doesn't accumulate orphans. Best-effort — a failure to delete a file doesn't abort a successful row update/delete of the entry; it's logged and the user-facing op still succeeds.

7. **Month labels without `Intl`.** Hardcoded Spanish monthname arrays in `src/lib/journal.ts`. Avoids depending on a device `Intl` polyfill and keeps dates deterministic across locales.

8. **`useFocusEffect` for the detail's refresh.** When add/edit push onto the stack, the detail stays mounted; returning to it doesn't re-run `useEffect`. `useFocusEffect` re-fetches the plant + journal so new/edited entries appear immediately. A one-line behavior change confined to `loadData`'s call site.

## Risks

- **Orphan storage files** if `deletePlantPhoto` fails mid-update/delete. Mitigation: best-effort deletion (decision 6); the journal row operation always wins, and a later cleanup pass can sweep orphans.
- **Long journals inside the detail `ScrollView`.** Acceptable for V0.1; flagged for a future dedicated diary route (decision 3). If a plant collects hundreds of entries, the detail screen scroll cost grows linearly — switch to a paginated route before that matters.
- **Photo upload errors on slow networks.** Mitigated with a loading state on the submit button and a Spanish error message surfaced inline (matching `004`'s recently hardened upload path).
- **Focus-effect refetch churn.** Switching to `useFocusEffect` means the detail re-queries every time it gains focus (including from irrelevant navigations). Cheap for V0.1 (single plant + its entries); can be narrowed later with a "dirty" flag if needed.
- **Enum immutability.** A new care type would require a SQL migration to extend `journal_entry_type`. Out of scope for `005`; flagged for whenever the product needs it.

## Verification

- Add an entry without a photo → it appears on the plant detail, grouped by month.
- Add an entry with a photo → the photo uploads to `plant-photos`; the card shows a thumbnail and the entry's photo also shows in the "Fotos" timeline (because `fetchPlantPhotos` already merges journal photos).
- `type` query param preselects the right chip; an invalid/missing value defaults to observation.
- Edit an entry → on return, the card reflects the new type/content/photo.
- Replace a photo on edit → the old file is removed from Storage and the new URL is stored; the timeline updates.
- Remove a photo on edit → `photo_url` becomes null and the old file is deleted; the thumbnail and the timeline entry disappear.
- Delete an entry → confirmation dialog → the entry and its photo (if any) are gone; the list refreshes on return.
- A plant with no entries shows "Aún no hay entradas en el diario"; its action button opens the add-entry screen.
- Returning from add/edit refreshes the journal (focus-effect), without a full app reload.
- `npm run lint` passes, `npx tsc --noEmit` passes.