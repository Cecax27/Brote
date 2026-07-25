import type { AgentClient, AgentChatInput } from "./client";

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

export class MockAgentClient implements AgentClient {
  private delayMs: number;

  constructor(opts: { delayMs?: number } = {}) {
    this.delayMs = opts.delayMs ?? 700;
  }

  async getHealth(): Promise<{ status: "ok" }> {
    return { status: "ok" };
  }

  async postChat(input: AgentChatInput): Promise<string> {
    await wait(this.delayMs);
    return pickReply(input);
  }
}
