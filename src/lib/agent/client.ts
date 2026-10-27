export type AgentErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR"
  | "NETWORK";

export class AgentError extends Error {
  public readonly name = "AgentError";

  constructor(
    public readonly code: AgentErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface AgentChatInput {
  message: string;
  plant_id?: string | null;
  conversation_id?: string | null;
  accessToken: string;
}

export interface ProposedAction {
  action_type: "create_watering_schedule" | "add_journal_entry";
  plant_id: string;
  title: string;
  summary_es: string;
  payload: Record<string, unknown>;
  confirm_token: string;
}

export interface VisionRequest {
  reason_es: string;
  suggested_ref: {
    kind: "journal_entry" | "plant_latest";
    journal_entry_id?: string;
    plant_id?: string;
  };
}

export interface ChatResponse {
  conversation_id: string;
  reply: string;
  proposed_action: ProposedAction | null;
  vision_request: VisionRequest | null;
}

export interface ConversationListItem {
  conversation_id: string;
  title: string;
  plant_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  photo_url: string | null;
}

export interface ExecuteActionInput {
  action_type: "create_watering_schedule" | "add_journal_entry";
  plant_id: string;
  payload: Record<string, unknown>;
  confirm_token: string;
  accessToken: string;
}

export interface ExecuteActionResponse {
  action_id: string;
  action_type: string;
  status: "executed";
}

export interface CreateConversationInput {
  plant_id?: string | null;
  title?: string;
  accessToken: string;
}

export interface CreateConversationResponse {
  conversation_id: string;
}

export interface AgentClient {
  getHealth(): Promise<{ status: "ok" }>;
  postChat(input: AgentChatInput): Promise<ChatResponse>;
  fetchConversations(accessToken: string): Promise<ConversationListItem[]>;
  fetchMessages(
    conversationId: string,
    accessToken: string,
  ): Promise<AgentMessage[]>;
  createConversation(
    input: CreateConversationInput,
  ): Promise<CreateConversationResponse>;
  executeAction(input: ExecuteActionInput): Promise<ExecuteActionResponse>;
}

export interface AgentClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface AgentErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

function mapHttpToErrorCode(status: number): AgentErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 422:
      return "VALIDATION_ERROR";
    case 502:
      return "UPSTREAM_ERROR";
    case 500:
      return "INTERNAL_ERROR";
    default:
      return "NETWORK";
  }
}

const DEFAULT_SPANISH_NETWORK_MESSAGE =
  "Flora no pudo responder ahora. Inténtalo de nuevo.";

async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;

  const status = res.status;
  const code = mapHttpToErrorCode(status);

  let message = DEFAULT_SPANISH_NETWORK_MESSAGE;
  try {
    const errorBody: AgentErrorEnvelope = await res.json();
    if (errorBody?.error?.message) {
      message = errorBody.error.message;
    }
  } catch {
    // Unparseable body — use default
  }

  throw new AgentError(code, message);
}

export function createAgentClient(
  options: AgentClientOptions = {},
): AgentClient {
  const baseUrl =
    options.baseUrl ?? process.env.EXPO_PUBLIC_BROTE_AGENT_URL!;
  const fetchFn = options.fetchImpl ?? fetch;

  function authHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  return {
    async getHealth(): Promise<{ status: "ok" }> {
      try {
        const res = await fetchFn(`${baseUrl}/health`);
        await throwOnError(res);
        return await res.json();
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError(
          "NETWORK",
          DEFAULT_SPANISH_NETWORK_MESSAGE,
        );
      }
    },

    async postChat(input: AgentChatInput): Promise<ChatResponse> {
      const trimmed = input.message.trim();
      if (trimmed.length === 0 || trimmed.length > 2000) {
        throw new AgentError(
          "VALIDATION_ERROR",
          "Escribe un mensaje entre 1 y 2000 caracteres.",
        );
      }

      if (!input.accessToken) {
        throw new AgentError(
          "UNAUTHORIZED",
          "Inicia sesión para hablar con Flora.",
        );
      }

      const body: Record<string, unknown> = { message: trimmed };
      if (input.plant_id) {
        body.plant_id = input.plant_id;
      }
      if (input.conversation_id) {
        body.conversation_id = input.conversation_id;
      }

      try {
        const res = await fetchFn(`${baseUrl}/chat`, {
          method: "POST",
          headers: authHeaders(input.accessToken),
          body: JSON.stringify(body),
        });
        await throwOnError(res);
        return await res.json();
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError(
          "NETWORK",
          DEFAULT_SPANISH_NETWORK_MESSAGE,
        );
      }
    },

    async fetchConversations(
      accessToken: string,
    ): Promise<ConversationListItem[]> {
      if (!accessToken) {
        throw new AgentError(
          "UNAUTHORIZED",
          "Inicia sesión para ver tus conversaciones.",
        );
      }

      try {
        const res = await fetchFn(`${baseUrl}/conversations`, {
          headers: authHeaders(accessToken),
        });
        await throwOnError(res);
        const data: { conversations: ConversationListItem[] } =
          await res.json();
        return data.conversations;
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError(
          "NETWORK",
          DEFAULT_SPANISH_NETWORK_MESSAGE,
        );
      }
    },

    async fetchMessages(
      conversationId: string,
      accessToken: string,
    ): Promise<AgentMessage[]> {
      if (!accessToken) {
        throw new AgentError(
          "UNAUTHORIZED",
          "Inicia sesión para ver los mensajes.",
        );
      }

      try {
        const res = await fetchFn(
          `${baseUrl}/conversations/${encodeURIComponent(conversationId)}/messages`,
          {
            headers: authHeaders(accessToken),
          },
        );
        await throwOnError(res);
        const data: { conversation_id: string; messages: AgentMessage[] } =
          await res.json();
        return data.messages;
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError(
          "NETWORK",
          DEFAULT_SPANISH_NETWORK_MESSAGE,
        );
      }
    },

    async createConversation(
      input: CreateConversationInput,
    ): Promise<CreateConversationResponse> {
      if (!input.accessToken) {
        throw new AgentError(
          "UNAUTHORIZED",
          "Inicia sesión para crear una conversación.",
        );
      }

      const body: Record<string, unknown> = {};
      if (input.plant_id) body.plant_id = input.plant_id;
      if (input.title) body.title = input.title;

      try {
        const res = await fetchFn(`${baseUrl}/conversations`, {
          method: "POST",
          headers: authHeaders(input.accessToken),
          body: JSON.stringify(body),
        });
        await throwOnError(res);
        return await res.json();
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError(
          "NETWORK",
          DEFAULT_SPANISH_NETWORK_MESSAGE,
        );
      }
    },

    async executeAction(
      input: ExecuteActionInput,
    ): Promise<ExecuteActionResponse> {
      if (!input.accessToken) {
        throw new AgentError(
          "UNAUTHORIZED",
          "Inicia sesión para ejecutar esta acción.",
        );
      }

      const body: Record<string, unknown> = {
        action_type: input.action_type,
        plant_id: input.plant_id,
        payload: input.payload,
        confirm_token: input.confirm_token,
      };

      try {
        const res = await fetchFn(`${baseUrl}/actions/execute`, {
          method: "POST",
          headers: authHeaders(input.accessToken),
          body: JSON.stringify(body),
        });
        await throwOnError(res);
        return await res.json();
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError(
          "NETWORK",
          DEFAULT_SPANISH_NETWORK_MESSAGE,
        );
      }
    },
  };
}
