# 016 - Polish & Refinement

## Phase 1 — Tab bar foundation (Item 1)

- [ ] Create `src/app/(app)/(tabs)/_layout.tsx` — `Tabs` navigator with `headerShown: false` per screen
- [ ] Configure the four `Tabs.Screen` entries with `tabBarIcon` (thin-line `-outline` MaterialCommunityIcons) + Spanish `title`:
  - [ ] `index` → Inicio, `home-variant-outline`
  - [ ] `garden` → Mi jardín, `sprout-outline`
  - [ ] `flora` → Flora, `flower-outline`
  - [ ] `settings` → Ajustes, `cog-outline`
- [ ] Style the bar: `tabBarActiveTintColor` = `colors.primary`, `tabBarInactiveTintColor` = `colors.text.secondary`, `tabBarStyle` bg `colors.background` + top `colors.border`; label in Inter caption
- [ ] Move `src/app/(app)/index.tsx` → `src/app/(app)/(tabs)/index.tsx` (delete the old file)
- [ ] Add placeholder screens: `garden.tsx`, `flora.tsx`, `settings.tsx` (calm placeholder shell)
- [ ] Edit `src/app/(app)/_layout.tsx` — add `<Stack.Screen name="(tabs)" options={{ headerShown: false }} />`
- [ ] Update `router.replace("/(app)")` → valid target:
  - [ ] `src/app/(app)/new-plant.tsx:55`
  - [ ] `src/app/(app)/plants/[id]/index.tsx:99`
  - [ ] `src/app/(app)/plants/[id]/index.tsx:138`

## Phase 2 — Settings page (Item 2)

- [ ] Add `src/components/SettingsLinkRow.tsx` — icon + label + `chevron-right`, `Pressable`, opens URL via `WebBrowser.openBrowserAsync`
- [ ] Edit `src/app/(app)/(tabs)/settings.tsx` — custom Fraunces header "Ajustes"
- [ ] Profile card — `Avatar` (initial) + display name + email from `useAuth().user`
- [ ] Account section — "Cerrar sesión" `Button` `variant="destructive"` calling `signOut` (optional `Alert.alert` confirmation)
- [ ] Information section — the five `SettingsLinkRow` links (privacy, terms, blog, GitHub, bug guide)
- [ ] Edit `src/app/(app)/(tabs)/index.tsx` — remove the "Cerrar sesión" ghost button (was `(app)/index.tsx:307-311`)

## Phase 3 — Flora tab wiring (Item 3)

- [ ] Move `src/app/(app)/chat/index.tsx` → `src/app/(app)/(tabs)/flora.tsx` (delete the old file)
- [ ] Give the chat list an in-screen Fraunces header "Flora" + the "new chat" plus button (was in the Stack header)
- [ ] Edit `src/app/(app)/_layout.tsx` — remove the `chat/index` screen entry (keep `chat/new` and `chat/[id]`)
- [ ] Edit `src/app/(app)/(tabs)/index.tsx` — "Hablar con Flora" → `router.push("/flora")`

## Phase 4 — Mi jardín + FAB (Item 4)

- [ ] Add `src/components/FloatingActionButton.tsx` — primary circle, thin-line `plus`, `shadows.soft`, pressed feedback, `position: absolute; right/bottom: spacing.lg`, props `onPress`/`icon`/`accessibilityLabel`
- [ ] Edit `src/app/(app)/(tabs)/garden.tsx` — custom Fraunces header "Mi jardín"
- [ ] Garden list — `fetchPlants()` (newest first) rendered with `PlantCard` → `/plants/[id]`
- [ ] Garden loading skeleton + empty state ("Aún no tienes plantas" + "Añadir mi primera planta" → `/new-plant`)
- [ ] Garden `useFocusEffect` refresh; add list `paddingBottom` so the FAB doesn't cover the last card
- [ ] Render `<FloatingActionButton onPress={() => router.push("/new-plant")} />`
- [ ] Edit `src/app/(app)/(tabs)/index.tsx` — remove plant list + its empty state/loading skeleton; remove `plants` state / `fetchPlants` / `loadPlants` if unused; remove the header "add plant" plus button (keep the bell); keep `WateringDueSection`, greeting, Flora teaser, banner
- [ ] Edit `src/app/(app)/new-plant.tsx:55` — success redirect → `/garden`

## Phase 5 — Verification

- [ ] `npm run lint` passes (0 errors)
- [ ] `npx tsc --noEmit` passes under strict mode
- [ ] Manual: four tabs render at bottom; Inicio, Mi jardín, Flora, Ajustes each activate their tab correctly
- [ ] Manual: no duplicate `/` route; `/`, `/garden`, `/flora`, `/settings` all resolve
- [ ] Manual: Ajustes shows name + email; "Cerrar sesión" logs out; all five links open
- [ ] Manual: Flora tab shows the conversation list with the tab bar visible; opening a thread goes full-screen and back returns to Flora
- [ ] Manual: Inicio shows only the watering-due section (no plant list); Mi jardín shows the full list + FAB; adding a plant from the FAB returns to Mi jardín
- [ ] Manual: creating/editing/deleting a plant refreshes Mi jardín on focus

## Phase 6 — Roadmap

- [ ] Update `spec/constitution/roadmap.md` — note the polish pass / new navigation (or add a `016` entry if the roadmap needs it)
