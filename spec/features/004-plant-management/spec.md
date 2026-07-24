# 004 - Plant Management

**Status:** Planning

## What makes

Users can add, view, edit, and delete their plants. Each plant gets its own detail screen with a photo timeline — every plant's *living memory* starts here.

- **Create plant screen** — name (required), species, location, notes, and a photo from camera or gallery.
- **Image picker** — via `expo-image-picker`, the user can take a photo with the camera or choose one from their gallery.
- **Photo upload** — images are uploaded to a Supabase Storage bucket (`plant-photos`) with RLS enforcement, organized by `user_id/plant_id/timestamp.{ext}`.
- **Plant list on home** — the home screen renders the user's plants sorted newest first. Each plant appears as a `PlantCard` component.
- **Plant card component** — photo thumbnail, name, species, and a quick visual status (placeholder for 014-health-indicator). Tapping navigates to the plant detail.
- **Plant detail screen** — replaces the `003` placeholder scaffold. Shows full plant info, the plant photo, and quick actions: Ver diario (journal), Editar (edit), Eliminar (delete), and a photo timeline section.
- **Photo timeline** — a grid of all photos associated with the plant (main photo + journal entry photos), showing the plant's visual history. *"Qué bonito ha sido verlas crecer."*
- **Edit plant screen** — pre-filled form with all current plant data. Name validation prevents empty submissions.
- **Delete plant** — confirmation dialog (Alert) before deleting. Cascades to journal entries (via DB foreign key `ON DELETE CASCADE`).
- **Form validation** — Spanish error messages. Name is required; species and location are optional.

## Why

The mission says *"The main unit is not the calendar. It's not the chat. It's not the database. It's each plant."* Feature `004` makes each plant real in the app — not a scaffold, not a placeholder, but a living space the user returns to. Without plant CRUD, the entire app is a hollow shell.

The `plants` table has existed since `001` but no screen touches it. `003` shipped empty states and scaffolds knowing `004` would fill them. Now the home screen actually shows plants; the plant detail screen actually shows data; the "Añadir mi primera planta" button actually works.

Photo upload lands here because:
- The plant's main photo is part of its identity and belongs in plant creation.
- The `plant-photos` storage bucket is needed for journal photos too (`005`), so it's set up once here.
- The photo timeline (all photos for a plant) gives the user the emotional reward: watching their plant grow over time.

## Acceptance criteria

1. The home screen at `(app)/index.tsx` fetches the user's plants from Supabase (`plants` table, ordered by `created_at DESC`), renders them as `PlantCard` components, and shows an `EmptyState` (the existing "Añadir mi primera planta" with the wired action) when the user has zero plants.
2. The `PlantCard` component displays the plant photo (or a placeholder), name, species, and location. Tapping navigates to `plants/[id]`.
3. The "Añadir mi primera planta" button on the home empty state and a `+` FAB (or header button) on the home screen navigate to the create plant screen.
4. The create plant screen (`(app)/new-plant.tsx`) has fields for name, species, location, notes, and a photo picker. Name is required; others are optional. Form validates with Spanish messages.
5. `expo-image-picker` integration: tapping the photo area opens a choice between camera and gallery. The selected image is shown as a preview. On form submission, the image is uploaded to Supabase Storage; the resulting public URL is saved as `plants.photo_url`.
6. A Supabase Storage bucket `plant-photos` exists with RLS policies: authenticated users can read all objects, and can insert/update/delete only objects whose path starts with `{user_id}/`.
7. The plant detail screen at `plants/[id]/index.tsx` fetches the plant by ID, displays all its fields in a `Card`, shows quick action buttons (Editar, Eliminar), and includes a photo timeline grid section.
8. The photo timeline grid shows all images associated with the plant: the main `photo_url` and any `journal_entries.photo_url` values, rendered as thumbnails in a 3-column grid.
9. The edit plant screen at `plants/[id]/edit.tsx` loads the current plant data, shows a pre-filled form, and updates on submit. The photo can be changed (same picker flow).
10. Deleting a plant shows an `Alert.alert` confirmation dialog with title "Eliminar planta" and message "¿Estás seguro? Esta acción no se puede deshacer." On confirm, the plant is deleted from the database; journal entries cascade-delete via FK.
11. After delete, the user is navigated back to the home screen.
12. The `ON DELETE CASCADE` foreign key on `journal_entries.plant_id` is confirmed to exist (set in `001`). If absent, a migration adds it.
13. All Supabase queries use the typed client (`supabase.from("plants")`) and RLS ensures users only see their own data.
14. `npm run lint` passes with no errors.
15. `npx tsc --noEmit` passes under strict mode.

## Out of reach

- Watering schedules, journal entry creation, or any care tracking — those are `005` and `006`.
- Plant health indicators or badges — `014-health-indicator`.
- The "Diario" section on plant detail is still an `EmptyState` "Próximamente" placeholder — it's filled by `005`.
- The "Consulta a Flora" section on plant detail is still a placeholder — `008`/`010` own the AI.
- Image optimization, compression, or thumbnail generation — images are uploaded as-is. Future enhancement.
- Offline plant cache — all data is fetched live from Supabase.
- Multi-photo support for a single plant (beyond the main photo) — the main `photo_url` field holds one image. Multiple photos come from journal entries.
- Drag-to-reorder or bulk actions on the plant list.
