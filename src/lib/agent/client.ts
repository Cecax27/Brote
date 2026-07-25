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
  accessToken: string;
}

export interface AgentClient {
  getHealth(): Promise<{ status: "ok" }>;
  postChat(input: AgentChatInput): Promise<string>;
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

export function createAgentClient(
  options: AgentClientOptions = {},
): AgentClient {
  const baseUrl =
    options.baseUrl ?? process.env.EXPO_PUBLIC_BROTE_AGENT_URL!;
  const fetchFn = options.fetchImpl ?? fetch;

  return {
    async getHealth(): Promise<{ status: "ok" }> {
      try {
        const res = await fetchFn(`${baseUrl}/health`);
        if (!res.ok) {
          throw new AgentError(
            "NETWORK",
            DEFAULT_SPANISH_NETWORK_MESSAGE,
          );
        }
        const data = await res.json();
        return data;
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError("NETWORK", DEFAULT_SPANISH_NETWORK_MESSAGE);
      }
    },

    async postChat(input: AgentChatInput): Promise<string> {
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

      try {
        const res = await fetchFn(`${baseUrl}/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
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

        const data: { reply: string } = await res.json();
        return data.reply;
      } catch (err) {
        if (err instanceof AgentError) throw err;
        throw new AgentError("NETWORK", DEFAULT_SPANISH_NETWORK_MESSAGE);
      }
    },
  };
}
