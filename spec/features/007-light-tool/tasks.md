# 007 - Light Tool

## Phase 0 — Packages + app.json

- [x] Install `expo-camera` via `npx expo install expo-camera` (verify SDK-54-matched version)
- [x] Update `app.json` — add `expo-camera` config plugin with camera permission message "Brote necesita acceso a la cámara para medir la luz ambiental."

## Phase 1 — Database migration + types

- [x] Create `supabase/migrations/<timestamp>_create_light_measurements.sql` — `light_measurements` table (`id uuid PK, plant_id uuid FK ON DELETE CASCADE, user_id uuid FK ON DELETE CASCADE, device_lux numeric(8,1) not null, calibrated_lux numeric(8,1), light_profile text, notes text, created_at timestamptz default now()`)
- [x] Add index `light_measurements_plant_date_idx` on `(plant_id, created_at desc)`
- [x] Enable RLS + create policies `light_measurements_owner_select/insert/update/delete` (`auth.uid() = user_id` shape)
- [x] Add `light_profile` text column to `plants` table (nullable, no default)
- [x] Run `npm run gen-types`; commit `src/lib/supabase/database.types.ts` with `light_measurements` + `plants.light_profile` types resolved

## Phase 2 — Data layer

- [x] Create `src/lib/supabase/light-measurements.ts` — type aliases `LightMeasurement`, `LightMeasurementInsert`
- [x] `fetchLightMeasurements(plantId)` — `.select("*").eq("plant_id", plantId).order("created_at", { ascending: false })`
- [x] `fetchLatestMeasurement(plantId)` — `.select("*").eq("plant_id", plantId).order("created_at", { ascending: false }).limit(1).maybeSingle()`
- [x] `createLightMeasurement(m)` — typed insert that throws on error
- [x] `deleteLightMeasurement(id)` — typed delete that throws on error

## Phase 3 — Lux meter utility

- [x] Create `src/lib/lux-meter.ts`
- [x] Implement `readBits(n)` and `nextByte()` bit-reader helpers over `Uint8Array`
- [x] Implement `buildHuffmanTree(data, counts)` — builds a lookup map from Huffman table data (16-byte count array + symbol array)
- [x] Implement `decodeLuminanceFromJPEG(base64: string): number` — strips base64 prefix, decodes to `Uint8Array`, parses JPEG markers (SOI, APPn, DQT, SOF0, DHT, SOS), extracts Y-channel DC coefficients using Huffman decode, returns average luma (0–255)
- [x] Handle RST markers (reset DC predictors), 0xFF 0x00 byte stuffing, EOB (0x00), and bit-stream edge cases
- [x] Implement `CalibrationData` type — `{ brightRef: number; darkRef: number }`
- [x] Implement `loadCalibration(): Promise<CalibrationData | null>` — reads from `expo-secure-store` under key `brote-lux-calibration`
- [x] Implement `saveCalibration(data: CalibrationData): Promise<void>` — writes to `expo-secure-store`
- [x] Implement `estimateLux(raw: number, cal: CalibrationData): number` — linear interpolation: `((raw - darkRef) / (brightRef - darkRef)) * 100000`, clamped 0–100000
- [x] Implement `luxCategory(lux: number): string` — returns "Muy baja" / "Baja" / "Media" / "Alta" / "Muy alta" based on lux ranges
- [x] Implement `profileLuxRange(profile: string): { min: number; max: number } | null` — returns min/max lux for a given `light_profile`
- [x] Implement `placementAdvice(lux: number, profile: string, plantName: string): { text: string; color: string }` — returns advice paragraph with appropriate color token

## Phase 4 — Light meter camera screen

- [x] Create `src/app/(app)/light-meter.tsx`
- [x] Use `useCameraPermissions()` hook for permissions gate
- [x] Render fullscreen `CameraView` (back camera, `mode="picture"`)
- [x] Semi-transparent overlay with centered reticle circle and hint text "Apunta hacia la luz que quieres medir"
- [x] Bottom "Medir luz" button (primary, sage)
- [x] Calibration button (tuning-fork icon) — opens calibration sub-flow
- [x] Calibration sub-flow: two-step wizard "Paso 1/2: Apunta al sol directo" → capture luminance → "Paso 2/2: Apunta a una sombra completa" → capture luminance → save to secure-store
- [x] Capture flow: button → "Midiendo…" → `takePictureAsync({ base64: true, quality: 0.1, shutterSound: false })` → `decodeLuminanceFromJPEG` → `estimateLux` (if calibrated) → navigate to `/light-result`
- [x] Read optional `calibrate` and `plantId` search params
- [x] Error handling: camera error, JPEG parse error, navigation with error params
- [x] Camera cleanup: `active={isFocused}` pattern — camera session only active when screen is focused (respect device resources)

## Phase 5 — Light result screen

- [x] Create `src/app/(app)/light-result.tsx`
- [x] Receive `deviceLux`, `calibratedLux`, `plantId?` from route params
- [x] Large lux number display with "lux" label, category badge (color-coded pill)
- [x] Uncalibrated note: "(sin calibrar)" + "Calibrar" link
- [x] When `plantId` is provided: fetch plant data, compute placement advice, show calm advice paragraph with Flora-voiced text
- [x] Plant picker section (when `plantId` not provided): flat list of user's plants, tap to associate
- [x] "Guardar medición" button → `createLightMeasurement` → navigate to plant detail or home
- [x] "Volver a medir" ghost button → `router.back()`
- [x] Error/loading states

## Phase 6 — Light history screen

- [x] Create `src/app/(app)/plants/[id]/light-history.tsx`
- [x] Load `fetchLightMeasurements(id)` on mount + `fetchPlant(id)` for `light_profile`
- [x] Top: plant's current `light_profile` reference badge
- [x] List: each row shows calibrated lux (or device lux), category badge, formatted date
- [x] Delete measurement: `Alert.alert` confirmation → `deleteLightMeasurement` → refresh
- [x] Empty state: "Aún no has medido la luz para esta planta."
- [x] Loading / error states

## Phase 7 — Plant detail Luz section

- [x] In `src/app/(app)/plants/[id]/index.tsx`, add `fetchLatestMeasurement(id)` to data loading; add `latestMeasurement` state
- [x] Add "Luz" section between "Riego" and "Fotos"
- [x] Measurement exists: shows lux value, category badge, date, "Historial de luz" ghost button
- [x] No measurement: calm prompt card "¿Cuánta luz recibe {name}?" with "Medir luz" button → `/light-meter?plantId={id}`
- [x] Show `light_profile` label next to section title when set

## Phase 8 — PlantForm light profile picker

- [x] Extend `PlantFormData` type with `lightProfile: string | null`
- [x] Add `lightProfile` state + `onLightProfileChange` prop to `PlantForm`
- [x] Add "Nivel de luz ideal" section with 4 tappable chip options (low/medium/bright/direct) with icons and Spanish labels
- [x] Update `new-plant.tsx` — pass `light_profile` to `createPlant`
- [x] Update `plants/[id]/edit.tsx` — pre-fill `lightProfile` from plant data, pass to `updatePlant`

## Phase 9 — Home screen quick access

- [x] Add `white-balance-sunny` icon to home header (to the left of bell icon)
- [x] Navigate to `/light-meter` on press

## Phase 10 — Route registration

- [x] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` entries for `light-meter` ("Medir luz"), `light-result` ("Resultado"), and `plants/[id]/light-history` ("Historial de luz")

## Phase 11 — Verification

- [x] `npm run lint` passes (0 errors)
- [x] `npx tsc --noEmit` passes under strict
- [ ] Manual: open light meter from home → camera opens → "Medir luz" → result shows
- [ ] Manual: calibration flow → two-step wizard → calibrated lux appears
- [ ] Manual: plant detail shows "Luz" section → "Medir luz" → associates reading
- [ ] Manual: result screen placement advice matches plant's light_profile
- [ ] Manual: light history lists past readings chronologically
- [ ] Manual: plant form light profile picker works (select + deselect)
- [ ] Manual: create/edit plant persists `light_profile`

## Phase 12 — Roadmap

- [x] Update `spec/constitution/roadmap.md`: mark all `007-light-tool` checklist items as `[x]`
