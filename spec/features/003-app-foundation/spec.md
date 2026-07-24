# 003 - App Foundation

**Status:** Planning

## What makes

The app looks and feels like Brote. This feature builds the visual system the rest of the app lives in and the first real screen a logged-in user sees:

- **Fonts** — `Fraunces` (headlines) and `Inter` (body), loaded at boot and gated behind the splash screen so text never flashes in a fallback font.
- **Design tokens** — colors, spacing, typography scale, border radii, and shadows, codified once in `src/theme` and consumed everywhere instead of inline hex values.
- **Root layout** — the existing `(auth)` / `(app)` route groups (introduced in `002`) gain a `ThemeProvider`, font loading, and splash gating. The auth screens are retrofitted onto the shared tokens/components.
- **Home screen** — replaces the `(app)/index.tsx` placeholder. Answers *"What does my garden need today?"*: greeting, plant summary, the day's care cards, recent activity, and quick access to chat.
- **Plant detail screen** — a scaffold (`plants/[id].tsx`) that renders a plant's basic info with placeholder sections for the features that land later (journal, photos, AI).
- **Shared UI components** — `Button`, `Input`, `Card`, `Avatar`, `EmptyState`, `LoadingSkeleton`, the building blocks every later feature composes.
- **Watercolor illustration placeholders** — committed placeholder art for empty and loading states, swappable for final watercolor assets later.
- **Loading and empty states** — defined everywhere data will eventually load (home, plant list, plant detail), not bolted on after the fact.

This feature ships the *visual contract*. Everything built after (`004` onward) consumes these tokens and components rather than reinventing styling.

## Why

The mission says opening the app should feel like entering a small digital garden, never a spreadsheet. `002` shipped auth with deliberately throw-away inline styling and the wrong palette (`#F5F8F3`, `#2D3F2A`) — placeholder values until the real system existed. The visual guide (`brote-visual-guide` skill) defines the palette, type, radii, shadows, animation cadence, and the watercolor language; `003` is where that guide becomes code.

Doing it now — before any plant, journal, or AI screen — means every later feature is born inside the correct system, with reusable `Button`/`Input`/`Card` and consistent empty/loading states. Retrofitting a design system after five features is far costlier and produces an inconsistent app, which the mission forbids (*close, clear, relaxing — never confusing*).

## Mockup-first workflow

Following the same precedent as `002`, the owner (the user, not opencode) produces **HTML mockups** for the two new screens before their React Native implementation, so the layout and Spanish copy can be iterated fast outside the simulator. Mockups live at:

```
spec/features/003-app-foundation/mockups/
  home.html
  plant-detail.html
```

The token system, fonts, and shared components are unblocked and proceed in parallel — they don't depend on screen mockups. The home and plant-detail *screen implementation* tasks (Phase 4) are blocked until their mockups are committed.

## Acceptance criteria

1. `Fraunces` and `Inter` font files live under `assets/fonts/` and are registered through the `expo-font` config plugin in `app.json` (the recommended build-time embed for native), so they render without a runtime `useFonts` gate on the critical path.
2. The root `src/app/_layout.tsx` calls `SplashScreen.preventAutoHideAsync()` at module scope and hides the splash once fonts are confirmed loaded (`Font.isLoaded`), so no screen renders before the custom fonts are available.
3. The `expo-splash-screen` plugin background changes from the current `#208AEF` to the Brote warm white `#F8F6F2` to match the brand at launch.
4. `src/theme/tokens.ts` exports the canonical design tokens from the visual guide: the full color palette (`primary` `#6E8E6A`, `secondary` `#A8C29A`, `background` `#F8F6F2`, `earth` `#C7A47B`, `textDark` `#3F3A36`, `textSecondary` `#7B756E`, `mustard` `#D7B65A`, `terracotta` `#C87C5A`), a spacing scale, a typography scale (sizes + Fraunces/Inter family assignments + weights), border radii (cards 16–20, buttons ~24, inputs 12–16, sheets 20–24), and shadow tokens (soft, never harsh).
5. `src/theme/index.ts` re-exports tokens plus a `useTheme()` hook (and a `ThemeProvider` if dark-mode handling is deferred, see Decisions) so consumers never import raw hex values.
6. Shared components exist and are styled *only* from theme tokens: `src/components/Button.tsx` (primary sage / secondary earth / ghost sage-text / destructive terracotta variants), `Input.tsx` (light bg, subtle border, sage focus border), `Card.tsx` (16–20 radius, soft shadow, near-white surface), `Avatar.tsx`, `EmptyState.tsx` (illustration + heading + subtext + optional action), `LoadingSkeleton.tsx`.
7. The home screen at `src/app/(app)/index.tsx` replaces the `002` placeholder and, from mockups, renders: greeting using the user's `display_name`, a plant summary (count, or a warm empty state when the user has no plants yet), "What does my garden need today?" care cards (never more than 5 visible), recent activity, and a quick-access entry to chat (placeholder is fine — `008` owns the real chat).
8. With zero plants, home shows an `EmptyState` watercolor placeholder — never an empty list or a blank screen.
9. A plant detail scaffold exists at `src/app/(app)/plants/[id].tsx`: it reads the `id` param, shows the plant's basic info (name, species, location, photo if present) via a `Card`, and has labeled placeholder sections ("Diario", "Fotos", "Consulta a Flora") that `005`/`004`/`008` will fill. Navigation from a plant card to this screen works.
10. Watercolor placeholder illustrations are committed under `assets/images/illustrations/` and surfaced through an `Illustration` component (`src/components/Illustration.tsx`) keyed by name, so final art swaps in later by replacing assets — no code changes downstream.
11. The `002` auth screens (`login`, `signup`, `forgot-password`, `reset-password`) are retrofitted onto the shared theme tokens and components (where straightforward), replacing their inline hex styles; their behavior from `002` is unchanged.
12. Loading states (skeletons or disabled+spinner affordances) and empty states are present on the home screen, the plant list region, and the plant detail scaffold.
13. All body text renders in Fraunces (headlines) / Inter (body). No screen uses `#000`/`#FFF`, saturated greens, handwritten fonts, or emoji as icons — enforced by the visual-guide checklist and a lint pass.
14. Animations (where present) use `react-native-reanimated`, durations 200–400ms (up to 600ms for transitions), ease-in-out / organic cubic-bezier — never linear, never bouncy.
15. `npm run lint` passes with no new errors.
16. The project compiles under strict TypeScript (`npx tsc --noEmit`).

## Out of reach

- Real watercolor art (final illustrations) — only placeholders ship here; final art is produced by a designer and swapped in later.
- The Flora AI avatar's full visual identity and animated typing indicator — owned by `008-ai-foundation`; `003` only reserves the `Illustration` slot it will use.
- Full dark mode. `003` codifies tokens in a shape that *can* later hold a dark palette (see Decisions), but ships only the light palette from the visual guide. A complete dark theme is a later hardening task.
- Any actual plant CRUD, journal entries, photo timelines, or live chat content — `003` ships the *scaffolds and states* (placeholders + empty/loading), not the data. `004`, `005`, `008` fill them.
- Onboarding flow — `012-onboarding` owns intro/permissions; the home screen assumes an already-authenticated user (per `002`'s guard).
- A `profiles` table or avatar uploads from real photos — the `Avatar` component supports an image source, but the data backing it is `013`'s concern. `003` renders `display_name` initial as the default avatar.