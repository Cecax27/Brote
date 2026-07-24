# 007 - Light Tool

**Status:** In Progress

## What makes

A built-in light meter that uses the device camera to estimate ambient light levels and gives placement advice per plant. The user points the camera at a spot, taps to measure, and Brote tells them whether it's a good home for their plant.

- **Camera-based lux estimation** — the camera preview streams live, and on tap "Medir luz", a snapshot is captured and its average luminance is extracted from the JPEG's luma (Y) channel. The raw device luminance (0–255) is mapped to an approximate lux scale via a two-point calibration.
- **Calibration** — a one-time (per-device) or on-demand calibration flow: the user points the camera at direct sunlight to record a "bright" reference, then at full shadow to record a "dark" reference. A linear interpolation maps raw luminance to an estimated lux value (clamped 0–100,000). Calibration data persists in `expo-secure-store` keyed by device (via `expo-device`). The user can recalibrate at any time from the light meter screen.
- **Light reading per plant** — after measuring, the result screen shows the estimated lux, a verbal category (Muy baja / Baja / Media / Alta / Muy alta), and offers to associate the reading with a plant. The user picks a plant from their list; the reading is saved to `light_measurements`.
- **Light history per plant** — on the plant detail screen, a "Luz" section shows the most recent reading (if any) with its lux value, category, and date, plus a "Historial de luz" link. Tapping it opens a screen listing all past readings for that plant ordered by date descending, plus the current light profile.
- **Placement advice** — after taking a reading associated with a plant, the result screen compares the measured lux to the plant's configured `light_profile` and displays a calm, Flora-voiced advice line: "Este rincón le viene bien a tu {name}" (within range), "Aquí hay demasiada luz para tu {name}" (too bright), or "Tu {name} necesita más luz de la que hay aquí — busca un sitio más luminoso" (too dim). If the plant has no `light_profile` set, the advice is neutral: "Anota el nivel de luz ideal de {name} para comparar la próxima vez."
- **Light profile field on plants** — a new optional `light_profile` column on `plants` (nullable text, values: `low`, `medium`, `bright`, `direct`). The create-plant and edit-plant forms include a "Nivel de luz ideal" picker with four tappable options, each with a line-art icon and a short Spanish label (Sombra / Luz indirecta / Luz brillante / Sol directo). The picker is optional and calm — selecting none is fine.
- **Home screen quick access** — a `white-balance-sunny` icon chip opens the light meter from the home header, next to the bell icon. Plants never need light measured, so this is a tool, not a call to action.

## Why

The mission says the app helps the user "enjoy the process of caring for their plants." One of the most common beginner mistakes is placing a plant in the wrong light — too dim and it languishes, too bright and it scorches. But most people can't quantify light; they guess. A tool that replaces guesswork with a simple measurement reduces uncertainty (design principle #2) and turns a potential source of plant anxiety into a moment of confidence: "I measured this spot — my Monstera will be happy here."

The light tool fits V0.2 Tools: it's a standalone, self-contained utility that doesn't depend on AI. It deepens the per-plant space (the app's core unit) by adding light as a dimension the user can understand and track — joining watering schedule (`006`) as the second care dimension the app directly supports.

The calibration step is essential because consumer phone cameras report wildly different luminance values across devices. A two-point calibration (sun/shadow) gives a device-relative scale that is accurate enough for plant placement advice (four buckets: low/medium/bright/direct). Accuracy within an order of magnitude is sufficient — the goal is guiding the user's intuition, not competing with a $200 lux meter.

The JPEG luminance approach (extracting DC coefficients from the Y channel of a JPEG-compressed snapshot) is chosen over a full pixel decode because it's fast (< 50ms on modern phones), requires no native module beyond expo-camera, and the downsampled 8x8 block averages are more than adequate for the task. A full-frame average of DC luma values is mathematically equivalent to a downscaled brightness average — exactly what we want.

## Acceptance criteria

1. `expo-camera` is installed via `npx expo install expo-camera` at the SDK-54-matched version; `app.json` adds the `expo-camera` config plugin with camera permission message.
2. A numbered Supabase migration creates the `light_measurements` table: `id uuid PK, plant_id uuid FK → plants ON DELETE CASCADE, user_id uuid FK → auth.users ON DELETE CASCADE, device_lux numeric(8,1), calibrated_lux numeric(8,1), light_profile text (nullable, from the reading context), notes text (nullable), created_at timestamptz`. RLS policies `light_measurements_owner_select/insert/update/delete` mirror the existing owner-policy shape. Index on `(plant_id, created_at DESC)` for per-plant history.
3. The migration adds a nullable `light_profile` column to `plants` (text, default null) — values map to `low`/`medium`/`bright`/`direct`. No enum constraint (text is fine for an optional advisory field).
4. Run `npm run gen-types` and commit updated `database.types.ts`.
5. `src/lib/supabase/light-measurements.ts` exposes typed helpers: `fetchLightMeasurements(plantId)`, `fetchLatestMeasurement(plantId)`, `createLightMeasurement(...)`, `deleteLightMeasurement(id)`.
6. `src/lib/lux-meter.ts` provides:
   - `decodeLuminanceFromJPEG(base64: string): number` — extracts the average luma (Y) DC coefficient from a base64-encoded JPEG, returning 0–255.
   - `CalibrationData` type — `{ brightRef: number; darkRef: number }` (both 0–255 raw device luminance).
   - `loadCalibration(): Promise<CalibrationData | null>` — reads from `expo-secure-store`.
   - `saveCalibration(data: CalibrationData): Promise<void>` — writes to `expo-secure-store`.
   - `estimateLux(raw: number, cal: CalibrationData): number` — linear interpolation: `darkRef → 0 lux, brightRef → 100000 lux`, clamped.
   - `luxCategory(lux: number): string` — returns one of "Muy baja" / "Baja" / "Media" / "Alta" / "Muy alta".
7. A `LightMeterCamera` screen at `src/app/(app)/light-meter.tsx` renders a fullscreen `CameraView` (back camera, picture mode) with a semi-transparent overlay showing a centered circular reticle and hint text "Apunta hacia la luz que quieres medir". A "Medir luz" button at the bottom captures a snapshot via `takePictureAsync({ base64: true, quality: 0.1 })`. On success, it processes luminance via `decodeLuminanceFromJPEG`, applies calibration if available (or prompts to calibrate), and navigates to the result screen. States: loading (camera permissions), camera ready, measuring (button disabled + brief "Midiendo…" label), error.
8. A `LightResult` screen at `src/app/(app)/light-result.tsx` receives `deviceLux`, `calibratedLux` (or null if uncalibrated), and `plantId` (optional) via route params. It shows a large lux reading with category label, a calm advice paragraph when `plantId` is provided and the plant has a `light_profile`, and an "Asociar a una planta" picker (flat list of user's plants) to save the reading. After saving, navigates to the plant detail. A back button returns to the light meter.
9. The plant detail screen at `src/app/(app)/plants/[id]/index.tsx` adds a "Luz" section between "Riego" and "Fotos": fetches `fetchLatestMeasurement(id)`. When a reading exists, shows the latest lux value, category, and date with an "Historial de luz" link (`router.push("/plants/[id]/light-history")`). When none exists, shows a calm prompt card "¿Cuánta luz recibe {name}?" with a "Medir luz" button that navigates to `/light-meter?plantId={id}`.
10. A `LightHistory` screen at `src/app/(app)/plants/[id]/light-history.tsx` lists all past readings for the plant (date descending) — each row shows the calibrated lux (or device lux with an asterisk), the category badge, and the date. Also shows the plant's current `light_profile` at the top as a reference. Empty state: "Aún no has medido la luz para esta planta."
11. The `PlantForm` component gains a `lightProfile` field and a new "Nivel de luz ideal" picker row with four tappable chip options (`low`/`medium`/`bright`/`direct`), each with an icon (weather-sunny-off / white-balance-sunny / weather-sunny / sun-wireless) and Spanish label. The picker is optional — selecting none leaves `light_profile = null`. The field is wired through `create-plant`, `edit-plant`, and the `PlantFormData` type.
12. The home screen at `src/app/(app)/index.tsx` adds a `white-balance-sunny` icon to the header row (next to the bell), navigating to `/light-meter`.
13. Route registration in `src/app/(app)/_layout.tsx` adds `light-meter` (title "Medir luz"), `light-result` (title "Resultado"), and `plants/[id]/light-history` (title "Historial de luz").
14. All text is in Spanish. Date formatting follows the hardcoded Spanish month array precedent (`005`, `006`). Visual style follows `brote-visual-guide` tokens.
15. `npm run lint` passes. `npx tsc --noEmit` passes under strict mode.

## Out of reach

- Native ambient light sensor (`expo-sensors` / lux via `LightSensor`) — V2.0 backlog item. Some Android devices have a hardware lux sensor, but cross-platform availability is inconsistent. The camera approach works on all devices.
- Light chart/graph — V0.2 ships a simple date-ordered list. A Reanimated chart is a future enhancement.
- AI-generated light recommendations — `010-ai-consultation` can suggest a `light_profile` value based on species; `007` only lets the user set it manually.
- Background / passive light monitoring — light readings are manual, on-demand snapshots only.
- Per-room light mapping or multi-spot comparison — the tool measures one spot per reading.
- EXIF-based brightness extraction — some devices include `BrightnessValue` in EXIF, but it's unreliable across manufacturers. JPEG luminance parsing is deterministic.
