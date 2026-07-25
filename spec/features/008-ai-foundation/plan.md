# 008 - AI Foundation

## Approach

Six layers, built incrementally against a mockable agent so the chat UI ships before brote-agent is live. The data layer lands first (tables → typed helpers); the agent client + mock second (no server needed); context builder third; then the Flora visual identity + chat components build on all three; finally the chat screens and the two screen integrations (home + plant detail) are retrofitted to point at the new routes.

```
Layer 1 — Data layer            Layer 2 — Agent client          Layer 3 — Context          Layer 4 — Components                Layer 5 — Screens                       Layer 6 — Integration
─────────────────────           ──────────────────────           ────────────────           ────────────────────────────           ──────────────────────────────────       ──────────────────────────────────
ai_conversations table          agent/client.ts (AgentClient)   agent/context.ts            FloraAvatar (watercolor PNGs)          /chat (list, "Flora")                    Home: "Hablar con Flora" → /chat
ai_messages table               agent/mock.ts (MockAgent)        buildPlantContext()         ChatMessageBubble                     /chat/new (composer, optional plantId)   Plant detail: "Consultar a Flora" → /chat/new?plantId=
RLS + indexes + gen-types       AgentError (typed envelope)      PlantContext shape           FloraTypingIndicator (3 leaves)       /chat/[id] (conversation, persist)       _layout: register chat/* routes
ai-conversations.ts helpers     supabase JWT bearer auth                                       ChatContextHeader, ChatInput
ai-messages.ts helpers
```

The mockable seam is the cornerstone: every screen and component depends on an `AgentClient` interface, never on `fetch` directly. The real `createAgentClient` hits brote-agent; the `MockAgentClient` returns canned Spanish replies with a short `setTimeout` so animations and persistence can be exercised without a URL set. When brote-agent is ready, swapping is a one-line factory change in a single composition root.

### 1. Database migration — `ai_conversations` + `ai_messages`

One numbered migration creates both tables, RLS, indexes, and the updated-at trigger on conversations. Mirrors the conventions of `20260722180208_create_journal_entries_table.sql` and `20260722180216_enable_rls_policies.sql`.

```sql
create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plant_id   uuid references public.plants (id) on delete cascade,
  title      text not null default 'Conversación con Flora',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_conversations_user_created_idx
  on public.ai_conversations (user_id, created_at desc);

create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (char_length(content) between 1 and 4000),
  photo_url       text,
  created_at      timestamptz not null default now()
);

create index ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at);
```

RLS — conversations owner-scoped directly, messages owner-scoped via their parent conversation:

```sql
alter table public.ai_conversations enable row level security;
create policy "ai_conv_owner_select" on public.ai_conversations for select using (auth.uid() = user_id);
create policy "ai_conv_owner_insert"  on public.ai_conversations for insert  with check (auth.uid() = user_id);
create policy "ai_conv_owner_update"  on public.ai_conversations for update  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conv_owner_delete"  on public.ai_conversations for delete  using (auth.uid() = user_id);

-- Reuse auth.users.id ↔ ai_conversations.user_id to gate message access.
alter table public.ai_messages enable row level security;
create policy "ai_msg_owner_select" on public.ai_messages
  for select using (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
create policy "ai_msg_owner_insert" on public.ai_messages
  for insert with check (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
create policy "ai_msg_owner_update" on public.ai_messages
  for update using (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
create policy "ai_msg_owner_delete" on public.ai_messages
  for delete using (exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id and ac.user_id = auth.uid()
  ));
```

Notes:
- `ai_messages` has no `user_id` and no `updated_at`: ownership is reached transitively through the conversation (a user can only ever touch messages on conversations they own, RLS-enforced), and messages are immutable — V0.3 has no edit/delete.
- `plant_id` is nullable because general conversations ("Hablar con Flora") are not rooted at a plant. `on delete cascade` takes care of the "user deletes a plant" case by cascading to the conversation, which cascades to its messages.
- The `ai_msg_owner_*` policies use an `EXISTS` join rather than a stored `user_id`; the cost is one index probe per row, which for a per-conversation message thread is negligible. The win is a single source of truth for ownership (`ai_conversations.user_id`) and no risk of a desynced denormalized `user_id`.
- After applying, run `npm run gen-types` so `Database["public"]["Tables"]["ai_conversations"]` and `["ai_messages"]` become typed.

### 2. Data layer — `src/lib/supabase/ai-conversations.ts` + `ai-messages.ts`

Mirrors `plants.ts` / `journal-entries.ts`: typed helpers that throw raw Supabase errors except `PGRST116` → `null` on a single-fetch. Types come from the regenerated `database.types.ts`.

```ts
// ai-conversations.ts
import { supabase } from "./client";
import type { Tables, TablesInsert, TablesUpdate } from "./database.types";
import type { Plant } from "./plants";

export type AIConversation = Tables<"ai_conversations">;
export type AIConversationInsert = TablesInsert<"ai_conversations">;
export type AIConversationUpdate = TablesUpdate<"ai_conversations">;
export type ConversationWithPlant = AIConversation & { plants: Plant | null };

export async function fetchConversations(): Promise<ConversationWithPlant[]>;
export async function fetchConversation(id: string): Promise<ConversationWithPlant | null>;
export async function createConversation(input: { plant_id?: string | null; title?: string }): Promise<AIConversation>;
export async function updateConversation(id: string, updates: { title: string }): Promise<AIConversation>;
export async function deleteConversation(id: string): Promise<void>;
```

- `fetchConversations` — `select("*, plants(*)").order("created_at", { ascending: false })`. The nested `plants(*)` carries the plant row (or `null`) so the chat-list rows show a plant thumbnail when rooted.
- `createConversation` — `insert({ user_id, plant_id, title }).select("*").single()`. `user_id` is filled from the session (via `supabase.auth.getUser()` — see §3 auth helper). `title` defaults to `'Conversación con Flora'` server-side if omitted.
- `updateConversation` / `deleteConversation` — same shape as the journal CRUD; `delete` cascades via FK.

```ts
// ai-messages.ts
import { supabase } from "./client";
import type { Tables, TablesInsert } from "./database.types";

export type ConversationMessage = Tables<"ai_messages">;
export type ConversationMessageInsert = TablesInsert<"ai_messages">;

export async function fetchMessages(conversationId: string): Promise<ConversationMessage[]>;
export async function createMessage(input: Omit<ConversationMessageInsert, "">): Promise<ConversationMessage>;
```

- `fetchMessages` — `select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true })`. Order ascending because chat is a thread.
- `createMessage` — `insert({ conversation_id, role, content, photo_url }).select("*").single()`. Used for both `role: "user"` and `role: "assistant"`. The RLS `ai_msg_owner_insert` `EXISTS` check guarantees the conversation belongs to the caller.

### 3. Agent client — `src/lib/agent/client.ts`

Isolates every network concern. Screens depend on the `AgentClient` interface, never `fetch`.

```ts
export type AgentErrorCode = "VALIDATION_ERROR" | "UPSTREAM_ERROR" | "INTERNAL_ERROR" | "NETWORK";

export class AgentError extends Error {
  constructor(public code: AgentErrorCode, message: string) { super(message); this.name = "AgentError"; }
}

export interface PlantContext {
  plant: { id: string; name: string; species: string | null; location: string | null; notes: string | null };
  recentEntries: { type: string; content: string | null; created_at: string }[];
  schedule?: { frequency_days: number; last_watered_at: string | null; next_due_at: string; active: boolean };
}

export interface AgentChatInput {
  message: string;            // 1..2000 validated client-side before send
  context?: PlantContext;
  accessToken: string;        // Supabase session JWT
}

export interface AgentClient {
  getHealth(): Promise<{ status: "ok" }>;
  postChat(input: AgentChatInput): Promise<string>; // returns `reply`
}

export interface AgentClientOptions { baseUrl?: string; fetchImpl?: typeof fetch; }

export function createAgentClient(options: AgentClientOptions = {}): AgentClient;
```

- `createAgentClient` reads `process.env.EXPO_PUBLIC_BROTE_AGENT_URL!` when `baseUrl` is omitted; `fetchImpl` defaults to global `fetch` (overridable for tests). One factory, one seam.
- `getHealth` — `GET {baseUrl}/health`, returns `{ status: "ok" }`. Wrapped in `try/catch` that rethrows as `AgentError("NETWORK", ...)`.
- `postChat` — `POST {baseUrl}/chat` with headers `Authorization: Bearer <accessToken>`, `Content-Type: application/json` and body `{ message, context? }`. On a `200` returns `data.reply as string`. On a non-200 with the agent's error envelope, throws `AgentError(body.error.code, body.error.message)`. On a network error / `AbortError` / unparseable body, throws `AgentError("NETWORK", "Flora no pudo responder ahora. Inténtalo de nuevo.")`.
- Client-side pre-validation: if `message` is empty or `> 2000` chars, throw `AgentError("VALIDATION_ERROR", "Escribe un mensaje entre 1 y 2000 caracteres.")` *before* the fetch — short-circuit the trip.
- The Supabase session token comes from `useAuth()` (already exposes `session`); the caller passes `session?.access_token ?? ""`. If missing, `postChat` throws `AgentError("NETWORK", "Inicia sesión para hablar con Flora.")` — defensive, but `useAuth`'s session is non-null inside `app`.
- The header carries no Gemini key; the agent owns it. The only credential on the wire is the Supabase JWT, which the agent verifies against Supabase JWKS (agent-side; out of scope for this app).

### 4. Mock agent — `src/lib/agent/mock.ts`

A `MockAgentClient` implementing `AgentClient` with canned Spanish replies and a short artificial delay so the typing indicator and persistence exercises the full UI before the agent is live.

```ts
const REPLIES = [
  "¡Hola! Soy Flora. Cuéntame, ¿cómo está tu planta?",
  "Mmh, déjame pensar… toca el sustrato antes de regar para ver si aún está húmedo.",
  "Eso suena como falta de luz; si puede, muévela a un punto más luminoso, sin sol directo.",
  "Cada planta es un mundo, ¿me cuentas qué especie es? Así te doy algo más concreto.",
];

export class MockAgentClient implements AgentClient {
  constructor(private opts: { delayMs?: number } = {}) {}
  async getHealth() { return { status: "ok" } as const; }
  async postChat(input: AgentChatInput): Promise<string> {
    await wait(this.opts.delayMs ?? 700);
    return pickReply(input);
  }
}
```

Composition root: a single `src/lib/agent/index.ts` exports `getAgent(): AgentClient` that returns `new MockAgentClient()` when `process.env.EXPO_PUBLIC_BROTE_AGENT_URL` is unset **or** `EXPO_PUBLIC_BROTE_AGENT_MOCK === "1"` (dev override), otherwise `createAgentClient()`. Screens import from `@/lib/agent`, never directly from `client` or `mock` — the swap is one line.

### 5. Context builder — `src/lib/agent/context.ts`

```ts
import type { PlantContext } from "./client";

export async function buildPlantContext(plantId: string): Promise<PlantContext>;
```

- Loads the plant via `fetchPlant(plantId)` (existing helper), the last 10 journal entries via `fetchJournalEntries(plantId)` (existing helper, already ordered desc), and the schedule via `fetchWateringSchedule(plantId)`.
- Maps to the JSON-compact `PlantContext` defined in §3 — only the fields the agent needs (no internal row ids beyond `plant.id`; no `user_id`; Spanish-as-data only). Truncating to `recentEntries: 10` keeps payload size under control.
- Cached per conversation in a weak `Map<conversationId, PlantContext>` so re-sends within the same thread don't re-fetch.
- For a general conversation (no `plant_id`) the conversation screen passes `context: undefined`. The agent-side decision to handle absence-of-context is the agent's; the app simply omits the field.

### 6. Visual identity — `FloraAvatar` + extending `Illustration`

Replace the `MaterialCommunityIcons` "flower" glyph placeholder with the real watercolor PNGs in `assets/images/illustrations/Flora/`. Per `brote-visual-guide`: Flora is a flower, watercolor, minimal features (tiny eyes at most), never childish, never a human/cartoon/robot, appears only when speaking.

- `src/components/FloraAvatar.tsx` props: `mood: "idle" | "rainy" | "hot" | "confused"`, `size?: number` (default 72), `style?`. Renders `expo-image` with `source` resolved from a fixed map in the file (`Simple Flora.png` → idle, `Flora in rain.png` → rainy, `Hot flora, in a warmer day.png` → hot, `Flora with a confused expression, as if she were in doubt.png` → confused). `contentFit="contain"`, no rounded clip (watercolor has its own soft edge).
- Opening chat empty/error states pick moods by intent: idle = welcome; confused = "Flora no pudo responder ahora" (pairs with the `AgentError` line); rainy = nothing in V0.3 (watering-related, reserved for `010` advice moments); hot = nothing in V0.3 (reserved for light/heat in `010`). For V0.3 the chat UI uses `idle` + `confused` only; the other two are wired so `010` can adopt them without touching the component.
- Extends `src/components/Illustration.tsx`: when `name === "flora"`, render `<FloraAvatar mood="idle" size={size} />` instead of the icon glyph. This heals the home Flora card and plant-detail bottom `EmptyState` (`illustration="flora"`) automatically without rewriting their call sites — consistent with the placeholder-replacement contract the component already documents in its header comment.

### 7. Chat components

All under `src/components/`, named exports, `useTheme()` for every token.

- `ChatMessageBubble.tsx` — props `{ message: ConversationMessage }`. Assistant rows: `FloraAvatar size=28` on the left, `colors.surface` bubble with `radii.card` border + `shadows.resting` on its tail side, body in `typeScale.body`, `colors.text.primary`. User rows: aligned right, `colors.primary` bubble + `colors.background` text. `contentFit="contain"` if a `photo_url` is present (V0.3 doesn't render photos in chat yet, but the column is there). No timestamps rendered (calm agenda; out of scope). Long content scrolls inside the list, not within a bubble.
- `FloraTypingIndicator.tsx` — three small sage leaf glyphs (reuse `MaterialCommunityIcons "leaf"` at 14px in `colors.secondary`, per the guide's "three tiny watercolor leaves animate in place of the three-dot typing indicator"). Reanimated v4: each leaf fades `0.2 → 1 → 0.2` with `withRepeat(withTiming(...), -1)` and a staggered start delay (`motion.duration.micro` 200ms between leaves), full cycle `motion.duration.slow` 450ms, ease-in-out. Container padded and left-aligned like an assistant message. Renders only when `isTyping`.
- `ChatContextHeader.tsx` — props `{ plant: Plant }`. A sticky-feeling but plainly-laid-out header above the message list: the plant thumbnail (reuse `PlantCard`'s 60×60 image style), "Hablando sobre {name}" (Fraunces `h3`, `colors.text.primary`), and a tap target that pushes the plant detail. Hidden for general conversations (passed no plant → returns `null`).
- `ChatInput.tsx` — props `{ onSend: (text: string) => void; disabled?: boolean; error?: string | null }`. A `TextInput` (multiline, max 5 lines visible, `Input`-derived style with `colors.muted` bg and `radii.input`), placeholder "Escribe a Flora…", a small counter `"{length}/2000"` shown when `length > 1900`. A sage send `Button` (variant primary, `MaterialCommunityIcons "send-outline"` + label "Enviar"); disabled while a reply is pending or the trimmed text is empty. The optional `error` line renders above the input in `colors.accent.terracotta` (the only place terracotta shows on this screen — error text, per the guide). Enter-on-soft-keyboard triggers `onSend`; the on-screen button is the canonical control.

### 8. Chat screens

Routes are file-based; `typedRoutes` is on, so the route map regenerates from these files. Registered in `(app)/_layout.tsx` with Spanish titles (§9).

- `/chat` — `src/app/(app)/chat/index.tsx` (title "Flora"). `useFocusEffect` loads `fetchConversations()` into `conversations`; `LoadingSkeleton` while loading; `EmptyState` (`<FloraAvatar mood="idle" />` small) "Aún no has hablado con Flora" + action "Empezar a hablar" → `router.push("/chat/new")`. List rows are `Card`s: plant thumbnail (or `FloraAvatar idle` size=40 for a general chat), title (`typeScale.h3` Fraunces), last message preview (`typeScale.caption`, `colors.text.secondary`), chevron-right. Pulling from stored conversation means the preview requires a `last_message_preview` — for V0.3 this is fetched by a second small select (the newest message per conversation) rather than denormalizing into the conversations row. (Decision 3.) Header has a "Nuevo chat" button → `/chat/new`. Tap row → `/chat/[id]`.
- `/chat/new` — `src/app/(app)/chat/new.tsx` (title "Nuevo chat"). Reads `plantId` from `useLocalSearchParams`. Loads the plant (if rooted) for the `ChatContextHeader`. Renders the same message list + `ChatInput` as `[id]`, but **with no `ai_conversations` row yet**: on the first `onSend` it calls `createConversation({ plant_id })` → `router.replace({ pathname: "/chat/[id]", params: { id: conversation.id } })` → then runs the persist+send flow (so the first user message lands on the persisted conversation with no UX hiccup). If the user leaves `/chat/new` without sending, nothing is created — no empty conversations cluttering the list. The screen is otherwise identical to `[id]` (empty state = `FloraAvatar idle` welcome card + input ready).
- `/chat/[id]` — `src/app/(app)/chat/[id].tsx` (title "Flora"). Loads `fetchConversation(id)` + `fetchMessages(id)` in parallel in a `useFocusEffect`; `LoadingSkeleton` while loading; `EmptyState` (`<FloraAvatar idle />` + welcoming line) when there are no messages (a resumed empty conversation is rare but reachable if the user created one and left). `Stickiness and persistence`: the send flow (criterion 18 of the spec) is implemented here. `ChatContextHeader` rendered if `conversation.plant_id`. Assistant typing indicator (`FloraTypingIndicator`) replaces the bubble area while awaiting `postChat`. The session access token is read from `useAuth()` `session?.access_token`; on `AgentError` the input bar's `error` prop is set and the typing indicator hides — the user's unsent-but-already-persisted message remains visible (optionally scrolled into view).
- Title flow: on the first successful assistant message of a conversation whose `title` is still the default `'Conversación con Flora'`, compute `title = firstUserMessage.slice(0, 30) + (length > 30 ? "…" : "")` and `updateConversation(id, { title })`. Local state mirrors the optimistic title so the list updates on return without a refetch. (Decision 4.)

### 9. Route registration + root-level hooks

- `src/app/(app)/_layout.tsx` — add three `Stack.Screen` entries: `chat` (title "Flora", `headerBackTitle: "Volver"`), `chat/new` (title "Nuevo chat", `headerBackTitle: "Cerrar"`), `chat/[id]` (title "Flora", `headerBackTitle: "Volver"`), matching the existing Spanish-header styling (`headerShadowVisible: false`, Fraunces `h3`, sage icon color). The `(app)` Stack already shows `headerShown: false` for `index`; `chat/index` keeps the default header.
- No root-`_layout.tsx` changes — Flora isn't wired to notifications; the existing `setupNotifications` for watering is untouched. The agent client has no lifecycle hooks of its own (it's stateless; constructing it is cheap).

### 10. Home + plant-detail integration

- `src/app/(app)/index.tsx` — the existing Flora teaser card's "Hablar con Flora" `Button` (`onPress={() => {}}`) becomes `onPress={() => router.push("/chat")}`. The card's top-right `<Illustration name="flora" />` already routes through the now-watercolor-aware `Illustration` → Flora appears on the home screen immediately. No new state, no new fetch.
- `src/app/(app)/plants/[id]/index.tsx` — replace the bottom `<EmptyState illustration="flora" title="Consulta a Flora" subtitle="…Próximamente." />` with a `Button variant="secondary"` "Consultar a Flora" → `router.push({ pathname: "/chat/new", params: { plantId: id } })`. Wrapped in a small section header "Flora" (`typeScale.h3` Fraunces) to keep the section legible. Place it after `JournalSection` (the bottom of the scroll view).

## Implementation

### Packages

No new packages. Everything `008` needs is already in `package.json`: `@supabase/supabase-js` (auth + tables), `expo-image` (Flora art + plant thumbnails), `react-native-reanimated` v4 (typing indicator, bubbles), `@expo/vector-icons` (leaf glyph + icons). `fetch` is global; no axios. The migration's `gen-types` uses the already-wired `npm run gen-types` script.

The only new "configuration" is the `EXPO_PUBLIC_BROTE_AGENT_URL` env var, already added to `.env.example` in this feature's parent commit. `EXPO_PUBLIC_BROTE_AGENT_MOCK` is an optional dev override (`"1"` forces the mock even when a URL is set).

### Files (new)

```
supabase/migrations/<timestamp>_create_ai_conversations_and_messages.sql  # both tables + RLS + indexes + trigger
src/lib/supabase/ai-conversations.ts                                      # typed CRUD + ConversationWithPlant join
src/lib/supabase/ai-messages.ts                                           # typed fetch + create (immutable)
src/lib/agent/client.ts                                                   # AgentClient interface, createAgentClient, AgentError, PlantContext, AgentChatInput
src/lib/agent/mock.ts                                                     # MockAgentClient (canned replies + delay)
src/lib/agent/context.ts                                                  # buildPlantContext (plant + 10 entries + schedule)
src/lib/agent/index.ts                                                    # getAgent() composition root (mock vs real)
src/components/FloraAvatar.tsx                                            # watercolor PNGs by mood via expo-image
src/components/ChatMessageBubble.tsx                                      # assistant/user bubbles
src/components/FloraTypingIndicator.tsx                                    # three sage leaves (Reanimated)
src/components/ChatContextHeader.tsx                                      # plant context header
src/components/ChatInput.tsx                                             # input + send + char counter + error line
src/app/(app)/chat/index.tsx                                              # conversation list
src/app/(app)/chat/new.tsx                                                # new-conversation composer (plantId optional)
src/app/(app)/chat/[id].tsx                                               # persisted conversation
```

### Files (modified)

```
src/components/Illustration.tsx                          # name === "flora" → <FloraAvatar idle>
src/app/(app)/_layout.tsx                                # register chat, chat/new, chat/[id] screens
src/app/(app)/index.tsx                                  # "Hablar con Flora" → router.push("/chat")
src/app/(app)/plants/[id]/index.tsx                      # bottom EmptyState → "Consultar a Flora" button → /chat/new?plantId=
src/lib/supabase/database.types.ts                       # regenerated via `npm run gen-types`
.env.example                                             # EXPO_PUBLIC_BROTE_AGENT_URL + (optional) EXPO_PUBLIC_BROTE_AGENT_MOCK notes
```

### Migrations

One: `supabase/migrations/<timestamp>_create_ai_conversations_and_messages.sql` (both tables, RLS ×8, indexes ×2, `ai_conversations_set_updated_at` trigger). Followed by `npm run gen-types`.

## Decisions

1. **`AgentClient` interface over `fetch` everywhere.** Every screen and component depends on `AgentClient`, never `fetch` directly. The mock and the real client share the interface; a single `getAgent()` in `src/lib/agent/index.ts` chooses between them. This is what lets the UI ship before brote-agent is live and lets the swap be a one-line change when the agent is ready. The contract extension (`{ message, context? }`) is documented in the type and sent by the app; the agent ignores fields it doesn't understand yet.

2. **Context is sent as an optional body field, not a separate endpoint.** The agent contract is `POST /chat { message }`. We extend the body to `{ message, context? }` — backward-compatible JSON, where the agent treats an absent `context` as a general chat (no plant). A separate `/chat-with-context` endpoint would fragment the contract; embedding in `message` as a system prompt would couple the app to agent prompt engineering. Keeping `context` as a structured field lets the agent adopt it without changing the URL or breaking the strict-contract callers (other clients of brote-agent that send `message` only).

3. **No denormalized "last message" column on `ai_conversations`.** The chat list preview in V0.3 is a second per-conversation fetch (the newest `ai_messages` row) rather than a `last_message_*` column kept current via triggers. Avoids a denormalization that V0.4+ (inventory, etc.) would have to maintain. Adopted because the typical user has few conversations; denormalizing is cheap but premature. If list scrolling shows a perf issue at >50 conversations, a partial index + `last value` view is a non-migration fix.

4. **Title = truncated first user message, no model-summarization.** The agent is stateless and lives server-side; asking it to title a conversation adds a round trip and a new contract concern. V0.3 derives `title` on the first successful user→assistant exchange from the user's own message (first 30 chars + ellipsis if longer) and writes it once. It's honest, predictable, and reviewable. Model-summarized titles are deferred to `010`-ish polish.

5. **`Authorization: Bearer <supabase-jwt>` as the agent auth boundary.** The hard-limit in `tech-stack.md` is "no AI keys in the bundle." The Supabase session JWT already lives client-side (session is non-null inside `(app)`), so using it as the bearer token to brote-agent is free of new secrets in the bundle and gives the agent a real, verifiable identity (it can query Supabase as the user if it ever needs to). Agent-side verification against Supabase JWKS is the agent's responsibility; the app just sends the header and trusts the agent's `200`/`401`. The alt (a static shared secret as `EXPO_PUBLIC_BROTE_AGENT_KEY`) is rejected because `EXPO_PUBLIC_*` lands in the bundle — visible to anyone who unzips the app — and reverses the hard-limit.

6. **Mock is a peer citizen, not a test artifact.** `MockAgentClient` ships in `src/lib/agent/mock.ts`, not `src/lib/agent/__mocks__/`. It's how the feature ships: when brote-agent isn't reachable (no `EXPO_PUBLIC_BROTE_AGENT_URL`), the app still demos the entire chat loop end-to-end against canned replies. Marketing, demos, screenshots, and offline-first QA all rely on it. The `EXPO_PUBLIC_BROTE_AGENT_MOCK=1` override lets a developer force the mock even when a URL is set, so CI/dev can verify the mock path without environment churn.

7. **`FloraAvatar` moods are pre-wired for `010`.** V0.3 only uses `idle` (welcome) and `confused` (error). The `rainy` (watering-related advice) and `hot` (light/heat advice) moods are wired now so `010` can adopt them by passing a different `mood` — no asset hunt, no component rewrite. The four PNGs already exist; not wiring their moods now would mean rediscovering the mapping under `010` deadlines.

8. **Immutable messages, no edit/delete UI in V0.3.** `ai_messages` has no `updated_at` and RLS includes `update`/`delete` policies only for completeness (FK cascade cleanup if a conversation is deleted). V0.3 has no edit/delete buttons. Conversation memory is part of Flora's promise — "she knows the complete history" — and surgically editing chat history is a rare need that doesn't belong in the foundation. Renaming/deleting conversations is a `013` cleanup flow concern.

9. **`PlantContext` is data-only, Spanish-free.** The context builder ships data (`plant.name`, `journal.type`, etc.), not Spanish prose. The mission says conversations are in Spanish, but the system prompt that turns data into Flora's voice lives server-side in brote-agent (per the V0.3 intro). Keeping `PlantContext` data-only means the agent can re-localize, re-prompt, or feed a different model without an app update. The app's responsibility is "what the agent needs to know," not "how the agent says it."

10. **"Hablar con Flora" routes to the *list*, "Consultar a Flora" routes to a *new plant-rooted chat*.** The home button opens `/chat` — the entry to the whole Flora surface, including resuming a previous thread. The plant-detail button opens `/chat/new?plantId=…` — a direct plant-rooted start. Two mental models, two verbs, one routing model. We deliberately don't auto-pick "open the most recent plant-rooted conversation" because the user may want a fresh one today.

## Risks

- **Agent contract drift.** brote-agent is in progress. If it changes `/chat` (renames `reply`, adds a required field, switches to streaming), `008`'s typed client breaks. Mitigations: the client is the only place that parses the body, so a change is one-file; the mock isolates the UI from contract churn; and `EXPO_PUBLIC_BROTE_AGENT_MOCK=1` lets dev continue while the agent re-stabilizes. A `getHealth()` call on `/chat` open is a soft, non-blocking liveness probe.
- **`VALIDATION_ERROR` overlap with our client-side validation.** We pre-validate length (1–2000) before the fetch; if the agent returns `VALIDATION_ERROR` for a different reason (e.g. forbidden content), the user sees the same Spanish message class. Acceptable for V0.3 — the message "Flora no pudo responder eso" is honest; better than surfacing the raw `code`.
- **Supabase JWT expiry mid-conversation.** `session.access_token` is short-lived. `@supabase/supabase-js` auto-refreshes on focus, but a long-idle `/chat/[id]` could see the token expire. Mitigation: `useAuth()` re-exposes the session on refresh; the send flow reads `session?.access_token` *per send* (not at mount), so a refreshed token is picked up. If `postChat` returns 401, it surfaces as `AgentError("NETWORK", "Tu sesión expiró. Vuelve a entrar.")` — defensive and rare.
- **RLS performance via `EXISTS` policies on `ai_messages`.** Each policy runs a correlated subquery; for a single conversation thread (tens to low hundreds of rows) this is negligible, but a benchmark at >1000 messages/conversation could matter. Indexed `conversation_id` on both tables makes the `EXISTS` an index probe. If a hot-path ever shows, a materialized `ai_messages.user_id` + plain owner policy is a non-disruptive swap.
- **`gen-types` drift.** The migration + `npm run gen-types` must land in the same PR or `AIConversation`/`ConversationMessage` types won't resolve under strict mode. `database.types.ts` is listed under modified files as a reminder (same discipline as `006`).
- **Flora art size.** The four watercolor PNGs are ~1.6–2.3 MB each. `expo-image` caches and downsamples, so memory shouldn't spike, but `FloraAvatar` should be the only place these are `require`d (single import site per mood via the map in the component), avoiding duplicate load. If app-binary size becomes a concern, a resize pass on the source assets is a later chore.
- **Mock reply realism.** Canned mocks are static; if QA/demo users mistake the canned "Mmh, déjame pensar…" for a real Gemini reply, the demo impression depends on machismo of whoever wrote the mock list. Mitigation: the mock line is plainly pattern-matched on keywords (`"regar"`, `"luz"`, etc.) in `pickReply`, so a demo query about a Pothos gets a calmer Pothos-ish reply than the truly random default. It's still patently canned; we don't want testers filing Gemini-quality bugs against a mock.
- **`typedRoutes` regeneration.** `app.json` has `experiments.typedRoutes: true`. Adding `chat/index`, `chat/new`, `chat/[id]` regenerates the route map on next dev build; if a build-time type error appears, it's typically a stale `.expo/types` cache — a `rm -rf .expo/types` resolves it. Listed here as a known-quirk reminder.
- **Plant-detail "Consultar a Flora" button placement.** Putting it at the bottom of the long plant detail scroll (after `JournalSection`) means it's not above-the-fold. Acceptable: the *primary* Flora entry is the home card (top-level surface). The plant-detail button is the "ask about *this* plant" intent — bottom-of-page placement reads as continuation, not interruption. If we find users rarely scroll there, a thin sticky-action bar is a later enhancement — not a foundation call.

## Verification

- `/chat` empty state renders `FloraAvatar idle` + "Aún no has hablado con Flora" + "Empezar a hablar" → navigates to `/chat/new`.
- `/chat/new`: typing "Hola" + send → `ai_conversations` row is created locally and on the server (RLS: only owner) → `router.replace` to `/chat/[id]` → the user message renders, the typing indicator plays, and an assistant message appears + persists (visible on re-open).
- General chat from home "Hablar con Flora" → `/chat`; the new conversation shows in the list with `title` = the first 30 chars of "Hola" and a `FloraAvatar idle` thumbnail (no plant thumbnail).
- Plant-rooted chat: from plant detail "Consultar a Flora" → `/chat/new?plantId=…` renders the `ChatContextHeader` with "Hablando sobre {name}" + thumbnail; sending persists; the conversation appears in `/chat` with the plant thumbnail (not Flora).
- Conversation resume: re-open a conversation from `/chat` → messages load in chronological order, the input bar is ready, sending again appends correctly.
- Title falls back: a conversation whose first user message is "¿Cuándo riego mi Monstera deliciosa que está en la ventana?" gets `title = "¿Cuándo riego mi Monstera delic"` (trailing ellipsis) after the first assistant reply.
- Agent error inline: with `EXPO_PUBLIC_BROTE_AGENT_URL` set to a bad URL, sending a message shows the typing indicator briefly, then renders the calm Spanish "Flora no pudo responder ahora. Inténtalo de nuevo." above the input; the user's persisted message stays visible; tapping send again retries.
- Mock path: with `EXPO_PUBLIC_BROTE_AGENT_MOCK=1` and a live URL, the same loop runs against canned replies — confirming the seam works both ways.
- `getHealth()` is non-blocking: `/chat` opens even if a `/health` ping is in flight or failing; the agent client never blocks the chat surface.
- RLS: a second user's client cannot read/update another user's `ai_conversations` or `ai_messages` (the `EXISTS` policies gate every row).
- Visual: every chat surface is warm-white `#F8F6F2`, brown-black `#3F3A36` text, sage primary, no pure black/white, no emoji icons, Fraunces titles + Inter body, radii ≥ 16, soft shadows, typing indicator ≈ 450ms ease-in-out.
- `npm run lint` passes (0 errors). `npx tsc --noEmit` passes under strict (regenerated `database.types.ts` + the agent types resolve).