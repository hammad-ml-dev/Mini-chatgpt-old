import { GroqClient } from "./groqClient.js";
import { HuggingFaceClient } from "./huggingfaceClient.js";
import { OpenAiCompatibleClient } from "./openaiCompatibleClient.js";
import { OllamaClient } from "./ollamaClient.js";
import { MockLlmClient } from "./mockClient.js";
import type { LlmClient } from "./LlmClient.js";
import type { LlmEnv } from "./createLlmClient.js";

type BackendKey = "ollama" | "groq" | "huggingface" | "openai" | "demo";

const cache: Partial<Record<BackendKey, LlmClient>> = {};

function isHuggingFaceModelId(model: string): boolean {
  return model.includes("/") && !model.startsWith("gpt-");
}

function isOpenAiStyleModel(model: string, env: LlmEnv): boolean {
  const m = model.trim();
  if (!m) return false;
  if (m === env.OPENAI_MODEL) return true;
  if (/^gpt-4/i.test(m) || /^gpt-3\.5/i.test(m) || /^gpt-5/i.test(m)) return true;
  if (/^o1/i.test(m) || /^o3/i.test(m) || /^o4/i.test(m)) return true;
  return false;
}

function isGroqModelId(model: string, env: LlmEnv): boolean {
  const m = model.trim();
  if (m === "llama-3.1-8b-instant") return true;
  if (m === env.GROQ_MODEL) return true;
  if (/^llama[-_]3[.-]1.*instant$/i.test(m)) return true;
  return false;
}

function getDemoClient(): LlmClient {
  if (!cache.demo) cache.demo = new MockLlmClient();
  return cache.demo;
}

export function resolveLlmClient(
  env: LlmEnv,
  requestModel: string | undefined
): LlmClient {
  const model = (requestModel ?? "").trim();

  if (!model || model === "demo" || model === "mock") {
    return getDemoClient();
  }

  if (isHuggingFaceModelId(model)) {
    if (!cache.huggingface) {
      cache.huggingface = new HuggingFaceClient(
        env.HUGGINGFACE_API_KEY || undefined,
        env.HUGGINGFACE_MODEL
      );
    }
    return cache.huggingface;
  }

  if (isOpenAiStyleModel(model, env)) {
    if (!env.OPENAI_API_KEY) {
      throw new Error(
        "This model uses the OpenAI API (paid). Add OPENAI_API_KEY to your .env file, restart the Node server, then try again — or choose Demo mode."
      );
    }
    if (!cache.openai) {
      cache.openai = new OpenAiCompatibleClient(
        env.OPENAI_API_KEY,
        env.OPENAI_BASE_URL,
        env.OPENAI_MODEL
      );
    }
    return cache.openai;
  }

  if (isGroqModelId(model, env)) {
    if (!env.GROQ_API_KEY) {
      throw new Error(
        "This model uses Groq. Add GROQ_API_KEY to your .env, restart the server, or choose Demo mode."
      );
    }
    if (!cache.groq) {
      cache.groq = new GroqClient(env.GROQ_API_KEY, env.GROQ_MODEL);
    }
    return cache.groq;
  }

  if (!cache.ollama) {
    cache.ollama = new OllamaClient(env.OLLAMA_BASE_URL, env.OLLAMA_MODEL);
  }
  return cache.ollama;
}
