# 008 - AI Foundation

## Phase 0 — Packages + env (no new deps)

- [ ] Confirm no new `npm` packages are needed (existing `@supabase/supabase-js`, `expo-image`, `react-native-reanimated` v4, `@expo/vector-icons` cover the feature)
- [ ] Add `EXPO_PUBLIC_BROTE_AGENT_MOCK` note to `.env.example` as an optional dev override (`# set to "1" to force the mock agent even when EXPO_PUBLIC_BROTE_AGENT_URL is set`)
- [ ] Verify `handle_updated_at()` trigger function exists in DB (from `001` fix migration) before referencing it in the `ai_conversations` trigger

## Phase 1 — Database migration + types

- [ ] Create `supabase/migrations/<timestamp>_create_ai_conversations_and_messages.sql` — `ai_conversations` table (`id, user_id FK auth.users ON DELETE CASCADE, plant_id FK plants? ON DELETE CASCADE, title text not null default 'Conversación con Flora', created_at, updated_at`)
- [ ] Create `ai_messages` table in the same migration (`id, conversation_id FK ai_conversations ON DELETE CASCADE, role text check in ('user','assistant'), content text check 1–4000, photo_url text?, created_at`) — no `updated_at`, no `user_id`
- [ ] Add index `ai_conversations(user_id, created_at desc)` for the chat list
- [ ] Add index `ai_messages(conversation_id, created_at)` for the message thread
- [ ] Attach `ai_conversations_set_updated_at` trigger using the existing `handle_updated_at()` function
- [ ] Enable RLS + create policies `ai_conv_owner_select/insert/update/delete` on `ai_conversations` (`auth.uid() = user_id`)
- [ ] Enable RLS + create policies `ai_msg_owner_select/insert/update/delete` on `ai_messages` using `EXISTS (select 1 from ai_conversations where id = ai_messages.conversation_id and user_id = auth.uid())`
- [ ] Run `npm run gen-types`; commit `src/lib/supabase/database.types.ts` with `ai_conversations` + `ai_messages` types resolved

## Phase 2 — Data layer

- [ ] Create `src/lib/supabase/ai-conversations.ts` — type aliases `AIConversation`, `AIConversationInsert`, `AIConversationUpdate`, `ConversationWithPlant` (join with `plants`)
- [ ] `fetchConversations()` — `select("*, plants(*)").order("created_at", { ascending: false })`; return `ConversationWithPlant[]`
- [ ] `fetchConversation(id)` — `select("*, plants(*)").eq("id", id).maybeSingle()`; `PGRST116` → `null`
- [ ] `createConversation({ plant_id?, title? })` — read `user_id` from `supabase.auth.getUser()`, insert, return the row
- [ ] `updateConversation(id, { title })` — `update + select single`, throw on error
- [ ] `deleteConversation(id)` — `delete`, throw on error (FK cascades to messages)
- [ ] Create `src/lib/supabase/ai-messages.ts` — type aliases `ConversationMessage`, `ConversationMessageInsert`
- [ ] `fetchMessages(conversationId)` — `select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true })`
- [ ] `createMessage({ conversation_id, role, content, photo_url? })` — `insert + select single`, throw on error (RLS `ai_msg_owner_insert` enforces ownership via the `EXISTS` policy)

## Phase 3 — Agent client + mock

- [ ] Create `src/lib/agent/client.ts` — `AgentErrorCode = "VALIDATION_ERROR" | "UPSTREAM_ERROR" | "INTERNAL_ERROR" | "NETWORK"`, `AgentError extends Error`, `PlantContext` type, `AgentChatInput = { message: string; context?: PlantContext; accessToken: string }`
- [ ] `AgentClient` interface — `getHealth(): Promise<{ status: "ok" }>`; `postChat(input: AgentChatInput): Promise<string>` (returns `reply`)
- [ ] `createAgentClient({ baseUrl?, fetchImpl? })` — read `process.env.EXPO_PUBLIC_BROTE_AGENT_URL!` by default; global `fetch` overridable
- [ ] `getHealth` — `GET /health`, wrap network errors as `AgentError("NETWORK", ...)`
- [ ] `postChat` — pre-validate `message` length (1–2000) → throw `AgentError("VALIDATION_ERROR", "Escribe un mensaje entre 1 y 2000 caracteres.")` before fetch; send `Authorization: Bearer <accessToken>`; body `{ message, context? }`; on 200 return `data.reply`; on non-200 with error envelope throw `AgentError(body.error.code, body.error.message)`; map network/AbortError/unparseable body to `AgentError("NETWORK", "Flora no pudo responder ahora. Inténtalo de nuevo.")`
- [ ] Create `src/lib/agent/mock.ts` — `MockAgentClient implements AgentClient`, `getHealth()` returns `{ status: "ok" }`, `postChat(input)` waits ~700ms (configurable via `{ delayMs }`), `pickReply(input)` keyword-matches (`"regar"`, `"luz"`, `"luz"`, `"hojas"`) against a small Spanish canned list
- [ ] Create `src/lib/agent/index.ts` — `getAgent(): AgentClient` returns `new MockAgentClient()` when `EXPO_PUBLIC_BROTE_AGENT_URL` is unset OR `EXPO_PUBLIC_BROTE_AGENT_MOCK === "1"`; otherwise `createAgentClient()`. Re-exports `AgentClient`, `AgentError`, `AgentChatInput`, `PlantContext`, `MockAgentClient`.

## Phase 4 — Context builder

- [ ] Create `src/lib/agent/context.ts` — `buildPlantContext(plantId: string): Promise<PlantContext>`
- [ ] Loads `fetchPlant(plantId)`, last 10 entries via `fetchJournalEntries(plantId)` (existing, desc), and `fetchWateringSchedule(plantId)` (existing)
- [ ] Maps to the compact `PlantContext` shape (`plant` subset, `recentEntries` subset, optional `schedule` subset) — no internal ids, no Spanish text, data-only
- [ ] Cache per conversation in a weak `Map<conversationId, PlantContext>` so re-sends don't re-fetch

## Phase 5 — Visual identity + chat components

- [ ] Create `src/components/FloraAvatar.tsx` — props `mood: "idle" | "rainy" | "hot" | "confused"`, `size?` (default 72), `style?`; renders `expo-image` with `source` from an internal mood→`require()` map (`Simple Flora.png`, `Flora in rain.png`, `Hot flora, in a warmer day.png`, `Flora with a confused expression, as if she were in doubt.png`); `contentFit="contain"`; no clip
- [ ] Update `src/components/Illustration.tsx` — when `name === "flora"`, render `<FloraAvatar mood="idle" size={size} />` instead of the `MaterialCommunityIcons "flower"` glyph (preserves all existing call sites: home Flora card, plant-detail bottom `EmptyState`, empty `/chat`)
- [ ] Create `src/components/ChatMessageBubble.tsx` — props `{ message: ConversationMessage }`; assistant rows left-aligned with `FloraAvatar size=28` + `colors.surface` bubble (`radii.card`, `shadows.resting`); user rows right-aligned with `colors.primary` bubble + `colors.background` text; body in `typeScale.body`; no timestamps; no hard-coded colors
- [ ] Create `src/components/FloraTypingIndicator.tsx` — three `MaterialCommunityIcons name="leaf"` glyphs (14px, `colors.secondary`); Reanimated v4 `withRepeat(withTiming(opacity 0.2→1→0.2, duration `motion.duration.slow` 450ms, ease-in-out))`, staggered start delay `motion.duration.micro` 200ms between leaves; left-aligned like an assistant message
- [ ] Create `src/components/ChatContextHeader.tsx` — props `{ plant: Plant }`; plant thumbnail (60×60) + "Hablando sobre {name}" (Fraunces `h3`); tap pushes plant detail; returns `null` for general conversations
- [ ] Create `src/components/ChatInput.tsx` — props `{ onSend, disabled?, error? }`; `TextInput` multiline (max 5 visible lines), placeholder "Escribe a Flora…", `char "{length}/2000"` counter shown when `length > 1900`; sage send `Button` (variant primary, `"send-outline"` + "Enviar"); disabled while pending or trimmed text empty; `error` line above input in `colors.accent.terracotta`; enter key triggers `onSend`

## Phase 6 — Chat screens

- [ ] Create `src/app/(app)/chat/index.tsx` — title "Flora"; `useFocusEffect` loads `fetchConversations()`; `LoadingSkeleton` while loading; `EmptyState` (`FloraAvatar idle`) "Aún no has hablado con Flora" + action "Empezar a hablar" → `/chat/new`
- [ ] List rows are `Card`s: plant thumbnail (or `FloraAvatar idle size=40` for general chats), title (`typeScale.h3` Fraunces), last-message preview via a per-conversation newest-message fetch (`typeScale.caption`, `colors.text.secondary`), chevron-right; header has "Nuevo chat" → `/chat/new`; row tap → `/chat/[id]`
- [ ] Create `src/app/(app)/chat/new.tsx` — title "Nuevo chat"; reads `plantId` from `useLocalSearchParams`; loads the plant (when rooted) for `ChatContextHeader`; renders empty message list + `ChatInput`; on first `onSend` calls `createConversation({ plant_id })` → `router.replace("/chat/[id]", { id })` → runs the persist+send flow (same as `[id]`); if the user leaves without sending, nothing is persisted
- [ ] Create `src/app/(app)/chat/[id].tsx` — title "Flora"; `useFocusEffect` loads `fetchConversation(id)` + `fetchMessages(id)` in parallel; `LoadingSkeleton` while loading; `EmptyState` (`FloraAvatar idle` + "Hola, soy Flora. Pregúntame lo que quieras sobre tus plantas.") when empty
- [ ] Send flow on `[id]`: optimistically append user message with `role: "user"` (optimistic id), persist via `createMessage`, render `FloraTypingIndicator`, call `getAgent().postChat({ message, context: conversation.plant_id ? await buildPlantContext(...) : undefined, accessToken: session?.access_token ?? "" })`; on success append assistant message + persist via `createMessage({ role: "assistant", content: reply })`, hide typing indicator; on `AgentError` set `ChatInput.error` to the Spanish message, hide typing indicator, keep the user's unsent-but-persisted message visible
- [ ] Title flow: on the first successful assistant reply of a conversation whose `title` is still the default, compute `firstUserMessage.slice(0, 30) + (length > 30 ? "…" : "")`, call `updateConversation(id, { title })`, mirror optimistically so the list updates on return without a refetch
- [ ] `ChatContextHeader` rendered when `conversation.plant_id` is set; `FloraTypingIndicator` shown only while awaiting the agent reply; `ChatInput.disabled` matches the pending state

## Phase 7 — Screen integrations

- [ ] In `src/app/(app)/index.tsx`, change the Flora teaser card's "Hablar con Flora" button from `onPress={() => {}}` to `onPress={() => router.push("/chat")}`
- [ ] In `src/app/(app)/plants/[id]/index.tsx`, replace the bottom `<EmptyState illustration="flora" … "Próximamente" />` with a small "Flora" section header (`typeScale.h3`) + `Button variant="secondary"` "Consultar a Flora" → `router.push({ pathname: "/chat/new", params: { plantId: id } })`; place after `JournalSection`

## Phase 8 — Route registration

- [ ] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` for `chat` (title "Flora", `headerBackTitle: "Volver"`, `headerShadowVisible: false`), `chat/new` (title "Nuevo chat", `headerBackTitle: "Cerrar"`), `chat/[id]` (title "Flora", `headerBackTitle: "Volver"`)
- [ ] Verify `typedRoutes` regenerates cleanly on next dev build (if a `.expo/types` cache error appears, `rm -rf .expo/types` and rebuild)

## Phase 9 — Verification

- [ ] `npm run lint` passes (0 errors)
- [ ] `npx tsc --noEmit` passes under strict (regenerated `database.types.ts` + the agent types resolve: `AIConversation`, `ConversationMessage`, `AgentClient`, `PlantContext`)
- [ ] Manual (no `EXPO_PUBLIC_BROTE_AGENT_URL`, mock-only): `/chat` empty state → "Empezar a hablar" → `/chat/new` → send "Hola" → conversation created, navigated to `/chat/[id]`, mock reply appears, conversation in `/chat` list on return with truncated title + `FloraAvatar idle` thumbnail
- [ ] Manual (mock): from plant detail "Consultar a Flora" → `/chat/new?plantId=…` → `ChatContextHeader` shows plant name + thumbnail; send persists; conversation list row shows the plant thumbnail
- [ ] Manual (mock): re-open a conversation from `/chat` → messages load in chronological order, input ready, sending appends correctly
- [ ] Manual (mock): long first user message (e.g. "¿Cuándo riego mi Monstera deliciosa que está en la ventana?") becomes `title` = first 30 chars + "…" after the first assistant reply
- [ ] Manual (mock): `EXPO_PUBLIC_BROTE_AGENT_MOCK=1` with a live URL → chat loop runs against canned replies (confirms the seam both ways)
- [ ] Manual (live `EXPO_PUBLIC_BROTE_AGENT_URL` set to a bad URL): sending shows the typing indicator briefly, then the calm Spanish "Flora no pudo responder ahora. Inténtalo de nuevo." above the input; the persisted user message stays visible; tapping send retries
- [ ] Manual: `getHealth()` is non-blocking — `/chat` opens even if a `/health` ping fails
- [ ] Manual: RLS — a second user's client cannot read/update another user's `ai_conversations` or `ai_messages`
- [ ] Manual: visual — every chat surface is warm-white `#F8F6F2`, brown-black `#3F3A36` text, sage primary, no pure black/white, no emoji icons, Fraunces titles + Inter body, radii ≥ 16, soft shadows, typing indicator ≈ 450ms ease-in-out (per `brote-visual-guide`)

## Phase 10 — Roadmap

- [ ] Update `spec/constitution/roadmap.md`: move all `008-ai-foundation` checklist items from `[ ]` to `[x]` once the feature is shipped; leave `009` and `010` unchecked (they build on top of `008`)