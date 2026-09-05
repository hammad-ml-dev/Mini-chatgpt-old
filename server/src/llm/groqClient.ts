import type { ChatMessage } from "../types.js";
import type { LlmClient, LlmCompletionParams } from "./LlmClient.js";

/**
 * Groq OpenAI-compatible chat completions (fast inference, free tier with limits).
 * https://console.groq.com/docs/quickstart
 */
export class GroqClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string
  ) {}

  async complete(params: LlmCompletionParams): Promise<string> {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const model = params.model ?? this.defaultModel;
    const body = {
      model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Groq error ${res.status}: ${text || res.statusText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty response.");
    }
    return content;
  }
}
