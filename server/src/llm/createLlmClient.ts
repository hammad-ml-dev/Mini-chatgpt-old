import { GroqClient } from "./groqClient.js";
import { HuggingFaceClient } from "./huggingfaceClient.js";
import { OllamaClient } from "./ollamaClient.js";
import type { LlmClient } from "./LlmClient.js";

export type ProviderName = "ollama" | "groq" | "huggingface";

export interface LlmEnv {
  LLM_PROVIDER: ProviderName;
  OLLAMA_BASE_URL: string;
  OLLAMA_MODEL: string;
  GROQ_API_KEY: string;
  GROQ_MODEL: string;
  HUGGINGFACE_API_KEY: string;
  HUGGINGFACE_MODEL: string;
  /** OpenAI or OpenAI-compatible (paid) — enables GPT models in the UI */
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
  OPENAI_MODEL: string;
}

export function normalizeProvider(value: string | undefined): ProviderName {
  const v = (value || "ollama").toLowerCase();
  if (v === "groq" || v === "huggingface" || v === "ollama") {
    return v;
  }
  return "ollama";
}

export function createLlmClient(env: LlmEnv): LlmClient {
  switch (normalizeProvider(env.LLM_PROVIDER)) {
    case "groq": {
      if (!env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is required when LLM_PROVIDER=groq.");
      }
      return new GroqClient(env.GROQ_API_KEY, env.GROQ_MODEL);
    }
    case "huggingface":
      return new HuggingFaceClient(
        env.HUGGINGFACE_API_KEY || undefined,
        env.HUGGINGFACE_MODEL
      );
    case "ollama":
    default:
      return new OllamaClient(env.OLLAMA_BASE_URL, env.OLLAMA_MODEL);
  }
}
