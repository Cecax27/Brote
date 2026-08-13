# 016 - Polish & Refinement

**Status:** Planning

## What makes

A polish pass over the existing app. No new data model, no migrations — this session restructures navigation and refines a few screens so the app feels like the calm, browsable notebook it is meant to be. Four changes:

- **Bottom tab bar** — a four-tab navigator at the bottom of the screen. Each tab shows a thin-line icon above a Spanish label: **Inicio**, **Mi jardín**, **Flora**, **Ajustes**. The three new pages start as placeholders. Implemented with `expo-router`'s `Tabs` inside a `(tabs)` group nested under the existing `(app)` Stack, which keeps owning the pushed detail screens (plant detail, edit, chat thread, agenda).
- **Settings page (Ajustes)** — the account's new home. Shows the user's display name and email, hosts the "Cerrar sesión" action (moved off Inicio), and links out to the privacy policy, terms, blog, GitHub, and the bug-reporting guide.
- **Flora tab wiring** — the Flora tab *is* the existing chat list. The conversation list (currently `chat/index.tsx` at `/chat`) relocates into the Flora tab (`/flora`) so the tab bar stays visible and the tab reads as active, while chat threads (`/chat/[id]`) and new chat (`/chat/new`) remain full-screen stack pages.
- **Mi jardín + FAB** — Inicio narrows to the "what needs watering today" summary; the full plant list moves to Mi jardín, which gains a floating action button to add a plant.

## Why

The mission says the home screen answers one question — *"what does my garden need today?"* — in under five seconds. But today Inicio scrolls through the brand, a greeting, the full plant list, a Flora teaser, and a logout button. That mixes two jobs: "what do I do now" and "browse my plants". The tab bar separates them: Inicio is the daily summary, Mi jardín is the collection. It also gives the app a stable spine so future destinations (settings, Flora) don't feel bolted on.

Settings deserves its own tab because account identity and "log out" are not part of the garden ritual — they were awkwardly parked at the bottom of Inicio. Moving them (plus the external links) to Ajustes keeps Inicio focused on plants and gives the account a conventional, calm home.

Flora already exists as a screen, but as a stack page it sits outside the tab bar. Wiring it as the Flora tab makes the companion permanently one tap away — Flora is a first-class destination, not a card that pushes you away from the app's spine.

## Acceptance criteria

1. A `(tabs)` group exists under `(app)` with a `Tabs` layout; four tabs render at the bottom with a thin-line `MaterialCommunityIcons` icon above a Spanish label — Inicio (`home-variant-outline`), Mi jardín (`sprout-outline`), Flora (`flower-outline`), Ajustes (`cog-outline`).
2. Tab bar styling follows the visual guide: active tint `colors.primary`, inactive `colors.text.secondary`, bar background `colors.background` (`#F8F6F2`, never pure white) with a `colors.border` top edge, labels in Inter caption, icon above label.
3. Home lives at `(tabs)/index.tsx` (route `/`); the old `(app)/index.tsx` is removed so no duplicate `/` route remains.
4. `(app)/_layout.tsx` registers `(tabs)` with `headerShown: false`; the pushed screens (`new-plant`, `watering`, `plants/[id]/*`, `chat/new`, `chat/[id]`) still resolve and render with their Stack headers.
5. Every `router.replace("/(app)")` call site resolves to a real route after the index moves into `(tabs)`.
6. The Ajustes tab shows the authenticated user's display name (`user.user_metadata.display_name`) and email (`user.email`).
7. "Cerrar sesión" (destructive button) signs the user out; the button is no longer on Inicio.
8. Five links render on Ajustes and open their target URL in the in-app browser (`expo-web-browser`): privacy policy, terms of service, blog, GitHub, bug-reporting guide.
9. The Flora tab renders the conversation list (route `/flora`) with the tab bar visible and the Flora tab active; `/chat` no longer resolves as an index, while `/chat/new` and `/chat/[id]` still work as full-screen stack pages.
10. "Hablar con Flora" on Inicio navigates to `/flora`.
11. Inicio no longer renders the plant list, its empty state, or its loading skeleton; it keeps the greeting, the `WateringDueSection`, the Flora teaser card, and the notification banner.
12. Mi jardín renders the full plant list (newest first) via `fetchPlants()`, with a loading skeleton, an empty state ("Aún no tienes plantas" + "Añadir mi primera planta" → `/new-plant`), and refresh-on-focus.
13. Mi jardín shows a floating action button that navigates to `/new-plant`; after a successful save, `new-plant.tsx` returns to `/garden`.
14. Creating, editing, or deleting a plant is reflected in Mi jardín on focus.
15. `npm run lint` passes with no errors and `npx tsc --noEmit` passes under strict mode.

## Out of reach

- No new tables, migrations, RLS policies, or RPCs — purely client-side restructuring.
- No dark mode or theme changes (the light palette and `useTheme()` shape are untouched).
- No profile editing, notification preferences, or account deletion — those belong to `013-settings-profile`.
- No redesign of `WateringDueSection`, `PlantCard`, or the plant detail screen.
- No new watering/calendar behavior; the existing `/watering` agenda is unchanged.
- No redesign of the chat thread (`/chat/[id]`) or new-chat (`/chat/new`) screens beyond keeping them reachable.
