# 004 - Plant Management

## Phase 0 — Storage migration + package install

- [ ] Create Supabase migration `create_plant_photos_storage_bucket` — public bucket `plant-photos` with RLS policies (public read, owner insert/update/delete via folder-name pattern)
- [ ] Verify `ON DELETE CASCADE` exists on `journal_entries.plant_id` FK; add it in the same migration if missing
- [ ] Install `expo-image-picker` via `npx expo install expo-image-picker`

## Phase 1 — Image infrastructure

- [ ] Create `src/lib/supabase/storage.ts` — `uploadPlantPhoto(userId, plantId, uri)` helper: fetch URI as blob, upload to `{userId}/{plantId}/{timestamp}.{ext}`, return public URL
- [ ] Create `src/lib/supabase/storage.ts` — `deletePlantPhoto(path)` helper (extract path from public URL)

## Phase 2 — Data layer

- [ ] Create `src/lib/supabase/plants.ts` — `fetchPlants()`: select all plants for the current user, ordered by `created_at DESC`
- [ ] Create `src/lib/supabase/plants.ts` — `fetchPlant(id)`: select single plant by ID
- [ ] Create `src/lib/supabase/plants.ts` — `createPlant(data)`: insert, return the new row
- [ ] Create `src/lib/supabase/plants.ts` — `updatePlant(id, data)`: update, return the updated row
- [ ] Create `src/lib/supabase/plants.ts` — `deletePlant(id)`: delete by ID (RLS enforced)
- [ ] Create `src/lib/supabase/plants.ts` — `fetchPlantPhotos(plantId)`: get main photo_url + all journal_entries.photo_url values for timeline

## Phase 3 — Shared components

- [ ] Create `src/components/PlantCard.tsx` — photo thumb (60x60, expo-image, fallback Illustration), name (Fraunces h3), species (Inter italic, secondary text), location (Inter caption + pin icon). Wrapped in `Card`. `onPress` prop.
- [ ] Create `src/components/PhotoGrid.tsx` — 3-column FlatList grid of square thumbnails (expo-image). Props: `photos: string[]`.
- [ ] Create `src/components/ActionSheet.tsx` — lightweight "Tomar foto" / "Elegir de galería" selector for the image picker (uses `ActionSheetIOS`-style approach, or a custom modal with 2 options)
- [ ] Create `src/components/PlantForm.tsx` — reusable form fields used by both create and edit screens: name, species, location, notes inputs + photo picker area

## Phase 4 — Create plant screen

- [ ] Create `src/app/(app)/new-plant.tsx`
- [ ] Form fields: name (required), species, location, notes, photo
- [ ] Photo picker: tap → ActionSheet choice → camera/gallery → preview
- [ ] Validation: name required (Spanish error)
- [ ] Loading state on submit button while uploading + inserting
- [ ] On success: navigate home
- [ ] Empty/error/loading states

## Phase 5 — Plant detail screen

- [ ] Move `src/app/(app)/plants/[id].tsx` → `src/app/(app)/plants/[id]/index.tsx`
- [ ] Fetch plant data by `id` from Supabase
- [ ] Render: plant info `Card` (photo, name, species, location, notes)
- [ ] Quick actions: "Editar" button (navigates to edit), "Eliminar" button (Alert confirmation → delete → navigate home)
- [ ] Photo timeline section: renders `PhotoGrid` with plant photos
- [ ] Placeholder sections: "Diario" and "Consulta a Flora" remain as `EmptyState` "Próximamente"
- [ ] Stack screen title = plant name
- [ ] Loading state (`LoadingSkeleton`), error state, not-found state

## Phase 6 — Edit plant screen

- [ ] Create `src/app/(app)/plants/[id]/edit.tsx`
- [ ] Pre-filled form: name, species, location, notes, current photo
- [ ] Photo can be replaced (same picker flow)
- [ ] Validation: name required (Spanish error)
- [ ] Loading state on submit
- [ ] On success: `router.back()`
- [ ] Error state

## Phase 7 — Home screen retrofit

- [ ] Replace hardcoded `hasPlants = false` with real Supabase query
- [ ] Render plant list as `FlatList` of `PlantCard` components
- [ ] Keep empty state for zero plants, wire the button to `/(app)/new-plant`
- [ ] Add `+` button in header (or FAB) to navigate to new plant
- [ ] Loading state while fetching plants
- [ ] Move "Cerrar sesión" to a less prominent spot (keep for dev, hide inside header icon or remove)

## Phase 8 — Route registration

- [ ] Update `src/app/(app)/_layout.tsx` — register `new-plant`, `plants/[id]/edit` in the Stack navigator

## Phase 9 — Verification

- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npx tsc --noEmit` passes under strict (0 errors)
- [ ] Manual test: create plant with photo → appears on home
- [ ] Manual test: create plant without photo → placeholder renders
- [ ] Manual test: edit plant → changes reflected
- [ ] Manual test: delete plant → removed from list, confirmation dialog shown
- [ ] Manual test: photo timeline shows plant photos on detail screen
- [ ] Manual test: image picker opens, camera/gallery work, photo preview shows

## Phase 10 — Roadmap

- [ ] Update `spec/constitution/roadmap.md`: mark `004-plant-management` checklist items and feature section as Done
