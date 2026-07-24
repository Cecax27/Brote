# 003 - App Foundation

## Approach

Three layers, built bottom-up. The token/component layer is unblocked immediately and runs in parallel with the mockup phase; the screen layer follows once mockups land. The existing route groups and auth guard from `002` are kept — `003` layers the visual system on top of them, not alongside.

```
Layer 1 — Tokens & fonts   Layer 2 — Shared components   Layer 3 — Screens (after mockups)
────────────────────       ───────────────────────         ──────────────────────────────
theme/tokens.ts   ───────►  Button / Input / Card  ──────► (app)/index.tsx       (home)
expo-font plugin             Avatar                         (app)/plants/[id].tsx  (detail scaffold)
SplashScreen gating          EmptyState / LoadingSkeleton   retrofit (auth)/*     onto tokens
                             Illustration
```

### 1. Fonts — Fraunces + Inter

Use **static** font files (the v54 docs state variable fonts "do not have support across all platforms" — use static for full support) loaded at runtime via `useFonts`, gated behind the splash screen. We chose `useFonts` over the config-plugin embed (originally planned) because the runtime hook works in Expo Go and dev builds alike, whereas the config plugin only embeds fonts in a custom dev build. The cost is a trivial splash gate, which we already want for bootstrapping the auth session anyway.

- Add static font files under `assets/fonts/`, named exactly as their PostScript name (the v54 docs' recommendation for cross-platform consistency — Android uses the filename, iOS extracts the name from the file; PostScript-name filenames match both):
  - Inter (rsms v4.1 static TTFs, OFL): `Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Bold.ttf` → families `Inter-Regular` / `Inter-Medium` / `Inter-SemiBold` / `Inter-Bold`
  - Fraunces (upstream 1.000 static TTFs, 9pt optical size — crisp at app heading scales 22–32px, OFL): `Fraunces9pt-Regular.ttf`, `Fraunces9pt-SemiBold.ttf`, `Fraunces9pt-Bold.ttf` → families `Fraunces9pt-Regular` / `Fraunces9pt-SemiBold` / `Fraunces9pt-Bold`
  - Commit `Inter-OFL.txt` and `Fraunces-OFL.txt` alongside.
- Register via `useFonts` in `src/app/_layout.tsx`, keyed by the PostScript-name family. Each weight is its own family, referenced explicitly — we never rely on `fontWeight` picking a named instance.
- Splash gating: call `SplashScreen.preventAutoHideAsync()` at **module scope** (per v54 docs — must not be inside a component/hook). On `[loaded, error]` from `useFonts`, call `SplashScreen.hide()` — hide on error too so a missing font never hangs the app. Also gate the auth bootstrap (`isLoading`) so the guard doesn't flash.
- Update the `expo-splash-screen` plugin config in `app.json`: `backgroundColor` `#208AEF` → `#F8F6F2` (warm white), keep the existing `splash-icon.png` image. This makes the launch feel like Brote before any screen renders.

### 2. Design tokens — `src/theme/`

`src/theme/tokens.ts` codifies the visual-guide contract as plain TS objects (no runtime), `src/theme/index.ts` re-exports them + a `useTheme()` hook. Shape (built to accept a dark palette later without churn — see Decisions):

```ts
export const colors = {
  primary:        '#6E8E6A', // sage green
  secondary:      '#A8C29A', // lighter sage
  background:     '#F8F6F2', // warm white — never #FFFFFF
  surface:        '#FFFFFF', // card surface, used ~90–95% over bg
  earth:          '#C7A47B', // secondary buttons
  text:           { primary: '#3F3A36', secondary: '#7B756E' }, // never #000
  accent:         { mustard: '#D7B65A', terracotta: '#C87C5A' }, // small details only
} as const

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 } as const
export const radii    = { input:14, card:18, button:24, sheet:22 } as const
export const shadows  = { soft: {...}, none: {...} } // soft, shadow-opacity low, never harsh
export const type = {                      // scale (values finalized here, sizes per visual guide)
  fontFamily: { heading: 'Fraunces', body: 'Inter' },
  size: { display:32, h1:26, h2:22, body:16, small:14, caption:12 },
  weight: { regular:'400', medium:'500', semibold:'600', bold:'700' },
} as const
```

`useTheme()` returns the current tokens (and later a mode). `ThemeProvider` wraps the app in the root layout for the single source of truth and the future dark-mode seam.

### 3. Shared components — `src/components/`

Each is styled *only* from `useTheme()` — no inline hex. Props are minimal and typed.

- **`Button`** — variants: `primary` (sage bg, warm-white text), `secondary` (earth bg), `ghost` (no bg, sage text), `destructive` (terracotta). Pill radius (`radii.button`). Accepts `loading` (disabled + small activity indicator), `disabled`, `onPress`, and children. No emoji as icons.
- **`Input`** — light bg (slightly darker than screen bg per visual guide), subtle secondary-text border, sage focus border (no glow). Supports `label`, `error` (Spanish), `secureTextEntry`, left-icon slot. Used to retrofit the `002` auth forms.
- **`Card`** — `radii.card` (18), soft shadow, `surface` near-white. Content slot only; the composing screen decides layout. No harsh drop shadow.
- **`Avatar`** — renders an image when a source is given, otherwise the `display_name` initial over a sage circle. Used on home greeting and (later) plant/Flora contexts.
- **`EmptyState`** — props: `illustration` (an `Illustration` name), `title`, `subtitle`, optional `action` (`{ label, onPress }`). This is the component every "no data yet" screen composes — the watercolor is mandatory, never a bare message.
- **`LoadingSkeleton`** — animated placeholder block(s). Subtle fade pulse via `react-native-reanimated` (200–400ms, ease-in-out), warm-white-tinted, matching the card rhythm. Used on home and detail before data arrives.

### 4. Illustration placeholders — `assets/images/illustrations/`

- Commit lightweight watercolor-style placeholder PNGs (a single leaf, a pot, a watering can, a small flower) for empty/loading/AI-slot use. These are *stand-ins*; real art is produced later and dropped in by replacing the asset file.
- `src/components/Illustration.tsx` takes a `name`, renders the matching asset via `expo-image` (already a dep) at a given size, with generous whitespace baked into the asset per the visual guide.
- The Flora slot uses a dedicated `name="flora"` placeholder; its full identity is `008`'s concern, but the reserved slot means `008` only swaps art, not structure.

### 5. Home screen — `src/app/(app)/index.tsx`

Replaces the `002` placeholder. From `mockups/home.html`: a journal/agenda feel, generous whitespace, warm-white background. Structure (≤5 visible cards — hard rule):

```
Good morning ☀️            (Fraunces headline, uses display_name)
Today your garden needs...
─────────────────────────
[care cards: Water / Light / ...]   (one clear question/action each)
─────────────────────────
Latest joy / recent activity         (placeholder text until 004/005 land)
─────────────────────────
Ask Flora  →  (chat entry placeholder; 008 owns the real flow)
```

- Greeting uses `useAuth().user.user_metadata.display_name` and time-of-day ("Buenos días" / "Buenas tardes").
- Plant summary: a count ("Tienes 3 plantas") or, when zero, an `EmptyState` with a watercolor leaf and *"Aún no tienes plantas. Vamos a añadir tu primera."* (the add-plant action itself is wired in `004`; here it can be a no-op or route to a placeholder — explicitly noted in `tasks.md`).
- "What does my garden need today?" renders placeholder care cards that will connect to real data in `006` (watering) and `007` (light). Until then they read as the intended structure with placeholder copy/illustration — not fake numbers.
- `LoadingSkeleton` blocks render while the eventual queries load; today there are no queries yet, so the skeleton path is exercised via the component but resolves immediately.

### 6. Plant detail scaffold — `src/app/(app)/plants/[id].tsx`

- Reads `id` via `useLocalSearchParams`. Renders the plant's basic info in a `Card` (name in Fraunces, species/location underneath, photo via `expo-image` if present).
- Placeholder labeled sections ("Diario", "Fotos", "Consulta a Flora") each show an `EmptyState` ("Próximamente") so the scaffold looks intentional, not broken; `005`/`004`/`008` populate them.
- Reaching it: from home, a plant card (when plants exist) navigates via `router.push('/plants/${id}')`. With zero plants this route is unreachable from UI in `003` (no fake plants); it's verified directly via dev navigation.

### 7. Retrofit `002` auth screens onto tokens

`login`, `signup`, `forgot-password`, `reset-password` had throw-away inline styles in `002` (Phase 3 of `002` left the screen-styling tasks unchecked specifically to defer here). `003` restyles them from tokens: Fraunces headings, Inter body, sage primary buttons via the shared `Button`, `Input` component for the fields, warm-white background, soft cards. **Behavior from `002` (validation, error strings, deep-link handling, guard) is untouched** — only styling moves onto the token system. Spanish copy stays verbatim.

### 8. Root layout updates

`src/app/_layout.tsx` currently wraps `<Stack>` in `<AuthProvider>`. `003` adds:
- `SplashScreen.preventAutoHideAsync()` at module scope; `hide()` effect once fonts ready.
- Wrap in `<ThemeProvider>` (inside `AuthProvider`, since theme doesn't depend on auth, but the home greeting reads auth state).
- Conservative transition: gentle fade via `Stack` screen options (`animation: 'fade'`) rather than hard cuts, per the visual guide.

## Implementation

### Packages
No new runtime packages required. Already present: `expo-font` ~14, `expo-splash-screen` ~31, `expo-image` ~3 (`Illustration`), `react-native-reanimated` ~4 (animations, skeletons), `expo-router`. Fraunces + Inter font files are downloaded and committed to `assets/fonts/` (sources: Google Fonts / official; license files committed alongside). `react-native-svg` is **not** added here — placeholder illustrations are raster PNGs swappable later; if `008` needs vector Flora animation it reintroduces SVG then.

### Files (new)
```
assets/fonts/Fraunces-*.ttf, Inter-*.ttf            (+ LICENSE files)
assets/images/illustrations/{leaf,pot,watering-can,flower,flora}.png
src/theme/tokens.ts
src/theme/index.ts                                    (ThemeProvider + useTheme)
src/components/Button.tsx
src/components/Input.tsx
src/components/Card.tsx
src/components/Avatar.tsx
src/components/EmptyState.tsx
src/components/LoadingSkeleton.tsx
src/components/Illustration.tsx
src/app/(app)/plants/[id].tsx
```

### Files (modified)
```
app.json                                    # expo-font `fonts[]` + splash backgroundColor
src/app/_layout.tsx                         # splash gating + ThemeProvider
src/app/(app)/index.tsx                     # placeholder → real home
src/app/(auth)/{login,signup,forgot-password,reset-password}.tsx  # restyle onto tokens/components
```

## Decisions

1. **Static fonts + runtime `useFonts` over config-plugin embed.** The v54 docs state variable fonts "do not have support across all platforms" → use static. The PostScript-name filenames (which the rsms/undercase static TTFs are already named as) give consistent family names on iOS (name extracted from file) and Android (filename). We chose `useFonts` over the config-plugin embed because the hook works in Expo Go and custom dev builds alike; the config plugin only embeds custom fonts in a custom dev build (Expo Go ignores them). The cost is a trivial splash gate, which we already want for the auth session bootstrap.
2. **Light palette only, but tokens shaped for dark mode.** The visual guide ships a single (light) palette. We structure `colors`/`useTheme()` so a dark variant can be added later without touching every component — but we don't ship a dark palette now (out of reach). `userInterfaceStyle` stays `automatic`.
3. **No new dep for illustrations.** Raster PNG placeholders + `expo-image` keep `003` dependency-free. Real watercolor art is a design task; swapping a `name`-keyed asset is a no-code-change drop. Vector/animated Flora is deferred to `008` along with her identity.
4. **Retrofit, don't rewrite, the `002` screens.** Their logic (validation, deep-link, guard) is done and intentional; `003` only moves their styling onto tokens/components. This keeps `002`'s acceptance intact and avoids reopening completed behavior.
5. **Home care cards are structural placeholders, not fake data.** Until `006`/`007` supply real schedules, the home "today" cards render the intended layout with clearly-placeholder copy + illustration. We never invent plant counts or watering tasks — the mission forbids being *unreliable*; a fake "2 plants need water" with zero plants would betray trust.
6. **Avatar default = initial, not a stock photo.** Until `013` adds real avatars, `Avatar` falls back to the sage-circle initial from `display_name` — consistent with the calm, non-stock-photo visual language.

## Risks

- **Font family-name divergence across iOS/Android.** iOS derives the family name from the file; Android uses the filename. Mitigation: pick font files whose internal PostScript family equals our intended strings (`Fraunces`, `Inter`), and verify with `Font.getLoadedFonts()` during dev; if they diverge, centralize the names in a `fontFamilies` map referenced by tokens.
- **Splash hang on font load failure.** If a font file is missing/corrupt and the gate waits forever, the app appears stuck. Mitigation: always call `SplashScreen.hide()` on the error path and log; the plugin-embedded fonts make a missing-font cold start unlikely.
- **Mockup drag on the critical path.** If home/plant-detail mockups slip, Phase 4 slips. Mitigation: tokens, fonts, splash, and all shared components are independent and ship first; screens are the only mockup-gated slice.
- **Scope creep into real data.** It's tempting to wire `plants` queries in `003` since the table exists from `001`. Mitigation: that's `004`'s scope; `003` keeps the home/detail as scaffolds + empty/loading states and uses no Supabase queries. Stated explicitly in Out of reach.
- **Reanimated worklet config in skeleton animations.** Animated style props need the worklet runtime; if mis-configured the skeleton may not animate (but still renders). Mitigation: confirm `react-native-worklets` (already a dep) + reanimated 4 setup; fall back to a static warm-white-tinted placeholder if the worklet path raises issues — visual fidelity trumps animation during the foundation pass.

## Verification

- App launches with the warm-white splash (`#F8F6F2`) and never renders a screen in a fallback font — Fraunces headlines, Inter body visible immediately.
- Home: authenticated, zero plants → `EmptyState` (watercolor + *"Aún no tienes plantas…"*). Greeting shows the user's `display_name` and correct time-of-day.
- Navigate (dev) to `/plants/<some-uuid>` → plant detail scaffold renders with placeholder "Próximamente" sections.
- Each shared component renders in isolation with the correct palette/radius/shadow (manual pass against the visual-guide checklist).
- Auth screens still function: log in, sign up, forgot/reset password flows from `002` work end-to-end — only their appearance changed to tokens.
- Contrast check: body text `#3F3A36` on `#F8F6F2` meets WCAG AA (4.5:1) — confirmed by computed ratio in tasks.
- No screen uses `#000`/`#FFF`/saturated green/handwritten font/emoji-as-icon — enforced by the visual-guide checklist review.
- `npm run lint` and `npx tsc --noEmit` both pass.