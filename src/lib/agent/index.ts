import { createAgentClient } from "./client";
import { MockAgentClient } from "./mock";
import type { AgentClient } from "./client";

let _agent: AgentClient | null = null;

export function getAgent(): AgentClient {
  if (_agent) return _agent;

  const url = process.env.EXPO_PUBLIC_BROTE_AGENT_URL;
  const forceMock = process.env.EXPO_PUBLIC_BROTE_AGENT_MOCK === "1";

  if (!url || forceMock) {
    _agent = new MockAgentClient();
  } else {
    _agent = createAgentClient({ baseUrl: url });
  }

  return _agent;
}

export function resetAgent(): void {
  _agent = null;
}

export { AgentError } from "./client";
export { MockAgentClient } from "./mock";
export type { AgentClient, AgentChatInput } from "./client";
