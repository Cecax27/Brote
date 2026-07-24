# 007 - Light Tool

## Approach

Six layers, built incrementally. The lux meter utility (JPEG luminance extraction + calibration) is the technical core; the camera screen builds on it; then data persistence, plant integration, and finally home screen quick access.

```
Layer 1 — Lux meter utils    Layer 2 — Camera screen    Layer 3 — Data layer         Layer 4 — Screens                     Layer 5 — Plant integration     Layer 6 — Home
────────────────────          ──────────────────         ──────────────────          ──────────────────────────────           ──────────────────────────       ──────────
JPEG luminance extractor       expo-camera CameraView     light_measurements table     light-result.tsx (lux display)          PlantForm: light_profile picker   white-balance-sunny icon
Calibration (SS + interpolation)  "Medir luz" snapshot    light-measurements.ts CRUD   plants/[id]/light-history.tsx           Plant detail: Luz section
                                Permission + overlay      plants.light_profile column  Placement advice paragraph              Create/edit plant wiring
```

### 1. JPEG luminance extraction — `src/lib/lux-meter.ts`

This is the technical core. The goal: given a base64-encoded JPEG from `takePictureAsync`, return a single number (0–255) representing the average perceived brightness of the scene.

#### Why JPEG DC coefficients?

A JPEG image is encoded as a series of 8×8 pixel blocks. Each block is transformed via DCT (Discrete Cosine Transform) into 64 frequency coefficients. The DC coefficient (index 0) is the **average value** of all 64 pixels in that block. By extracting only the DC coefficients from the luma (Y) channel and averaging them, we get the overall image brightness without decoding any pixels. This is fast (no inverse DCT), deterministic, and requires no extra native modules.

#### Algorithm

```
1. Strip "data:image/jpeg;base64," prefix from base64 string.
2. Base64-decode → Uint8Array (via Hermes's built-in atob + manual byte conversion).
3. Parse JPEG markers:
   - SOI (0xFFD8) — start, skip
   - APP0..APPn (0xFFE0..0xFFEF) — skip length-prefixed segments
   - DQT (0xFFDB) — skip (quantization tables, not needed for DC only)
   - SOF0 (0xFFC0) — read image height, width, number of components; determine sampling factors for Y, Cb, Cr
   - DHT (0xFFC4) — build Huffman decode trees for DC and AC tables (class 0 = DC, class 1 = AC; IDs 0-3)
   - SOS (0xFFDA) — start of scan: component selectors + their DC/AC table IDs
4. After SOS marker, scan data begins. Read bits via a bit-reader over the byte stream:
   - For each MCU (Minimum Coded Unit, accounting for chroma subsampling):
     a. For each component in the MCU (Y, Cb, Cr if present):
        - Decode Huffman-encoded DC difference using the DC Huffman tree for that component's table ID
        - Decode the magnitude bits (if category > 0)
        - Apply DPCM: DC_current = DC_previous + diff
        - Store for Y components only (we want luma)
     b. Skip AC coefficients: for each remaining coefficient (1–63), decode Huffman symbol + skip magnitude bits; break on EOB (0x00)
     c. Handle RST markers (0xFFD0–0xFFD7): reset DC predictors, skip stuffed bytes
5. Average all collected Y DC values → raw device luminance (0–255)
```

#### Bit reader helper

```
- View over Uint8Array, tracked byte position + bit position (0-7)
- readBits(n): reads n bits from the stream, advancing position
- skipBits(n): skips n bits
- nextByte(): reads next full byte (also skips any 0x00 stuffed byte after 0xFF in scan data)
- isMarker(): peeks ahead for 0xFF followed by non-zero byte
```

The scan data has a nuance: after SOS, any 0xFF byte in the entropy-coded data that would be a marker is escaped as 0xFF 0x00. Our bit reader's `nextByte()` must handle this: after reading 0xFF, if the next byte is 0x00, skip it and return 0xFF; if the next byte is non-zero, it's a marker (RST or EOI).

#### Complexity note

Full JPEG decoding (including AC coefficient skipping) is about ~200 lines of TypeScript. It runs synchronously on the JS thread but takes < 50ms for a snapshot at quality 0.1 (small file). This is acceptable for a user-triggered action (not real-time).

### 2. Calibration — `src/lib/lux-meter.ts`

Two-point calibration stored in `expo-secure-store` keyed by device:

```
type CalibrationData = { brightRef: number; darkRef: number };
```

- `darkRef` — raw luminance from pointing at full shadow (maps to 0 lux)
- `brightRef` — raw luminance from pointing at direct sun (maps to ~100,000 lux)

Interpolation:
```
calibrated_lux = clamp(
  ((raw - darkRef) / (brightRef - darkRef)) * 100000,
  0,
  100000
)
```

Stored under key `brote-lux-calibration` in `expo-secure-store`. `loadCalibration()` reads + parses; `saveCalibration()` writes. If no calibration exists, the lux meter falls back to raw device luminance with a neutral note.

Lux categories (verbal buckets):
| Calibrated lux | Category |
|---|---|
| 0–500 | Muy baja |
| 500–2,500 | Baja |
| 2,500–10,000 | Media |
| 10,000–25,000 | Alta |
| 25,000+ | Muy alta |

### 3. Database migration — `light_measurements`

```sql
create table public.light_measurements (
  id              uuid primary key default gen_random_uuid(),
  plant_id        uuid references public.plants (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  device_lux      numeric(8,1) not null,
  calibrated_lux  numeric(8,1),
  light_profile   text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index light_measurements_plant_date_idx
  on public.light_measurements (plant_id, created_at desc);

alter table public.light_measurements enable row level security;

-- RLS: identical owner-policy shape
create policy "light_measurements_owner_select" on public.light_measurements
  for select using (auth.uid() = user_id);
create policy "light_measurements_owner_insert" on public.light_measurements
  for insert with check (auth.uid() = user_id);
create policy "light_measurements_owner_update" on public.light_measurements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "light_measurements_owner_delete" on public.light_measurements
  for delete using (auth.uid() = user_id);

-- plants.light_profile column
alter table public.plants add column light_profile text;
```

Notes:
- `device_lux` stores the calibrated value or falls back to raw device luminance × 100 (a rough heuristic) when uncalibrated.
- `calibrated_lux` is `null` when the user hasn't calibrated — the UI shows device-relative values with a subtle "(sin calibrar)" note.
- `light_profile` on the measurement row records what the plant's `light_profile` was at the time of measurement, for historical accuracy.
- `light_profile` on `plants` is nullable text — no enum constraint. Values: `low`, `medium`, `bright`, `direct`, or `null`.
- `plant_id` is nullable — a user can take a reading without associating it with a plant (free measurement mode).

### 4. Data layer — `src/lib/supabase/light-measurements.ts`

Mirrors `watering-schedules.ts` patterns:
```ts
export type LightMeasurement = Tables<"light_measurements">;
export type LightMeasurementInsert = TablesInsert<"light_measurements">;

export async function fetchLightMeasurements(plantId: string): Promise<LightMeasurement[]>;
export async function fetchLatestMeasurement(plantId: string): Promise<LightMeasurement | null>;
export async function createLightMeasurement(m: Omit<LightMeasurementInsert, "user_id"> & { user_id: string }): Promise<LightMeasurement>;
export async function deleteLightMeasurement(id: string): Promise<void>;
```

- `fetchLatestMeasurement` — `.select("*").eq("plant_id", plantId).order("created_at", { ascending: false }).limit(1).maybeSingle()`.
- `fetchLightMeasurements` — `.select("*").eq("plant_id", plantId).order("created_at", { ascending: false })`.

### 5. Light meter camera screen — `src/app/(app)/light-meter.tsx`

Fullscreen `CameraView` (back camera, `mode="picture"`) with overlaid UI:

- **Permissions gate** — uses `useCameraPermissions()` hook. Shows permission request if not granted.
- **Camera overlay** — semi-transparent center reticle (thin circle, white, 60% opacity), hint text above: "Apunta hacia la luz que quieres medir".
- **Bottom controls** — "Medir luz" button (primary, sage), calibration icon button (tuning-fork) that opens calibration flow.
- **Calibration sub-flow** — a two-step wizard: "Paso 1/2: Apunta al sol directo" → capture → "Paso 2/2: Apunta a una sombra completa" → capture → save calibration. Calibration also reachable from the result screen (if uncalibrated).
- **Capture flow** — on "Medir luz" tap:
  1. Button shows "Midiendo…" and disables
  2. `takePictureAsync({ base64: true, quality: 0.1, shutterSound: false })` — low quality for small base64 payload
  3. `decodeLuminanceFromJPEG(base64)` → raw device luminance (0–255)
  4. Load calibration → if present, compute calibrated lux; if absent, use raw × 100 as device reference
  5. Navigate to `/light-result` with params: `{ deviceLux: number, calibratedLux?: number, plantId?: string }`
  6. Reset button state
- **Error states** — if `takePictureAsync` fails, show calm inline Spanish error. If JPEG parsing fails (unlikely with valid camera output), show "No se pudo medir la luz. Inténtalo de nuevo."
- **Back camera only** — no front camera toggle. We're measuring ambient light, not selfies.

### 6. Light result screen — `src/app/(app)/light-result.tsx`

Receives: `deviceLux`, `calibratedLux`, `plantId?` via route params (`useLocalSearchParams`).

Layout:
- Large lux number (`display` size, Fraunces SemiBold) with "lux" label underneath
- Lux category badge (pill shape, colored by category — green for Media, yellow for Baja/Alta, muted for Muy baja/Muy alta)
- If uncalibrated: "(sin calibrar)" note in caption + "Calibrar" link → opens calibration via `router.push("/light-meter?calibrate=1")`
- Calm advice paragraph (h3 size, Inter body) when `plantId` is provided:
  - Fetches plant data (name + `light_profile`) on mount
  - Compares calibrated lux to the plant's light_profile ranges:
    - `low` expects 500–2,500 lux
    - `medium` expects 2,500–10,000 lux
    - `bright` expects 10,000–25,000 lux
    - `direct` expects 25,000+ lux
  - Shows match text: "Este rincón le viene bien a tu {name}" (green)
  - Shows dim text: "Tu {name} necesita más luz de la que hay aquí — busca un sitio más luminoso" (terracotta)
  - Shows bright text: "Aquí hay demasiada luz para tu {name}" (mustard accent)
  - No light_profile: "Anota el nivel de luz ideal de {name} para comparar la próxima vez."
- "Asociar a una planta" section: if `plantId` is not yet provided, shows a flat list of user's plants (fetched via `fetchPlants()`) in a compact picker. Tapping a plant associates the reading → saves to DB → navigates to that plant's detail.
- "Guardar medición" button: saves `createLightMeasurement` and navigates back. If `plantId` was already provided, saves immediately.
- "Volver a medir" ghost button → `router.back()`

### 7. Plant detail integration — `src/app/(app)/plants/[id]/index.tsx`

Add a "Luz" section between "Riego" and "Fotos":
- Fetches `fetchLatestMeasurement(id)` alongside existing data loads
- When a measurement exists: shows lux value, category badge, date, and "Historial de luz" ghost button → `router.push("/plants/[id]/light-history")`
- When no measurement: calm prompt card "¿Cuánta luz recibe {name}?" with "Medir luz" button → `router.push({ pathname: "/light-meter", params: { plantId: id } })`
- If plant has `light_profile` set, shows the profile label next to the section title (e.g. "Luz — Luz brillante")

### 8. Light history screen — `src/app/(app)/plants/[id]/light-history.tsx`

- Loads `fetchLightMeasurements(id)` on mount
- Top: plant's current `light_profile` as a reference badge (if set) — "Luz ideal: Luz brillante"
- List: each row shows calibrated lux (or "~{device}" if uncalibrated), category badge, formatted date
- Empty state: "Aún no has medido la luz para esta planta."
- Delete measurement: swipe or long-press → `Alert.alert` confirmation → `deleteLightMeasurement` → refresh list. Matches the destructive pattern from 004/005.

### 9. PlantForm light profile picker — `src/components/PlantForm.tsx`

Adds to the form between "Ubicación" and "Notas":
- `lightProfile` state + `onChangeLightProfile` prop
- "Nivel de luz ideal" section label (caption, muted)
- Row of 4 tappable chips:
  | Value | Icon | Label |
  |---|---|---|
  | `low` | `weather-sunny-off` | Sombra |
  | `medium` | `white-balance-sunny` | Indirecta |
  | `bright` | `weather-sunny` | Brillante |
  | `direct` | `sun-wireless` | Directa |
- None selected (null): all chips appear in muted/outline style
- One selected: that chip is filled sage, rest are muted/outline
- Tapping a selected chip deselects it (back to null)
- `PlantFormData` type extended with `lightProfile: string | null`

Wired through:
- `new-plant.tsx` — passes `lightProfile` in form data, sends `light_profile` in `createPlant` payload
- `plants/[id]/edit.tsx` — pre-fills from existing plant data, sends `light_profile` in `updatePlant` payload

### 10. Home screen quick access — `src/app/(app)/index.tsx`

Add a `white-balance-sunny` icon to the header row, to the left of the bell:
```tsx
<MaterialCommunityIcons
  name="white-balance-sunny"
  size={24}
  color={colors.text.secondary}
  onPress={() => router.push("/light-meter")}
  suppressHighlighting
/>
```

### 11. Route registration — `src/app/(app)/_layout.tsx`

Add three `Stack.Screen` entries:
- `light-meter` → title "Medir luz"
- `light-result` → title "Resultado"
- `plants/[id]/light-history` → title "Historial de luz"

### 12. Packages

```bash
npx expo install expo-camera
```

Already present: `expo-secure-store`, `expo-device`, `@expo/vector-icons`, `expo-image`.

### `app.json`

Add `expo-camera` plugin:
```json
{
  "expo": {
    "plugins": [
      // ...existing...
      [
        "expo-camera",
        {
          "cameraPermission": "Brote necesita acceso a la cámara para medir la luz ambiental."
        }
      ]
    ]
  }
}
```

### Files (new)
```
spec/features/007-light-tool/spec.md
spec/features/007-light-tool/plan.md
spec/features/007-light-tool/tasks.md
supabase/migrations/<timestamp>_create_light_measurements.sql
src/lib/supabase/light-measurements.ts
src/lib/lux-meter.ts
src/app/(app)/light-meter.tsx
src/app/(app)/light-result.tsx
src/app/(app)/plants/[id]/light-history.tsx
```

### Files (modified)
```
app.json                                          # expo-camera config plugin
package.json                                      # expo-camera dependency
src/app/(app)/_layout.tsx                         # register 3 routes
src/app/(app)/index.tsx                           # white-balance-sunny icon
src/app/(app)/plants/[id]/index.tsx               # Luz section
src/app/(app)/new-plant.tsx                       # light_profile in create
src/app/(app)/plants/[id]/edit.tsx                # light_profile in edit
src/components/PlantForm.tsx                      # light profile picker
src/lib/supabase/database.types.ts                # regenerated
```

## Decisions

1. **JPEG DC coefficient extraction over full pixel decode.** Extracting only DC coefficients from the Y channel gives us a block-averaged brightness map without decoding any pixels. It's fast (~50ms), pure JS, and the 8×8 block average resolution is perfectly adequate for ambient light estimation. A full pixel decode (inverse DCT + YCbCr→RGB conversion) would be 64× slower and provide no meaningful improvement for this use case.

2. **JPEG Huffman decode, not a library.** No lightweight JPEG decoder library exists for Hermes/React Native that extracts only DC values. Writing a minimal decoder (~200 lines) is simpler than adding a dependency with a full decode pipeline we'd strip down. The algorithm (Huffman trees + DPCM + bit stream) is well-documented and the scope is narrow.

3. **Two-point calibration (sun/shadow) over factory calibration.** Phone cameras report wildly different luminance values across manufacturers (Samsung, iPhone, Xiaomi). A user-performed two-point calibration on their specific device gives a relative scale accurate enough for plant placement advice. Factory calibration would require per-model databases and continuous maintenance.

4. **`expo-secure-store` for calibration, not AsyncStorage.** Calibration data is small (two numbers) and device-specific. `expo-secure-store` is already in the dependency tree (used by Supabase Auth) and persists across app reinstalls (iCloud Keychain / Android Keystore).

5. **`light_profile` as text, not enum.** The values (`low`, `medium`, `bright`, `direct`) are advisory labels, not machine-critical codes. A text column without a constraint keeps the database flexible (adding a new category doesn't need a migration) and matches the existing pattern — `journal_entries.type` is also text. The UI picker enforces valid values.

6. **Nullable `plant_id` on measurements.** A user should be able to measure light without first picking a plant — discover the light level, then decide which plant it suits. The result screen's plant picker bridges this gap. Nullable FKs are standard Postgres and RLS still gates ownership via `user_id`.

7. **Back camera only, no selfie toggle.** We're measuring ambient light, not faces. The back camera has better exposure metering for scene brightness. Removing the flip-camera button reduces UI clutter and eliminates a vector for user confusion.

8. **No real-time luminance preview (snapshot only).** Expo Camera doesn't expose per-frame pixel buffers to JS. A continuous luminance stream would require `expo-camera`'s `onFps` callback (which reports FPS, not pixel data) or a native module. The snapshot approach is simpler and the interaction is already instantaneous (< 1s total: capture + decode).

9. **Placement advice ranges mapped to lux buckets.** The four `light_profile` values map to standard horticultural light ranges:
   - `low` (Sombra): 500–2,500 lux — north-facing windows, deep interiors
   - `medium` (Indirecta): 2,500–10,000 lux — east/west windows, bright indirect
   - `bright` (Brillante): 10,000–25,000 lux — south-facing (filtered), very bright indirect
   - `direct` (Directa): 25,000+ lux — unobstructed south windows, outdoors
   
   When comparing a reading to a plant's profile, the reading "matches" if it falls within the profile's range. Otherwise it's too dim or too bright. The ranges are wide enough to be forgiving — the goal is guidance, not precision.

10. **Uncalibrated mode: device_lux × 100.** When no calibration exists, `device_lux` (0–255 raw) is scaled to a roughly meaningful number (0–25,500). This is labeled "(sin calibrar)" so the user knows it's approximate. Many users will find this "good enough" and skip calibration entirely — and that's fine.

## Risks

- **JPEG decoder bugs.** A Huffman tree or bit-stream parsing error would cause the luminance function to throw. The camera screen catches this and shows a calm error message. The most likely failure mode is an unexpected JPEG structure from a specific device's camera output. The decoder handles typical baseline JPEG (8-bit, Huffman, YCbCr 4:2:0) which covers all mobile camera JPEGs. Unusual configs (arithmetic coding, 12-bit, CMYK) are not attempted.
- **Calibration at extremes.** Pointing a phone camera at the sun can cause sensor saturation (all-white image, DC=255). This would make `brightRef ≥ darkRef` always true but may compress the scale at the top. A calibration hint ("No apuntes directamente al sol, mide un punto muy iluminado") mitigates this. Even imperfect calibration is better than none.
- **Camera permissions denial.** `useCameraPermissions()` returns `granted: false` on denial. The camera screen shows a permission-request UI with Spanish explanation. If permanently denied, a message directs the user to Settings. The home icon is always shown — tapping it gracefully shows the permission gate.
- **Hermes `atob` availability.** Hermes has shipped `atob` since React Native 0.74. Brote runs RN 0.81 so it's available. If it weren't, a polyfill would be trivial (base64 → Uint8Array lookup table).
- **Large base64 payloads.** A full-quality JPEG base64 string can be 2–5 MB. Using `quality: 0.1` reduces this dramatically (< 50 KB) while still providing enough resolution for accurate luminance extraction (the DC coefficients barely change). The `takePictureAsync` call at quality 0.1 is near-instantaneous.
- **Persistent calibration across app reinstalls.** `expo-secure-store` persists via iCloud Keychain / Android Keystore, which survive app deletion on some devices but not all. If calibration is lost, the app degrades to uncalibrated mode — no crash, no blocking.
- **Gen-types drift.** The migration + `npm run gen-types` must both land in the same branch or `LightMeasurement` types won't resolve.

## Verification

- Open light meter from home → camera opens, shows reticle and "Medir luz" button. Tap → "Midiendo…" → result screen shows lux value and category.
- Without calibration: "(sin calibrar)" note appears. Tap calibrate → two-step wizard → save → re-measure → calibrated lux appears.
- From plant detail with no light profile: "¿Cuánta luz recibe {name}?" → tap "Medir luz" → measure → result shows "Anota el nivel de luz ideal de {name} para comparar la próxima vez."
- From plant detail with `light_profile = bright`: measure a dim spot → result shows "Tu {name} necesita más luz de la que hay aquí — busca un sitio más luminoso" in terracotta. Measure a bright spot → result shows "Este rincón le viene bien a tu {name}" in green.
- Save measurement → navigates to plant detail → "Luz" section shows latest reading. Tap "Historial de luz" → chronological list.
- Create/edit plant → "Nivel de luz ideal" picker shows 4 tappable chips. Selecting "Luz brillante" fills sage; deselecting returns to null. Save → plant detail shows `light_profile`.
- `npm run lint` passes; `npx tsc --noEmit` passes.
