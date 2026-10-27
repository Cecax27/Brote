# 016 — Polish & Refinement

## Session scope

No new product features. This session refines and polishes what already exists:
bug fixes, UI/UX improvements, and small structural changes.

Items are added here as they are defined. Nothing in this file is final until it
is checked off in `tasks.md`.

---

## Item 1 — Bottom tab bar (Inicio / Mi jardín / Flora / Ajustes)

### Goal

Replace the current single-scroll home experience with a four-tab navigation:

- Positioned at the bottom of the screen.
- Each button shows a thin-line icon above the page label.
- Four pages: **Inicio** (Home — already exists), **Mi jardín** (My Garden),
  **Flora**, **Ajustes** (Settings). The three new pages are created as
  placeholders for now (no content yet).

### Routing approach

Use `expo-router`'s built-in `Tabs` navigator inside a new `(tabs)` route group
nested under the existing `(app)` group. The `(app)` group keeps its `Stack`
layout for the pushed detail screens (plant detail, edit, chat thread, etc.);
the tab bar is the base of that stack.

```
src/app/(app)/
  _layout.tsx            → Stack (unchanged role; gains a (tabs) screen)
  new-plant.tsx          → pushed screen (unchanged)
  watering.tsx           → pushed screen (unchanged)
  plants/[id]/...        → pushed screens (unchanged)
  chat/new.tsx           → pushed screen (unchanged)
  chat/[id].tsx          → pushed screen (unchanged)
  (tabs)/
    _layout.tsx          → Tabs navigator (the tab bar)
    index.tsx            → Inicio (moved from (app)/index.tsx)
    garden.tsx           → Mi jardín (placeholder)
    flora.tsx            → Flora (placeholder)
    settings.tsx         → Ajustes (placeholder)
```

### Pages

| Tab       | Route      | Icon (MaterialCommunityIcons, outline) | Status            |
| --------- | ---------- | -------------------------------------- | ----------------- |
| Inicio    | `/`        | `home-variant-outline`                 | Existing (moved)  |
| Mi jardín | `/garden`  | `sprout-outline`                       | Placeholder       |
| Flora     | `/flora`   | `flower-outline`                       | Placeholder       |
| Ajustes   | `/settings`| `cog-outline`                          | Placeholder       |

### Tab bar design (per brote-visual-guide)

- **Icons**: thin-line `-outline` MaterialCommunityIcons (already the codebase
  convention; matches the 2px-stroke, no-fill iconography rule).
- **Layout**: icon above label, label in `Inter` at caption size.
- **Active state**: sage green (`colors.primary`). Inactive: `colors.text.secondary`.
- **Bar background**: `colors.background` (`#F8F6F2`) with a subtle top border
  (`colors.border`). Never pure white.
- **Header**: each tab screen manages its own header (Inicio already does);
  the Tabs layout sets `headerShown: false` per screen.
- **Safe area**: rely on the Tabs navigator's built-in bottom safe-area inset.

### Files

- **Add** `src/app/(app)/(tabs)/_layout.tsx` — `Tabs` config + bar styling.
- **Add** `src/app/(app)/(tabs)/garden.tsx` — placeholder screen.
- **Add** `src/app/(app)/(tabs)/flora.tsx` — placeholder screen.
- **Add** `src/app/(app)/(tabs)/settings.tsx` — placeholder screen.
- **Move** `src/app/(app)/index.tsx` → `src/app/(app)/(tabs)/index.tsx`.
- **Edit** `src/app/(app)/_layout.tsx` — add `(tabs)` screen entry with
  `headerShown: false`.

### Navigation call sites to update

- `src/app/(app)/index.tsx:286` — `router.push("/chat")` → target the Flora tab
  (see decision below).
- `router.replace("/(app)")` occurrences → `router.replace("/")`:
  - `src/app/(app)/new-plant.tsx:55`
  - `src/app/(app)/plants/[id]/index.tsx:99`
  - `src/app/(app)/plants/[id]/index.tsx:138`

### Decisions & open questions

1. **Flora tab vs the existing chat list.** The chat list already lives at
   `src/app/(app)/chat/index.tsx` (titled "Flora"). Two options:
   - **A (deferred):** keep `chat/index.tsx` as-is; `flora.tsx` is a placeholder
     for now. The home "Hablar con Flora" button keeps pointing at `/chat`.
   - **B (eventual):** the Flora tab *is* the chat list — move
     `chat/index.tsx` content into `flora.tsx`, remove the `/chat` index route,
     and point "Hablar con Flora" at `/flora`.
   - **Recommendation:** ship A now (matches "don't add content yet"), resolve
     toward B when the Flora tab is fleshed out.
2. **Mi jardín vs Inicio.** Inicio currently renders the full plant list. Once
   Mi jardín gets content, the plant list likely moves there and Inicio narrows
   to the "what does my garden need today?" summary (per the roadmap's home
   spec). Deferred.

### Risks

- Route conflicts if `(app)/index.tsx` is left in place alongside
  `(tabs)/index.tsx` (both resolve to `/`). The old file must be deleted, not
  copied.
- `router.replace("/(app)")` resolving to the group index may break once the
  index moves into `(tabs)`; update to `"/"`.

---

## Item 2 — Settings page (Ajustes)

### Goal

Build the Ajustes tab as a real screen (replacing its placeholder). It holds
account identity and the app's links, and becomes the new home for "log out"
(removed from the Inicio screen).

### Layout (top → bottom)

1. **Header** — custom, Fraunces title "Ajustes" (tab screens run with
   `headerShown: false`, so the title is rendered in-screen, matching Inicio).
2. **Profile card** — `Avatar` (initial from display name) + display name
   (`user.user_metadata.display_name`) + email (`user.email`).
3. **Account section** — "Cerrar sesión" button (`Button`, `variant="destructive"`).
   Optionally wrapped in an `Alert.alert` confirmation.
4. **Information section** — the external links list (below).

### Data source

`useAuth()` → `user`, `signOut`. `user.email` and
`user.user_metadata.display_name` (already used on Inicio).

### Links

All links open externally. Use `expo-web-browser`'s `openBrowserAsync` (already
a dependency) for an in-app browser — calmer than leaving the app. Each row:
thin-line `MaterialCommunityIcons` outline icon + Spanish label, tappable row
with a chevron / external-link affordance.

| Label (ES)              | Icon (outline)          | URL                                             |
| ----------------------- | ----------------------- | ----------------------------------------------- |
| Política de privacidad  | `shield-check-outline`  | https://brote-ashen.vercel.app/privacy          |
| Términos del servicio   | `file-document-outline` | https://brote-ashen.vercel.app/terms            |
| Blog                    | `newspaper-variant-outline` | https://brote-ashen.vercel.app/blog         |
| GitHub                  | `github`                | https://github.com/Cecax27/Brote                |
| Guía para reportar errores | `bug-outline`         | https://brote-ashen.vercel.app/#guide           |

### Components

- **Reuse**: `Avatar`, `Button`.
- **Add** `src/components/SettingsLinkRow.tsx` — a small reusable row
  (icon + label + `chevron-right`), `Pressable`, opens a URL via
  `openBrowserAsync`. Keeps `settings.tsx` tidy and gives a consistent
  pattern for future settings entries.

### Files

- **Edit** `src/app/(app)/(tabs)/settings.tsx` — placeholder → full screen.
- **Add** `src/components/SettingsLinkRow.tsx` — link row component.
- **Edit** `src/app/(app)/(tabs)/index.tsx` — remove the "Cerrar sesión"
  ghost button (currently `src/app/(app)/index.tsx:307-311`).

### Design notes

- Profile card: `colors.surface` background, `radii.card`, `shadows.soft`.
- Section headings: `caption` typography, `colors.text.secondary`.
- Link rows: `colors.surface`, dividers or grouped card with `radii.card`;
  active feedback via pressed opacity.
- Log out stays terracotta (destructive) and secondary in visual weight —
  never bright red.

### Acceptance criteria

- Username and email render from the authenticated user.
- "Cerrar sesión" signs the user out (and is no longer on Inicio).
- All five links open their target URL.

---

## Item 3 — Wire the Flora tab to the existing chat list

### Goal

Make the Flora tab button open the existing Flora page (the chat/conversation
list). The page's content already exists at `src/app/(app)/chat/index.tsx`
(route `/chat`, titled "Flora"); the Flora tab is currently a placeholder
(`src/app/(app)/(tabs)/flora.tsx`). This resolves open question #1 from Item 1
(option B).

### Constraint

For the tab bar to stay visible and the Flora tab to show as active on the
chat list, the chat list must *be* the Flora tab screen. A tab `href` that
points at `/chat` (or a `<Redirect>` in `flora.tsx`) navigates to a *sibling
stack screen*, which hides the tab bar and loses the active-tab state — not a
true tab. So the list is relocated, not merely linked.

### Approach (recommended) — relocate the chat list into the Flora tab

- **Move** `src/app/(app)/chat/index.tsx` → `src/app/(app)/(tabs)/flora.tsx`.
  The route changes from `/chat` to `/flora`.
- **Keep** `src/app/(app)/chat/new.tsx` (`/chat/new`) and
  `src/app/(app)/chat/[id].tsx` (`/chat/[id]`) as pushed stack screens
  (unchanged URLs). Opening a conversation from Flora still goes full-screen
  with a back button, matching current behavior.
- The chat list's header currently comes from the Stack (title "Flora" + the
  "new chat" plus button in `_layout.tsx`). As a tab it renders its own
  in-screen header — title "Flora" (Fraunces) + plus button — consistent with
  Inicio's custom header.

### Alternative (deferred) — keep `/chat`, link the tab to it

Point the Flora `Tabs.Screen` at `/chat` via `href` (or `<Redirect href="/chat">`
in `flora.tsx`). Zero file moves, but the chat list renders as a full-screen
stack page *without* the tab bar and *without* an active Flora tab. Rejected
because it breaks the tab metaphor.

### Files

- **Move** `src/app/(app)/chat/index.tsx` → `src/app/(app)/(tabs)/flora.tsx`.
- **Edit** `src/app/(app)/(tabs)/_layout.tsx` — Flora tab now renders the list
  (no code change needed beyond the placeholder removal).
- **Edit** `src/app/(app)/_layout.tsx` — remove the `chat/index` screen entry
  (keep `chat/new` and `chat/[id]`).
- **Edit** `src/app/(app)/(tabs)/index.tsx` — "Hablar con Flora" button.

### Navigation references to update

| From                          | Current target | New target  |
| ----------------------------- | -------------- | ----------- |
| `(tabs)/index.tsx` "Hablar con Flora" (`(app)/index.tsx:286`) | `/chat`        | `/flora`    |

No other bare `/chat` references exist; `/chat/new` and `/chat/[id]` are
unchanged (`chat/new.tsx`, `chat/index.tsx` empty state, `_layout.tsx` header
plus button, `plants/[id]/index.tsx:418`).

### Decisions

- Flora tab = chat list (`/flora`). Chat threads stay at `/chat/[id]`, new chat
  at `/chat/new` (full-screen, no tab bar — same as today).
- The chat-list header becomes in-screen (custom), matching Inicio.

### Risks

- Leaving `chat/index.tsx` in place after adding `(tabs)/flora.tsx` creates two
  overlapping chat lists (`/chat` and `/flora`); the old file must be deleted.
- The Stack's `chat/index` screen entry must be removed or the route stays
  registered and reachable.

---

## Item 4 — Move the plant list to "Mi jardín" + add a FAB

### Goal

Split the two plant concerns currently mixed on Inicio:

- **Inicio** keeps only the "what needs watering today" section
  (`WateringDueSection`). The full plant list moves out.
- **Mi jardín** becomes the home of the full plant list, with a floating
  action button (FAB) to add a new plant.

### Inicio (`(tabs)/index.tsx`) — remove the plant list

- Remove the `plants.map(... <PlantCard/>)` list (currently
  `src/app/(app)/index.tsx:226-239`) and the "Aún no tienes plantas" empty
  state + loading skeleton tied to it.
- Remove the `plants` state and `fetchPlants`/`loadPlants` calls if they are
  no longer needed elsewhere. `WateringDueSection` already renders `null` when
  empty, so `hasPlants` is no longer required to gate it.
- Remove the header's "add plant" plus button (currently `:132-141`) — adding
  a plant now belongs to Mi jardín's FAB. Keep the bell (`/watering`).
- Keep: greeting, `WateringDueSection`, Flora teaser card, notification banner.
  (These are not part of the plant list; "keep only the watering section"
  applies to the plant content, not the teaser/banner.)

### Mi jardín (`(tabs)/garden.tsx`) — full plant list

- Custom in-screen header "Mi jardín" (Fraunces), consistent with Inicio.
- Plant list via `fetchPlants()` (already ordered newest first), rendered with
  `PlantCard` → `/plants/[id]`.
- Loading skeleton and empty state ("Aún no tienes plantas" + "Añadir mi
  primera planta" → `/new-plant`) move here from Inicio.
- Refresh on focus (`useFocusEffect`) so returns from create/edit/delete show
  fresh data.
- FAB (see below).

### Floating action button

- **Add** `src/components/FloatingActionButton.tsx` — reusable FAB:
  - Circular pill, `colors.primary` background, `radii.button` radius.
  - Thin-line `plus` icon (`MaterialCommunityIcons`), `colors.background`.
  - Soft shadow (`shadows.soft`); pressed opacity feedback.
  - Absolutely positioned bottom-right: `position: "absolute"`,
    `right: spacing.lg`, `bottom: spacing.lg`. The screen area already sits
    above the tab bar, so no extra inset is needed.
  - Props: `onPress`, optional `icon`, optional `accessibilityLabel`.
- Mi jardín renders `<FloatingActionButton onPress={() => router.push("/new-plant")} />`.

### Files

- **Edit** `src/app/(app)/(tabs)/index.tsx` — remove plant list + empty state +
  add-plant button; drop unused plant state/fetch.
- **Edit** `src/app/(app)/(tabs)/garden.tsx` — placeholder → full list + FAB.
- **Add** `src/components/FloatingActionButton.tsx`.

### Navigation references to update

| From                       | Current target          | New target  |
| -------------------------- | ----------------------- | ----------- |
| `new-plant.tsx:55` success | `router.replace("/(app)")` | `/garden` |

New-plant is now reached from Mi jardín's FAB, so on save it returns to the
garden list rather than the Inicio summary.

### Decisions

- The "no plants" empty state lives in Mi jardín (it owns the list). Inicio for
  a brand-new user shows greeting + Flora teaser only; the watering section is
  hidden when nothing is due.
- The add-plant affordance moves entirely to the Mi jardín FAB (Inicio's header
  plus button is removed; the bell for watering remains).

### Risks

- `hasPlants`/`plants` removal on Inicio must not break the greeting or the
  Flora teaser (they don't depend on the plant list).
- The FAB must not overlap the tab bar or the last list item — use
  `paddingBottom` on the list so the last card isn't hidden behind the FAB.



