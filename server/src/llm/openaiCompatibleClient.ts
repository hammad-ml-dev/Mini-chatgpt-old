import type { LlmClient, LlmCompletionParams } from "./LlmClient.js";

/**
 * OpenAI Chat Completions API. Works with https://api.openai.com/v1 or any
 * compatible base URL (Azure OpenAI path-style, OpenRouter, etc. — set OPENAI_BASE_URL).
 */
export class OpenAiCompatibleClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly defaultModel: string
  ) {}

  async complete(params: LlmCompletionParams): Promise<string> {
    const root = this.baseUrl.replace(/\/$/, "");
    const url = `${root}/chat/completions`;
    const model = params.model ?? this.defaultModel;
    const body = {
      model,
      messages: params.messages as Array<{ role: string; content: string }>,
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
      throw new Error(
        `OpenAI-compatible API error ${res.status}: ${text?.slice(0, 500) || res.statusText}`
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };
    if (data.error?.message) {
      throw new Error(data.error.message);
    }
    const content = data.choices?.[0]?.message?.content;
    if (content == null || content === "") {
      throw new Error("OpenAI-compatible API returned an empty reply.");
    }
    return content;
  }
}
