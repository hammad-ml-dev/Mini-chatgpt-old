import type { ChatMessage } from "../types.js";

const PROMPTS: Record<string, string> = {
  default: `You are a helpful assistant. Answer clearly, cite uncertainty when needed, and follow the user's language.`,
  code: `You are an expert programming assistant. Give correct, runnable code when asked, explain briefly, and use markdown code fences with language tags.`,
  concise: `You are a helpful assistant. Keep answers short and structured unless the user asks for depth.`,
};

export function resolveSystemPrompt(
  key: string | undefined,
  useCitationHints: boolean | undefined
): ChatMessage | null {
  const base = PROMPTS[key ?? "default"] ?? PROMPTS.default;
  const citation =
    useCitationHints === true
      ? " When making factual claims, prefer phrasing like 'Typically...' or 'One common approach is...' rather than inventing exact citations."
      : "";
  const content = `${base}${citation}`;
  return { role: "system", content };
}
