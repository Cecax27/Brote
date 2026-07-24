# 007 - Light Tool

## Phase 0 — Packages + app.json

- [ ] Install `expo-camera` via `npx expo install expo-camera` (verify SDK-54-matched version)
- [ ] Update `app.json` — add `expo-camera` config plugin with camera permission message "Brote necesita acceso a la cámara para medir la luz ambiental."

## Phase 1 — Database migration + types

- [ ] Create `supabase/migrations/<timestamp>_create_light_measurements.sql` — `light_measurements` table (`id uuid PK, plant_id uuid FK ON DELETE CASCADE, user_id uuid FK ON DELETE CASCADE, device_lux numeric(8,1) not null, calibrated_lux numeric(8,1), light_profile text, notes text, created_at timestamptz default now()`)
- [ ] Add index `light_measurements_plant_date_idx` on `(plant_id, created_at desc)`
- [ ] Enable RLS + create policies `light_measurements_owner_select/insert/update/delete` (`auth.uid() = user_id` shape)
- [ ] Add `light_profile` text column to `plants` table (nullable, no default)
- [ ] Run `npm run gen-types`; commit `src/lib/supabase/database.types.ts` with `light_measurements` + `plants.light_profile` types resolved

## Phase 2 — Data layer

- [ ] Create `src/lib/supabase/light-measurements.ts` — type aliases `LightMeasurement`, `LightMeasurementInsert`
- [ ] `fetchLightMeasurements(plantId)` — `.select("*").eq("plant_id", plantId).order("created_at", { ascending: false })`
- [ ] `fetchLatestMeasurement(plantId)` — `.select("*").eq("plant_id", plantId).order("created_at", { ascending: false }).limit(1).maybeSingle()`
- [ ] `createLightMeasurement(m)` — typed insert that throws on error
- [ ] `deleteLightMeasurement(id)` — typed delete that throws on error

## Phase 3 — Lux meter utility

- [ ] Create `src/lib/lux-meter.ts`
- [ ] Implement `readBits(n)` and `nextByte()` bit-reader helpers over `Uint8Array`
- [ ] Implement `buildHuffmanTree(data, counts)` — builds a lookup map from Huffman table data (16-byte count array + symbol array)
- [ ] Implement `decodeLuminanceFromJPEG(base64: string): number` — strips base64 prefix, decodes to `Uint8Array`, parses JPEG markers (SOI, APPn, DQT, SOF0, DHT, SOS), extracts Y-channel DC coefficients using Huffman decode, returns average luma (0–255)
- [ ] Handle RST markers (reset DC predictors), 0xFF 0x00 byte stuffing, EOB (0x00), and bit-stream edge cases
- [ ] Implement `CalibrationData` type — `{ brightRef: number; darkRef: number }`
- [ ] Implement `loadCalibration(): Promise<CalibrationData | null>` — reads from `expo-secure-store` under key `brote-lux-calibration`
- [ ] Implement `saveCalibration(data: CalibrationData): Promise<void>` — writes to `expo-secure-store`
- [ ] Implement `estimateLux(raw: number, cal: CalibrationData): number` — linear interpolation: `((raw - darkRef) / (brightRef - darkRef)) * 100000`, clamped 0–100000
- [ ] Implement `luxCategory(lux: number): string` — returns "Muy baja" / "Baja" / "Media" / "Alta" / "Muy alta" based on lux ranges
- [ ] Implement `profileLuxRange(profile: string): { min: number; max: number } | null` — returns min/max lux for a given `light_profile`
- [ ] Implement `placementAdvice(lux: number, profile: string, plantName: string): { text: string; color: string }` — returns advice paragraph with appropriate color token

## Phase 4 — Light meter camera screen

- [ ] Create `src/app/(app)/light-meter.tsx`
- [ ] Use `useCameraPermissions()` hook for permissions gate
- [ ] Render fullscreen `CameraView` (back camera, `mode="picture"`)
- [ ] Semi-transparent overlay with centered reticle circle and hint text "Apunta hacia la luz que quieres medir"
- [ ] Bottom "Medir luz" button (primary, sage)
- [ ] Calibration button (tuning-fork icon) — opens calibration sub-flow
- [ ] Calibration sub-flow: two-step wizard "Paso 1/2: Apunta al sol directo" → capture luminance → "Paso 2/2: Apunta a una sombra completa" → capture luminance → save to secure-store
- [ ] Capture flow: button → "Midiendo…" → `takePictureAsync({ base64: true, quality: 0.1, shutterSound: false })` → `decodeLuminanceFromJPEG` → `estimateLux` (if calibrated) → navigate to `/light-result`
- [ ] Read optional `calibrate` and `plantId` search params
- [ ] Error handling: camera error, JPEG parse error, navigation with error params
- [ ] Camera cleanup: `active={isFocused}` pattern — camera session only active when screen is focused (respect device resources)

## Phase 5 — Light result screen

- [ ] Create `src/app/(app)/light-result.tsx`
- [ ] Receive `deviceLux`, `calibratedLux`, `plantId?` from route params
- [ ] Large lux number display with "lux" label, category badge (color-coded pill)
- [ ] Uncalibrated note: "(sin calibrar)" + "Calibrar" link
- [ ] When `plantId` is provided: fetch plant data, compute placement advice, show calm advice paragraph with Flora-voiced text
- [ ] Plant picker section (when `plantId` not provided): flat list of user's plants, tap to associate
- [ ] "Guardar medición" button → `createLightMeasurement` → navigate to plant detail or home
- [ ] "Volver a medir" ghost button → `router.back()`
- [ ] Error/loading states

## Phase 6 — Light history screen

- [ ] Create `src/app/(app)/plants/[id]/light-history.tsx`
- [ ] Load `fetchLightMeasurements(id)` on mount + `fetchPlant(id)` for `light_profile`
- [ ] Top: plant's current `light_profile` reference badge
- [ ] List: each row shows calibrated lux (or device lux), category badge, formatted date
- [ ] Delete measurement: `Alert.alert` confirmation → `deleteLightMeasurement` → refresh
- [ ] Empty state: "Aún no has medido la luz para esta planta."
- [ ] Loading / error states

## Phase 7 — Plant detail Luz section

- [ ] In `src/app/(app)/plants/[id]/index.tsx`, add `fetchLatestMeasurement(id)` to data loading; add `latestMeasurement` state
- [ ] Add "Luz" section between "Riego" and "Fotos"
- [ ] Measurement exists: shows lux value, category badge, date, "Historial de luz" ghost button
- [ ] No measurement: calm prompt card "¿Cuánta luz recibe {name}?" with "Medir luz" button → `/light-meter?plantId={id}`
- [ ] Show `light_profile` label next to section title when set

## Phase 8 — PlantForm light profile picker

- [ ] Extend `PlantFormData` type with `lightProfile: string | null`
- [ ] Add `lightProfile` state + `onLightProfileChange` prop to `PlantForm`
- [ ] Add "Nivel de luz ideal" section with 4 tappable chip options (low/medium/bright/direct) with icons and Spanish labels
- [ ] Update `new-plant.tsx` — pass `light_profile` to `createPlant`
- [ ] Update `plants/[id]/edit.tsx` — pre-fill `lightProfile` from plant data, pass to `updatePlant`

## Phase 9 — Home screen quick access

- [ ] Add `white-balance-sunny` icon to home header (to the left of bell icon)
- [ ] Navigate to `/light-meter` on press

## Phase 10 — Route registration

- [ ] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` entries for `light-meter` ("Medir luz"), `light-result` ("Resultado"), and `plants/[id]/light-history` ("Historial de luz")

## Phase 11 — Verification

- [ ] `npm run lint` passes (0 errors)
- [ ] `npx tsc --noEmit` passes under strict
- [ ] Manual: open light meter from home → camera opens → "Medir luz" → result shows
- [ ] Manual: calibration flow → two-step wizard → calibrated lux appears
- [ ] Manual: plant detail shows "Luz" section → "Medir luz" → associates reading
- [ ] Manual: result screen placement advice matches plant's light_profile
- [ ] Manual: light history lists past readings chronologically
- [ ] Manual: plant form light profile picker works (select + deselect)
- [ ] Manual: create/edit plant persists `light_profile`

## Phase 12 — Roadmap

- [ ] Update `spec/constitution/roadmap.md`: mark all `007-light-tool` checklist items as `[x]`
