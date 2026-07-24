# 005 - Journal Entries

**Status:** Done

## What makes

Each plant gets its *living memory*: a chronological logbook of care events, written and read from the plant detail screen. This is where the relationship between a person and their plants is recorded — one calm entry at a time.

- **Add journal entry** — a `type` (riego, fertilización, trasplante, poda, observación), optional content text, and an optional photo. Entries are plant-scoped and created from the plant detail screen.
- **Type selection** — tappable chips for the five care types, each with a line-art icon + Spanish label. One type is always selected (default `observation`, or a value passed via query param for future quick actions).
- **Journal entry list** — all entries for the plant, grouped by month (newest first), rendered inline on the plant detail screen (replacing the `003`/`004` "Diario" placeholder).
- **Journal entry card** — type icon + Spanish label, the content (if any), an optional photo thumbnail, and a date stamp in Spanish. Tapping the card opens the edit screen.
- **Edit journal entry** — pre-filled form; type, content, and photo can change; the photo can be replaced or removed.
- **Delete journal entry** — destructive action with a confirmation dialog. Deleting also removes the entry's photo from Supabase Storage so nothing is orphaned.
- **Empty state** — when a plant has no entries: a calm `EmptyState` reading "Aún no hay entradas en el diario" with a button to add the first one.

## Why

The mission says every plant has *a living memory* — history, care, photos — in its own space. Features `001`–`004` made plants real and gave them a photo, but their *Diario* section is still a "Próximamente" placeholder. `005` fills it: the place where watering, fertilizing, repotting, pruning, and simple observations are recorded over time.

The logbook is what makes a plant's space a *place the user returns to*. Months later, scrolling back through entries is the small, calm reward — "qué bonito ha sido verlas crecer" — and it is also the data the AI consultation (`008`/`010`) will lean on: *"before responding, it considers previous photos, watering history, fertilizations, repottings…"*. Without journal history, the AI has no memory to use.

Photo support lands here because the `plant-photos` storage bucket and upload helper already exist from `004` (they were explicitly noted as reusable for `005`). Reusing one bucket keeps the per-plant photo timeline (main photo + journal photos) consistent.

## Acceptance criteria

1. The plant detail screen at `src/app/(app)/plants/[id]/index.tsx` replaces the existing "Diario" `EmptyState` placeholder with a real journal section: a "Diario" header with an add (`+`) control, then either a month-grouped list of entries or a calm `EmptyState` titled "Aún no hay entradas en el diario" with an action button that navigates to the add-entry screen.
2. Adding an entry lives at `src/app/(app)/plants/[id]/new-entry.tsx`. Fields: type chips (the five `journal_entry_type` values), optional content `Input` (multiline), optional photo via the existing image-picker helper. A type is always selected.
3. The add screen accepts an optional `type` query param; when it is a valid `journal_entry_type`, that chip is preselected (otherwise `observation`). This enables future quick actions (e.g. a "Riego" shortcut from `006`) without new screens.
4. On submit: if a photo was chosen, it is uploaded to the existing `plant-photos` bucket via `uploadPlantPhoto(userId, plantId, uri)` and the resulting public URL is stored as `journal_entries.photo_url`; otherwise the row is inserted with a null photo. After a successful insert the user returns to the detail screen and the new entry appears in the list.
5. The journal list comes from `fetchJournalEntries(plantId)` (ordered by `created_at DESC`) and is grouped by month with Spanish headers (e.g. "Julio 2026").
6. A `JournalEntryCard` component renders: the type's line-art icon + its Spanish label, the entry content (when present), an optional rounded photo thumbnail (using `expo-image`), and the entry date in Spanish. Tapping the card navigates to the edit-entry screen.
7. Editing an entry lives at `src/app/(app)/plants/[id]/edit-entry.tsx`, reached with an `entryId` query param. It loads the current entry, pre-fills the form, and on submit updates the row. Photo handling: if replaced, the old photo (if any) is deleted from Storage and the new one is uploaded; if removed, `photo_url` is set to null and the old photo is deleted; if unchanged, the URL is kept untouched. After a successful update the user returns to the detail screen and the changes are visible.
8. Deleting an entry uses an `Alert.alert` confirmation — title "Eliminar entrada", message "¿Estás seguro? Esta acción no se puede deshacer." On confirm, the entry and its photo (if any) are removed from the database and Storage, and the user returns to the detail screen.
9. All Supabase access goes through the typed client and RLS (the policies created in `001` guarantee users only read/modify their own entries). No client may read or write another user's journal entries.
10. No new Supabase migration is required: the `journal_entries` table, the `journal_entry_type` enum, their RLS policies, and the `plant-photos` bucket with its folder-based RLS all already exist from `001`/`004`. This is documented in `plan.md`.
11. Visual style follows the `brote-visual-guide` and the theme tokens: warm-white background (`#F8F6F2`), brown-black body text (`#3F3A36`), sage primary (`#6E8E6A`), Fraunces for the "Diario" section title, Inter for body, generous spacing, radii ≥ 16 for cards/chips, soft shadows, and slow (200–400ms) fade/scale micro-interactions. No emoji as icons; line-art icons only.
12. `npm run lint` passes with no errors.
13. `npx tsc --noEmit` passes under strict mode.

## Out of reach

- Watering schedules, the "Riego ahora" quick action, and local notifications — `006-watering-schedule`. (`005` only proves the entry can be created with a preselected `type`.)
- Plant health indicators / badges — `014-health-indicator`.
- AI consultation and context building — `008`/`010`. (`005` simply writes the history those features will read.)
- Linking a fertilizing entry to an inventory item — `011-inventory-management`.
- Light measurements — `007-light-tool`.
- A separate full-page diary route with pagination/virtualization. V0.1 renders the journal inline on plant detail; if a plant's history grows large, a dedicated route can be extracted later without breaking the card component.
- Image compression or thumbnail generation — reused as-is from `004` (picker `quality: 0.7`).
- Offline read cache — entries are fetched live from Supabase.
- Editing the `created_at` of an entry (back-dating a care event). Future enhancement.