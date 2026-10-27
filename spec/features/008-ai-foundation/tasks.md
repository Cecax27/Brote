# 008 - AI Foundation

> Contract note: brote-agent's `/chat` settled on body `{ message, plant_id? }` with `Authorization: Bearer <supabase-jwt>`. The app forwards the rooted conversation's `plant_id` (or omits it for a general chat); the **agent** fetches plant context server-side using the JWT. There is **no** client-side `PlantContext`/`buildPlantContext`/`agent/context.ts` — context gathering moved to the agent.

## Phase 0 — Packages + env (no new deps)

- [x] Confirm no new `npm` packages are needed (existing `@supabase/supabase-js`, `expo-image`, `react-native-reanimated` v4, `@expo/vector-icons` cover the feature)
- [x] Add `EXPO_PUBLIC_BROTE_AGENT_MOCK` note to `.env.example` as an optional dev override (`# Set to "1" to force the mock agent even when EXPO_PUBLIC_BROTE_AGENT_URL is set`)
- [x] Verify `handle_updated_at()` trigger function exists in DB (from `001` fix migration) before referencing it in the `ai_conversations` trigger

## Phase 1 — Database migration + types

- [x] Create `supabase/migrations/20260725210000_create_ai_conversations_and_messages.sql` — `ai_conversations` table (`id, user_id FK auth.users ON DELETE CASCADE, plant_id FK plants? ON DELETE CASCADE, title text not null default 'Conversación con Flora', created_at, updated_at`)
- [x] Create `ai_messages` table in the same migration (`id, conversation_id FK ai_conversations ON DELETE CASCADE, role text check in ('user','assistant'), content text check 1–4000, photo_url text?, created_at`) — no `updated_at`, no `user_id`
- [x] Add index `ai_conversations(user_id, created_at desc)` for the chat list
- [x] Add index `ai_messages(conversation_id, created_at)` for the message thread
- [x] Attach `ai_conversations_set_updated_at` trigger using the existing `handle_updated_at()` function
- [x] Enable RLS + create policies `ai_conv_owner_select/insert/update/delete` on `ai_conversations` (`auth.uid() = user_id`)
- [x] Enable RLS + create policies `ai_msg_owner_select/insert/update/delete` on `ai_messages` using `EXISTS (select 1 from ai_conversations where id = ai_messages.conversation_id and user_id = auth.uid())`
- [x] Run `npm run gen-types`; `src/lib/supabase/database.types.ts` has `ai_conversations` + `ai_messages` types resolved

## Phase 2 — Data layer

- [x] Create `src/lib/supabase/ai-conversations.ts` — type aliases `AIConversation`, `AIConversationInsert`, `AIConversationUpdate`, `ConversationWithPlant` (join with `plants`)
- [x] `fetchConversations()` — `select("*, plants(*)").order("created_at", { ascending: false })`; return `ConversationWithPlant[]`
- [x] `fetchConversation(id)` — `select("*, plants(*)").eq("id", id).single()`; `PGRST116` → `null`, else throw
- [x] `createConversation({ plant_id?, title? })` — read `user_id` from `supabase.auth.getUser()`, insert, return the row
- [x] `updateConversation(id, { title })` — `update + select single`, throw on error
- [x] `deleteConversation(id)` — `delete`, throw on error (FK cascades to messages)
- [x] Create `src/lib/supabase/ai-messages.ts` — type aliases `ConversationMessage`, `ConversationMessageInsert`
- [x] `fetchMessages(conversationId)` — `select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true })`
- [x] `createMessage({ conversation_id, role, content, photo_url? })` — `insert + select single`, throw on error (RLS `ai_msg_owner_insert` enforces ownership via the `EXISTS` policy)

## Phase 3 — Agent client + mock

- [x] Create `src/lib/agent/client.ts` — `AgentErrorCode = "VALIDATION_ERROR" | "UPSTREAM_ERROR" | "INTERNAL_ERROR" | "UNAUTHORIZED" | "NETWORK"`, `AgentError extends Error`, `AgentChatInput = { message: string; plant_id?: string | null; accessToken: string }`
- [x] `AgentClient` interface — `getHealth(): Promise<{ status: "ok" }>`; `postChat(input: AgentChatInput): Promise<string>` (returns `reply`)
- [x] `createAgentClient({ baseUrl?, fetchImpl? })` — read `process.env.EXPO_PUBLIC_BROTE_AGENT_URL!` by default; global `fetch` overridable
- [x] `getHealth` — `GET /health`, wrap network errors as `AgentError("NETWORK", ...)`
- [x] `postChat` — pre-validate `message` length (1–2000) → throw `AgentError("VALIDATION_ERROR", "Escribe un mensaje entre 1 y 2000 caracteres.")` before fetch; pre-validate `accessToken` presence → throw `AgentError("UNAUTHORIZED", "Inicia sesión para hablar con Flora.")`; send `Authorization: Bearer <accessToken>`; body `{ message, plant_id? }`; on 200 return `data.reply`; on non-200 map status to code (401→`UNAUTHORIZED`, 422→`VALIDATION_ERROR`, 502→`UPSTREAM_ERROR`, 500→`INTERNAL_ERROR`, else `NETWORK`) using the agent's `error.message` when parseable; map network/AbortError/unparseable body to `AgentError("NETWORK", "Flora no pudo responder ahora. Inténtalo de nuevo.")`
- [x] Create `src/lib/agent/mock.ts` — `MockAgentClient implements AgentClient`, `getHealth()` returns `{ status: "ok" }`, `postChat(input)` waits ~700ms (configurable via `{ delayMs }`), `pickReply(input)` returns plant-rooted reply when `input.plant_id` is set, else keyword-matches (`"riego"`, `"luz"`, `"hojas"`) against a small Spanish canned list
- [x] Create `src/lib/agent/index.ts` — `getAgent(): AgentClient` returns `new MockAgentClient()` when `EXPO_PUBLIC_BROTE_AGENT_URL` is unset OR `EXPO_PUBLIC_BROTE_AGENT_MOCK === "1"`; otherwise `createAgentClient()`. Re-exports `AgentClient`, `AgentError`, `AgentChatInput`, `MockAgentClient`.

## Phase 4 — Plant context (server-side, no client builder)

- [x] No `src/lib/agent/context.ts` is created — context gathering moved to brote-agent. The conversation screen forwards `conversation.plant_id` (or `null`) in the `postChat` body; the agent uses the bearer JWT to fetch plant info + recent journal + schedule from Supabase as the user.
- [x] General conversations omit `plant_id` (no plant context). The agent's handling of an absent `plant_id` is the agent's concern; the app just omits the field.
- [x] No `PlantContext` type and no client-side context caching. (`010`-era richer context — light history, photos — will be an agent-side fetch, not a new client field.)

## Phase 5 — Visual identity + chat components

- [x] Create `src/components/FloraAvatar.tsx` — props `mood: "idle" | "rainy" | "hot" | "confused"`, `size?` (default 72), `style?`; renders `expo-image` with `source` from an internal mood→`require()` map (`Simple Flora.png`, `Flora in rain.png`, `Hot flora, in a warmer day.png`, `Flora with a confused expression, as if she were in doubt.png`); `contentFit="contain"`
- [x] Update `src/components/Illustration.tsx` — when `name === "flora"`, render `<FloraAvatar mood="idle" size={size} style={style} />` instead of the `MaterialCommunityIcons "flower"` glyph (preserves call sites: home Flora card, plant-detail `EmptyState`, empty `/chat`)
- [x] Create `src/components/ChatMessageBubble.tsx` — props `{ message: ConversationMessage }`; assistant rows left-aligned with `FloraAvatar size=28` + `colors.surface` bubble (`radii.card`, `shadows.resting`); user rows right-aligned with `colors.primary` bubble + `colors.background` text; body in `typeScale.body`; no hard-coded colors
- [x] Create `src/components/FloraTypingIndicator.tsx` — three `MaterialCommunityIcons name="leaf"` glyphs (14px, `colors.secondary`); Reanimated v4 `withRepeat(withTiming(opacity 0.2→1→0.2, duration `motion.duration.slow` 450ms, ease-in-out))`, staggered start delay (`motion.duration.micro` 200ms between leaves); left-aligned like an assistant message; renders `FloraAvatar size=28` beside the leaves
- [x] Create `src/components/ChatContextHeader.tsx` — props `{ plant: Plant }`; plant thumbnail + "Hablando sobre {name}" (Fraunces `h3`); tap pushes plant detail
- [x] Create `src/components/ChatInput.tsx` — props `{ onSend, disabled?, error? }`; `TextInput` multiline (max 5 visible lines), placeholder "Escribe a Flora…", `char "{length}/2000"` counter shown when `length > 1900`; sage send `Button` (`"send-outline"` + send icon); disabled while pending or trimmed text empty; `error` line above input in `colors.accent.terracotta`

## Phase 6 — Chat screens

- [x] Create `src/app/(app)/chat/index.tsx` — title "Flora"; `useFocusEffect` loads `fetchConversations()` (+ per-conversation newest-message preview); `LoadingSkeleton` while loading; `EmptyState` (`illustration="flora"`) "Aún no has hablado con Flora" + action "Empezar a hablar" → `/chat/new`
- [x] List rows: plant thumbnail (or `FloraAvatar idle size=40` for general chats), title (`typeScale.h3` Fraunces), last-message preview (`typeScale.caption`, `colors.text.secondary`), chevron-right; row tap → `/chat/[id]`
- [x] Create `src/app/(app)/chat/new.tsx` — title "Nuevo chat"; reads `plantId` from `useLocalSearchParams`; loads the plant (when rooted) for `ChatContextHeader`; renders empty message list + `ChatInput`; on first `onSend` calls `createConversation({ plant_id })` → `router.replace("/chat/[id]", { id })` → runs the persist+send flow; if the user leaves without sending, nothing is persisted
- [x] Create `src/app/(app)/chat/[id].tsx` — title "Flora"; `useFocusEffect` loads `fetchConversation(id)` + `fetchMessages(id)` in parallel; `LoadingSkeleton` while loading; `EmptyState` (`illustration="flora"` + "Hola, soy Flora. Pregúntame lo que quieras sobre tus plantas.") when empty
- [x] Send flow on `[id]`: optimistically append user message with `role: "user"` (optimistic id), persist via `createMessage`, render `FloraTypingIndicator`, call `getAgent().postChat({ message, plant_id: conversation?.plant_id ?? null, accessToken: session?.access_token ?? "" })`; on success append assistant message + persist via `createMessage({ role: "assistant", content: reply })`, hide typing indicator; on `AgentError` set `ChatInput.error` to the Spanish message, hide typing indicator, keep the user's persisted message visible
- [x] Title flow: on the first successful assistant reply of a conversation whose `title` is still the default, compute `firstUserMessage.slice(0, 30) + (length > 30 ? "…" : "")`, call `updateConversation(id, { title })`, mirror optimistically
- [x] `ChatContextHeader` rendered when `conversation.plant_id` (and `plants` join is present); `FloraTypingIndicator` shown only while awaiting the agent reply; `ChatInput.disabled` matches the pending state

## Phase 7 — Screen integrations

- [x] In `src/app/(app)/index.tsx`, the Flora teaser card's "Hablar con Flora" button calls `router.push("/chat")`
- [x] In `src/app/(app)/plants/[id]/index.tsx`, the bottom "Flora" section header + `Button variant="secondary"` "Consultar a Flora" → `router.push({ pathname: "/chat/new", params: { plantId: id } })` (after `JournalSection`)

## Phase 8 — Route registration

- [x] Update `src/app/(app)/_layout.tsx` — add `Stack.Screen` for `chat/index` (title "Flora", `headerBackTitle: "Volver"`), `chat/new` (title "Nuevo chat", `headerBackTitle: "Cerrar"`), `chat/[id]` (title "Flora", `headerBackTitle: "Volver"`)

## Phase 9 — Verification

- [x] `npm run lint` passes (0 errors)
- [x] `npx tsc --noEmit` passes under strict (regenerated `database.types.ts` + the agent types resolve: `AIConversation`, `ConversationMessage`, `AgentClient`, `AgentChatInput`)
- [ ] Manual (no `EXPO_PUBLIC_BROTE_AGENT_URL`, mock-only): `/chat` empty state → "Empezar a hablar" → `/chat/new` → send "Hola" → conversation created, navigated to `/chat/[id]`, mock reply appears, conversation in `/chat` list on return with truncated title + `FloraAvatar idle` thumbnail
- [ ] Manual (mock): from plant detail "Consultar a Flora" → `/chat/new?plantId=…` → `ChatContextHeader` shows plant name + thumbnail; send persists; conversation list row shows the plant thumbnail
- [ ] Manual (mock): re-open a conversation from `/chat` → messages load in chronological order, input ready, sending appends correctly
- [ ] Manual (mock): long first user message (e.g. "¿Cuándo riego mi Monstera deliciosa que está en la ventana?") becomes `title` = first 30 chars + "…" after the first assistant reply
- [ ] Manual (mock): `EXPO_PUBLIC_BROTE_AGENT_MOCK=1` with a live URL → chat loop runs against canned replies (confirms the seam both ways)
- [ ] Manual (live `EXPO_PUBLIC_BROTE_AGENT_URL` set to a bad URL): sending shows the typing indicator briefly, then the calm Spanish "Flora no pudo responder ahora. Inténtalo de nuevo." above the input; the persisted user message stays visible; tapping send retries
- [ ] Manual: `getHealth()` is non-blocking — `/chat` opens even if a `/health` ping fails
- [ ] Manual: RLS — a second user's client cannot read/update another user's `ai_conversations` or `ai_messages`
- [ ] Manual: visual — every chat surface is warm-white `#F8F6F2`, brown-black `#3F3A36` text, sage primary, no pure black/white, no emoji icons, Fraunces titles + Inter body, radii ≥ 16, soft shadows, typing indicator ≈ 450ms ease-in-out (per `brote-visual-guide`)

> The manual items above require a device/E2E run and are the remaining QA gate. Code, lint, and `tsc` are all green; the implementation is complete.

## Phase 10 — Roadmap

- [x] Update `spec/constitution/roadmap.md`: move the `008-ai-foundation` checklist items from `[ ]` to `[x]` and refresh the V0.3 agent-contract blurb to `{ message, plant_id? }` + bearer JWT; leave `009` and `010` unchecked (they build on top of `008`)