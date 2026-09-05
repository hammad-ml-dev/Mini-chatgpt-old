import type { ChatMessage } from "../types.js";
import type { LlmClient, LlmCompletionParams } from "./LlmClient.js";

/**
 * Ollama exposes an OpenAI-compatible chat API at /api/chat.
 * Default base: http://127.0.0.1:11434 — no API key required.
 */
export class OllamaClient implements LlmClient {
  constructor(
    private readonly baseUrl: string,
    private readonly defaultModel: string
  ) {}

  async complete(params: LlmCompletionParams): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/chat`;
    const model = params.model ?? this.defaultModel;
    const body = {
      model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature: params.temperature ?? 0.7,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Ollama error ${res.status}: ${text || res.statusText}. Is Ollama running and is the model pulled?`
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) {
      throw new Error("Ollama returned an empty response.");
    }
    return content;
  }
}
