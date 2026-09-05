import type { ChatMessage } from "../types.js";
import type { LlmClient, LlmCompletionParams } from "./LlmClient.js";

/**
 * Hugging Face Serverless Inference API (router).
 * Models and auth requirements change; token often improves rate limits.
 */
export class HuggingFaceClient implements LlmClient {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly defaultModel: string
  ) {}

  async complete(params: LlmCompletionParams): Promise<string> {
    const model = params.model ?? this.defaultModel;
    const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`;

    // Many chat models expect a conversational payload; HF varies by model.
    const prompt = this.messagesToPrompt(params.messages);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: params.temperature ?? 0.7,
          max_new_tokens: 1024,
          return_full_text: false,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `HuggingFace error ${res.status}: ${text || res.statusText}. Try another model or set HUGGINGFACE_API_KEY.`
      );
    }

    const data = (await res.json()) as unknown;
    return this.parseHfResponse(data);
  }

  private messagesToPrompt(messages: ChatMessage[]): string {
    return messages
      .map((m) => {
        const label =
          m.role === "system"
            ? "System"
            : m.role === "user"
              ? "User"
              : "Assistant";
        return `${label}: ${m.content}`;
      })
      .join("\n\n");
  }

  private parseHfResponse(data: unknown): string {
    if (typeof data === "string") {
      return data;
    }
    if (Array.isArray(data) && data[0] && typeof data[0] === "object") {
      const first = data[0] as { generated_text?: string };
      if (first.generated_text) return first.generated_text.trim();
    }
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (typeof obj.generated_text === "string") {
        return obj.generated_text.trim();
      }
      if (Array.isArray(obj.choices) && obj.choices[0]) {
        const c = obj.choices[0] as { text?: string; message?: { content?: string } };
        if (c.message?.content) return c.message.content;
        if (c.text) return c.text;
      }
    }
    throw new Error("Unexpected Hugging Face response shape.");
  }
}
