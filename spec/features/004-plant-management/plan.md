# 004 - Plant Management

## Approach

Four layers, built incrementally. The storage migration and image infrastructure come first; then the screens build on them.

```
Layer 1 — Storage + infra  Layer 2 — Components    Layer 3 — Screens                  Layer 4 — Integration
──────────────────         ────────────────          ────────────────────────           ────────────────────
Storage bucket migration   PlantCard                 new-plant.tsx                      Home screen retrofit
expo-image-picker install  PhotoGrid (timeline)      plants/[id]/index.tsx              Plant card list
Image upload helper        PlantFormFields           plants/[id]/edit.tsx               Delete + navigate
                           ConfirmationDialog        (app)/_layout.tsx route reg.
```

### 1. Storage bucket setup

A numbered migration creates the `plant-photos` bucket with RLS policies. The bucket is public-read (so `expo-image` can display URLs without auth headers) but write-protected: users can only upload/update/delete objects under `{user_id}/`. File paths follow `{user_id}/{plant_id}/{timestamp}.{ext}`.

```sql
-- Storage bucket
insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', true);

-- RLS: anyone can read
create policy "plant_photos_public_read" on storage.objects
  for select using (bucket_id = 'plant-photos');

-- RLS: owner can insert
create policy "plant_photos_owner_insert" on storage.objects
  for insert with check (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: owner can update/delete
create policy "plant_photos_owner_update" on storage.objects
  for update using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "plant_photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);
```

Migration also verifies that the `ON DELETE CASCADE` constraint exists on `journal_entries.plant_id` (set in `001`). If it doesn't, the migration adds it.

### 2. expo-image-picker

Install `expo-image-picker` ~17. The image picker flow:
1. User taps the photo area → `ActionSheet`-style choice between "Tomar foto" (camera) and "Elegir de galería" (gallery).
2. `expo-image-picker` returns a URI; we save it as local state until the form submits.
3. On form submit: if there's a new photo, upload it to Supabase Storage first, get the public URL, then insert/update the plant row with that URL.
4. The photo area component shows the selected image preview, or a placeholder watercolor illustration + "Añadir foto" label if no image is selected.

Helper module `src/lib/supabase/storage.ts` encapsulates the upload logic:
```ts
export async function uploadPlantPhoto(userId: string, plantId: string, uri: string): Promise<string>
```

The function generates the path, fetches the file as a Blob (using `fetch` + `arrayBuffer`), uploads via `supabase.storage.from('plant-photos').upload()`, and returns the public URL via `getPublicUrl()`.

### 3. Plant card component — `src/components/PlantCard.tsx`

Takes a `plants` Row as prop. Renders:
- `expo-image` thumbnail (60x60, rounded, with fallback placeholder `Illustration name="pot"`)
- Name (Fraunces, semiBold, 18px)
- Species (Inter, 14px, secondary text, italic)
- Location (Inter, 12px, secondary text, with a small location pin icon if present)

Wrapped in `Card` for the shadow/radius. `onPress` prop navigates to plant detail.

### 4. Photo grid — `src/components/PhotoGrid.tsx`

Renders a FlatList with `numColumns={3}`. Each cell is a square thumbnail (aspectRatio 1) using `expo-image`. Props: `photos: string[]` (URLs). If empty, renders nothing (the parent screen handles empty state).

Data comes from two sources combined: `plant.photo_url` (if non-null) + all `journal_entries.photo_url` values (non-null), deduplicated, sorted by... well, journal entries have `created_at`, the main photo doesn't have an obvious sort key. We'll put the main photo first, then journal entries chronologically.

### 5. New plant screen — `src/app/(app)/new-plant.tsx`

States: `form` (filling), `uploading` (photo is uploading), `saving` (insert in progress), `done` (navigating away).

Fields:
- Name — required, `Input`, placeholder "Ej: Monstera"
- Species — optional, `Input`, placeholder "Ej: Monstera deliciosa"
- Location — optional, `Input`, placeholder "Ej: Salón, junto a la ventana"
- Notes — optional, `Input` (multiline), placeholder "Notas sobre tu planta…"
- Photo — photo area component with picker

Validation on submit:
- Name: required, "El nombre no puede estar vacío"
- Photo: optional, but if present must upload successfully

On successful submit:
1. Insert plant row (without photo_url initially if uploading)
2. If photo selected: upload to storage, get URL, update plant row with `photo_url`
3. Navigate to home (`router.replace("/(app)")`)

### 6. Plant detail screen — `src/app/(app)/plants/[id]/index.tsx`

Replaces the `003` scaffold. States: `loading`, `loaded`, `notFound`, `error`.

- Fetches the plant by ID from Supabase on mount.
- Fetches journal entries with photos for the timeline.
- Renders: plant info `Card` (photo, name, species, location, notes), quick actions row (Editar, Eliminar), photo timeline grid section, and the existing placeholder "Diario" and "Consulta a Flora" `EmptyState` sections.
- The `expo-router` Stack screen gets a dynamic title (`plant.name`).

Delete flow: `Alert.alert` confirmation → delete from `plants` table → `router.replace("/(app)")`.

### 7. Edit plant screen — `src/app/(app)/plants/[id]/edit.tsx`

Pre-filled form with the plant's current data. Same validation rules as create. On submit: if a new photo was selected, upload it and update `photo_url`. Otherwise, only update text fields.

After successful update: `router.back()`.

### 8. Home screen retrofit — `src/app/(app)/index.tsx`

Replace the `hasPlants = false` hardcoded flag with a real Supabase query. Flow:
- `useEffect` fetches plants: `supabase.from("plants").select("*").order("created_at", { ascending: false })`
- Renders a `FlatList` of `PlantCard` components (or a `ScrollView` with mapped cards — depends on count).
- Empty state: keep the existing `EmptyState` but wire the action button to navigate to `/(app)/new-plant`.
- The "+" button in the header navigates to new plant.
- Remove the temporary "Cerrar sesión" button (move it to a less prominent spot or remove — the logout can be accessible from a future profile screen).

### 9. Route structure

```
src/app/(app)/
├── _layout.tsx              # Register new routes in the Stack
├── index.tsx                # Home (retrofitted)
├── new-plant.tsx            # Create plant
└── plants/[id]/
    ├── index.tsx            # Plant detail (replaces old [id].tsx)
    ├── edit.tsx             # Edit plant
    └── photos.tsx           # OPTIONAL: full-screen photo timeline (V0.1 ships the grid on detail, no separate route)
```

The existing `src/app/(app)/plants/[id].tsx` is **moved** to `src/app/(app)/plants/[id]/index.tsx`.

### 10. Visual style

All screens follow the `brote-visual-guide` checklist:
- Background: `#F8F6F2` warm white
- Text: `#3F3A36` brown-black
- Primary: `#6E8E6A` sage green
- Components use existing `Button`, `Input`, `Card`, `EmptyState`, `Illustration`
- Fraunces for headlines, Inter for body
- Rounded radii via tokens
- Soft card shadows via tokens

The photo picker area follows the visual guide: a rounded rectangle with border, a watercolor illustration placeholder (`Illustration name="leaf"`) when empty, replaced by the selected image preview.

## Implementation

### Packages

```bash
npx expo install expo-image-picker
```

Already present: `expo-image` ~3 (image display), `react-native-reanimated` ~4, `@supabase/supabase-js` ^2.

### Files (new)

```
supabase/migrations/<timestamp>_create_storage_bucket.sql
src/lib/supabase/storage.ts
src/components/PlantCard.tsx
src/components/PhotoGrid.tsx
src/app/(app)/new-plant.tsx
src/app/(app)/plants/[id]/index.tsx   (moved from ../[id].tsx)
src/app/(app)/plants/[id]/edit.tsx
```

### Files (modified)

```
src/app/(app)/index.tsx                # Retrofit with real plant list
src/app/(app)/_layout.tsx              # Register new Stack screens
src/app/(app)/plants/[id].tsx          # DELETED — replaced by [id]/index.tsx
```

## Decisions

1. **Storage bucket with folder-based RLS.** Using `(storage.foldername(name))[1]` to extract the first path segment (user ID) for ownership checks is the standard Supabase pattern. Simpler than a separate ownership table and avoids an extra join.

2. **Photo upload: URI → Blob → upload.** `expo-image-picker` returns a `file://` URI. We fetch it with `fetch(uri)` → `response.blob()` → `supabase.storage.upload()`. This works across iOS and Android without needing `react-native-blob-util` or `expo-file-system`.

3. **Plant detail: file-based route group `[id]/`.** Moving from `plants/[id].tsx` to `plants/[id]/index.tsx` lets us add sibling routes (`edit.tsx`) under the same dynamic segment using expo-router's folder-based layout pattern. This is the idiomatic expo-router v6 approach.

4. **Photo timeline on plant detail, not a separate route.** V0.1 keeps it simple: a grid section within the detail screen. A full-screen photo timeline route can be added later without breaking the existing grid component.

5. **expo-image for all image display.** Already a dependency. It provides `placeholder`, `transition`, and `recyclingKey` for smooth rendering — ideal for plant photos.

6. **No `react-native-blob-util`.** The `fetch` → `Blob` → `upload` approach works on both platforms in Expo SDK 54 and avoids a native dependency. Supabase's `upload()` accepts `FileBody` which includes `Blob`.

## Risks

- **Storage bucket migration ordering.** The migration must run after the `storage` extension is available (it ships enabled in Supabase). Verify on the live project before running.
- **expo-image-picker permissions.** Camera and media library permissions must be requested at runtime. The picker itself handles the permission prompt, but the user may deny — in that case we show a graceful message (not a crash).
- **Large image uploads.** Photos from modern phones can be 5–15 MB. Without compression, uploads are slow. Mitigation: `expo-image-picker`'s `quality` option (set to 0.7) and `allowsEditing` for crop. A dedicated image optimization step is out of scope for V0.1.
- **Plant detail screen flicker on data fetch.** Mitigation: `LoadingSkeleton` while fetching, then render. No blank screen.
- **Delete cascade verification.** The FK created in `001` includes `ON DELETE CASCADE`. We verify in the migration; if absent, add it.

## Verification

- Home screen loads and shows plant cards for an authenticated user with plants.
- Home screen shows empty state + wired button for a user with zero plants.
- Create plant flow: fill form → submit → plant appears on home.
- Create plant with photo: photo uploads to storage, URL saved, image renders on card and detail.
- Edit plant: pre-filled form, update → detail screen reflects changes.
- Edit plant: change photo → old photo replaced, new one shows.
- Delete plant: confirmation dialog → plant disappears from list, cascades work.
- RNTP (no plant photos) renders placeholder on cards and detail.
- `npm run lint` passes, `npx tsc --noEmit` passes.
