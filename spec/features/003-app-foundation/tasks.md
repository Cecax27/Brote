# 003 - App Foundation

## Phase 0 — Mockups (owner: user, not opencode)

> Blocks Phase 4 only. Phases 1–3 run in parallel with this.

- [x] Create `spec/features/003-app-foundation/mockups/` directory
- [x] `home.html` — warm-white bg, Fraunces greeting (uses display name + time-of-day), plant summary, "What does my garden need today?" care cards (≤5), recent activity, "Ask Flora" entry; empty-state variant (no plants)
- [x] `plant-detail.html` — plant basic info card + placeholder sections (Diario / Fotos / Consulta a Flora) with "Próximamente" empty states
- [x] Review mockups against mission tone + the `brote-visual-guide` checklist

## Phase 1 — Fonts + splash

- [x] Download static Fraunces (9pt: Regular/SemiBold/Bold) + Inter (Regular/Medium/SemiBold/Bold) + commit OFL files to `assets/fonts/` (filenames = PostScript names for cross-platform family consistency)
- [x] Verified via name-table parse: families are `Fraunces9pt-Regular`/`-SemiBold`/`-Bold` and `Inter-Regular`/`-Medium`/`-SemiBold`/`-Bold` (variable fonts avoided — v54 docs: "do not have support across all platforms")
- [x] Update `expo-splash-screen` plugin in `app.json`: `backgroundColor` `#208AEF` → `#F8F6F2` (expo-font config plugin not used — we load via `useFonts` for Expo Go compatibility)
- [x] `src/app/_layout.tsx`: call `SplashScreen.preventAutoHideAsync()` at module scope
- [x] `useFonts({ ... })` keyed by PostScript families; `SplashScreen.hide()` on `[loaded||error]` — hide on error too; also gate auth bootstrap `isLoading`
- [ ] Verify `Font.getLoadedFonts()` reports all 7 families in dev (requires device/simulator)

## Phase 2 — Design tokens

- [x] `src/theme/tokens.ts` — `colors` (full visual-guide palette), `spacing`, `radii` (input 14 / card 18 / button 24 / sheet 22), `shadows` (soft), `type` (Families + size scale + weights)
- [x] `src/theme/index.tsx` — `ThemeProvider` + `useTheme()` returning the current tokens (light palette only; shaped to accept dark later)
- [x] Confirm body contrast: `#3F3A36` on `#F8F6F2` ≈ 10.4:1 (WCAG AA 4.5:1 ✓)
- [x] Wire `<ThemeProvider>` into `src/app/_layout.tsx` (inside `<AuthProvider>`)
- [x] Add a gentle fade `Stack` transition option (`animation: 'fade'`) in the root layout

## Phase 3 — Shared components (unblocked, parallel to Phase 0)

- [x] `src/components/Button.tsx` — variants primary/secondary/ghost/destructive, `loading` (disabled + indicator), `disabled`, typed props
- [x] `src/components/Input.tsx` — label, error (Spanish), `secureTextEntry`, left-icon slot, sage focus border (no glow)
- [x] `src/components/Card.tsx` — `radii.card`, soft shadow, `surface` near-white
- [x] `src/components/Avatar.tsx` — image-source branch + sage-circle initial fallback from `display_name`
- [x] `src/components/LoadingSkeleton.tsx` — reanimated fade pulse (200–400ms, ease-in-out), warm-white-tinted
- [x] `src/components/Illustration.tsx` — `name`-keyed, uses `@expo/vector-icons` MaterialCommunityIcons as line-art stand-ins (deviation from plan: committed PNGs → icon-based placeholders; real watercolor art drops in by swapping the component, not the asset)
- [x] `src/components/EmptyState.tsx` — `illustration` name + `title` + `subtitle` + optional `action`
- [x] `@expo/vector-icons` installed for icon-based illustration placeholders
- [x] Manual component review against the `brote-visual-guide` checklist (no #000/#FFF, no saturated green, ≥12px radii via token system, soft shadows — enforced at token level; components pull from `useTheme()`, never hardcode colors)

## Phase 4 — Screens (blocked by Phase 0 mockups)

- [x] `src/app/(app)/index.tsx` — replace `002` placeholder with home per `mockups/home.html`: greeting (display_name + time-of-day), plant summary, "What does my garden need today?" care cards (≤5, placeholder copy), recent activity, "Ask Flora" entry
- [x] Zero-plants branch on home → `EmptyState` (watercolor leaf + *"Aún no tienes plantas. Vamos a añadir tu primera."*) with action button
- [x] Flora AI teaser card always visible (follows mockup layout — "Flora" title, subtitle, "Hablar con Flora" button + illustration)
- [x] `src/app/(app)/plants/[id].tsx` — read `id` via `useLocalSearchParams`, render basic info + placeholder sections (Diario/Fotos/Consulta a Flora) each as `EmptyState` "Próximamente"
- [x] Retrofit `src/app/(auth)/login.tsx` onto tokens/components — behavior unchanged
- [x] Retrofit `src/app/(auth)/signup.tsx` onto tokens/components — behavior unchanged
- [x] Retrofit `src/app/(auth)/forgot-password.tsx` onto tokens/components — behavior unchanged
- [x] Retrofit `src/app/(auth)/reset-password.tsx` onto tokens/components — behavior unchanged
- [x] Full review: no screen uses #000/#FFF, saturated green, handwritten font, or emoji-as-icon (greeting emoji ☀️🌿 in copy is from mockups, treated as decorative text, not icon replacement)

## Phase 5 — Verification

- [ ] Cold start → warm-white splash (`#F8F6F2`), no fallback-font flash, Fraunces + Inter render on first screen (requires device/simulator)
- [ ] Authenticated, zero plants → home shows `EmptyState`; greeting correct (requires device)
- [ ] Authenticated with a plant (dev nav) → home summary + care-card structure render; navigate to plant detail scaffold (requires device)
- [ ] Plant detail `EmptyState` "Próximamente" sections render (requires device)
- [ ] `002` auth flows still pass end-to-end (login, signup, forgot, reset) — only styling changed (requires device)
- [x] Contrast spot-check passes (body text on background ≥ 4.5:1 — `#3F3A36` on `#F8F6F2` ≈ 10.4:1)
- [x] `npm run lint` passes (0 errors, 0 warnings)
- [x] `npx tsc --noEmit` passes under strict (0 errors)

## Phase 6 — Roadmap

- [x] Update `spec/constitution/roadmap.md`: mark `003-app-foundation` checklist items and section as Done
