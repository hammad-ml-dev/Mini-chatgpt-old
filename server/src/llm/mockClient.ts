import type { LlmClient, LlmCompletionParams } from "./LlmClient.js";

/** Offline portfolio demo — no API keys required. */
export class MockLlmClient implements LlmClient {
  async complete(params: LlmCompletionParams): Promise<string> {
    const lastUser = [...params.messages]
      .reverse()
      .find((m) => m.role === "user");
    const q = (lastUser?.content || "").trim();
    if (!q) {
      return "Send a message and I'll reply in demo mode (no API key needed).";
    }
    const lower = q.toLowerCase();
    if (
      lower.includes("code") ||
      lower.includes("typescript") ||
      lower.includes("python")
    ) {
      return (
        "**(Demo mode)** Here's a tiny example:\n\n" +
        "```ts\nexport function greet(name: string) {\n  return `Hello, ${name}!`;\n}\n```\n\n" +
        "Add `OPENAI_API_KEY` / `GROQ_API_KEY` or run Ollama for real model replies."
      );
    }
    if (lower.includes("hello") || lower.includes("hi")) {
      return "Hello! You're chatting with **Mini ChatGPT demo mode**. Pick another model in the dropdown once you configure a provider in `.env`.";
    }
    return (
      `**(Demo reply)** You said:\n\n> ${q.slice(0, 500)}\n\n` +
      "This backend is running without a cloud key. Configure OpenAI, Groq, Hugging Face, or Ollama in `.env` for live generation."
    );
  }
}
