import type {
  AgentClient,
  AgentChatInput,
  ChatResponse,
  ConversationListItem,
  AgentMessage,
  CreateConversationInput,
  CreateConversationResponse,
  ExecuteActionInput,
  ExecuteActionResponse,
} from "./client";

const REPLIES: Record<string, string[]> = {
  riego: [
    "Toca el sustrato antes de regar. Si aún está húmedo, dale un par de días más.",
    "El riego depende de la temporada. En verano muchas plantas necesitan más, en invierno se espacia.",
  ],
  luz: [
    "Si las hojas se ponen amarillas, puede ser exceso de luz directa. Prueba un lugar más tamizado.",
    "Eso suena como falta de luz. Si puedes, muévela a un punto más luminoso, sin sol directo.",
  ],
  hojas: [
    "Las hojas caídas pueden ser por cambios bruscos de temperatura o por riego irregular.",
    "Si las puntas están marrones, revisa la humedad del ambiente. Un plato con piedras y agua ayuda.",
  ],
  plant: [
    "Voy a revisar el historial de esa planta para darte una respuesta más concreta.",
    "Déjame ver cómo ha estado tu planta las últimas semanas.",
  ],
  default: [
    "¡Hola! Soy Flora. Cuéntame, ¿cómo está tu planta?",
    "Cada planta es un mundo. Cuéntame un poco más sobre la tuya y te ayudo mejor.",
    "Qué bonito que quieras cuidar tus plantas. ¿De cuál me hablas?",
  ],
};

function pickReply(input: AgentChatInput): string {
  if (input.plant_id) {
    const list = REPLIES.plant;
    return list[Math.floor(Math.random() * list.length)];
  }

  const lower = input.message.toLowerCase();
  const keywords: (keyof typeof REPLIES)[] = ["riego", "luz", "hojas"];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      const list = REPLIES[kw];
      return list[Math.floor(Math.random() * list.length)];
    }
  }
  const list = REPLIES.default;
  return list[Math.floor(Math.random() * list.length)];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeId(): string {
  return `mock_${Math.random().toString(36).slice(2, 11)}`;
}

export class MockAgentClient implements AgentClient {
  private delayMs: number;
  private conversations: ConversationListItem[] = [];
  private messages: Record<string, AgentMessage[]> = {};

  constructor(opts: { delayMs?: number } = {}) {
    this.delayMs = opts.delayMs ?? 700;
  }

  async getHealth(): Promise<{ status: "ok" }> {
    return { status: "ok" };
  }

  async postChat(input: AgentChatInput): Promise<ChatResponse> {
    await wait(this.delayMs);

    const reply = pickReply(input);

    const userMsg: AgentMessage = {
      role: "user",
      content: input.message,
      created_at: new Date().toISOString(),
      photo_url: null,
    };

    const assistantMsg: AgentMessage = {
      role: "assistant",
      content: reply,
      created_at: new Date().toISOString(),
      photo_url: null,
    };

    if (input.conversation_id) {
      const conv = this.conversations.find(
        (c) => c.conversation_id === input.conversation_id,
      );
      if (!conv) {
        throw new Error("Conversation not found in mock state");
      }
      conv.updated_at = new Date().toISOString();
      this.messages[input.conversation_id] = [
        ...(this.messages[input.conversation_id] ?? []),
        userMsg,
        assistantMsg,
      ];
      return {
        conversation_id: input.conversation_id,
        reply,
        proposed_action: null,
        vision_request: null,
      };
    }

    const convId = makeId();
    const title =
      input.message.length > 30
        ? input.message.slice(0, 30) + "…"
        : input.message;

    this.conversations.unshift({
      conversation_id: convId,
      title,
      plant_id: input.plant_id ?? null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    this.messages[convId] = [userMsg, assistantMsg];

    return {
      conversation_id: convId,
      reply,
      proposed_action: null,
      vision_request: null,
    };
  }

  async fetchConversations(): Promise<ConversationListItem[]> {
    await wait(this.delayMs);
    return [...this.conversations];
  }

  async fetchMessages(conversationId: string): Promise<AgentMessage[]> {
    await wait(this.delayMs);
    return this.messages[conversationId] ?? [];
  }

  async createConversation(
    input: CreateConversationInput,
  ): Promise<CreateConversationResponse> {
    await wait(this.delayMs);
    const convId = makeId();
    this.conversations.unshift({
      conversation_id: convId,
      title: input.title ?? "Conversación con Flora",
      plant_id: input.plant_id ?? null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    this.messages[convId] = [];
    return { conversation_id: convId };
  }

  async executeAction(
    _input: ExecuteActionInput,
  ): Promise<ExecuteActionResponse> {
    await wait(this.delayMs);
    return {
      action_id: makeId(),
      action_type: _input.action_type,
      status: "executed",
    };
  }
}
