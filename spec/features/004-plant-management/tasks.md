# 004 - Plant Management

## Phase 0 — Storage migration + package install

- [x] Create Supabase migration `create_plant_photos_storage_bucket` — public bucket `plant-photos` with RLS policies (public read, owner insert/update/delete via folder-name pattern)
- [x] Verify `ON DELETE CASCADE` exists on `journal_entries.plant_id` FK; add it in the same migration if missing
- [x] Install `expo-image-picker` via `npx expo install expo-image-picker`

## Phase 1 — Image infrastructure

- [x] Create `src/lib/supabase/storage.ts` — `uploadPlantPhoto(userId, plantId, uri)` helper: fetch URI as blob, upload to `{userId}/{plantId}/{timestamp}.{ext}`, return public URL
- [x] Create `src/lib/supabase/storage.ts` — `deletePlantPhoto(path)` helper (extract path from public URL)

## Phase 2 — Data layer

- [x] Create `src/lib/supabase/plants.ts` — `fetchPlants()`: select all plants for the current user, ordered by `created_at DESC`
- [x] Create `src/lib/supabase/plants.ts` — `fetchPlant(id)`: select single plant by ID
- [x] Create `src/lib/supabase/plants.ts` — `createPlant(data)`: insert, return the new row
- [x] Create `src/lib/supabase/plants.ts` — `updatePlant(id, data)`: update, return the updated row
- [x] Create `src/lib/supabase/plants.ts` — `deletePlant(id)`: delete by ID (RLS enforced)
- [x] Create `src/lib/supabase/plants.ts` — `fetchPlantPhotos(plantId)`: get main photo_url + all journal_entries.photo_url values for timeline

## Phase 3 — Shared components

- [x] Create `src/components/PlantCard.tsx` — photo thumb (60x60, expo-image, fallback Illustration), name (Fraunces h3), species (Inter italic, secondary text), location (Inter caption + pin icon). Wrapped in `Card`. `onPress` prop.
- [x] Create `src/components/PhotoGrid.tsx` — 3-column FlatList grid of square thumbnails (expo-image). Props: `photos: string[]`.
- [x] Create `src/lib/image-picker.ts` — photo source picker helper (Alert-based "Tomar foto" / "Elegir de galería") with camera/gallery permission handling
- [x] Create `src/components/PlantForm.tsx` — reusable form fields used by both create and edit screens: name, species, location, notes inputs + photo picker area

## Phase 4 — Create plant screen

- [x] Create `src/app/(app)/new-plant.tsx`
- [x] Form fields: name (required), species, location, notes, photo
- [x] Photo picker: tap → Alert choice → camera/gallery → preview
- [x] Validation: name required (Spanish error)
- [x] Loading state on submit button while uploading + inserting
- [x] On success: navigate home
- [x] Empty/error/loading states

## Phase 5 — Plant detail screen

- [x] Move `src/app/(app)/plants/[id].tsx` → `src/app/(app)/plants/[id]/index.tsx`
- [x] Fetch plant data by `id` from Supabase
- [x] Render: plant info `Card` (photo, name, species, location, notes)
- [x] Quick actions: "Editar" button (navigates to edit), "Eliminar" button (Alert confirmation → delete → navigate home)
- [x] Photo timeline section: renders `PhotoGrid` with plant photos
- [x] Placeholder sections: "Diario" and "Consulta a Flora" remain as `EmptyState` "Próximamente"
- [x] Stack screen title = plant name
- [x] Loading state (`LoadingSkeleton`), error state, not-found state

## Phase 6 — Edit plant screen

- [x] Create `src/app/(app)/plants/[id]/edit.tsx`
- [x] Pre-filled form: name, species, location, notes, current photo
- [x] Photo can be replaced (same picker flow)
- [x] Validation: name required (Spanish error)
- [x] Loading state on submit
- [x] On success: `router.back()`
- [x] Error state

## Phase 7 — Home screen retrofit

- [x] Replace hardcoded `hasPlants = false` with real Supabase query
- [x] Render plant list as mapped `PlantCard` components
- [x] Keep empty state for zero plants, wire the button to `/(app)/new-plant`
- [x] Add `+` button in header to navigate to new plant
- [x] Loading state while fetching plants
- [x] Move "Cerrar sesión" to bottom of screen (kept for dev)

## Phase 8 — Route registration

- [x] Update `src/app/(app)/_layout.tsx` — register `new-plant`, `plants/[id]/index`, `plants/[id]/edit` in the Stack navigator

## Phase 9 — Verification

- [x] `npm run lint` passes (0 errors, 0 warnings)
- [x] `npx tsc --noEmit` passes under strict (0 errors)
- [ ] Manual test: create plant with photo → appears on home
- [ ] Manual test: create plant without photo → placeholder renders
- [ ] Manual test: edit plant → changes reflected
- [ ] Manual test: delete plant → removed from list, confirmation dialog shown
- [ ] Manual test: photo timeline shows plant photos on detail screen
- [ ] Manual test: image picker opens, camera/gallery work, photo preview shows

## Phase 10 — Roadmap

- [ ] Update `spec/constitution/roadmap.md`: mark `004-plant-management` checklist items and feature section as Done
