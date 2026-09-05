import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeProvider, type LlmEnv } from "./llm/createLlmClient.js";
import { resolveLlmClient } from "./llm/llmRouter.js";
import { resolveSystemPrompt } from "./llm/systemPrompts.js";
import { analyzeText } from "./mlClient.js";
import { loadThreads, newThreadId, saveThreads } from "./storage/threadStore.js";
import type { ChatMessage, ChatRequestBody, Thread } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from server cwd first, then project root one level up (monorepo).
dotenv.config();
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const PORT = Number(process.env.NODE_PORT || process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

/** Allow local dev and typical LAN IPs (e.g. phone testing on same Wi‑Fi). */
function isAllowedDevOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin))
    return true;
  return false;
}

function readEnv(): LlmEnv {
  const provider = normalizeProvider(process.env.LLM_PROVIDER);
  return {
    LLM_PROVIDER: provider,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || "llama3.2",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || "",
    HUGGINGFACE_MODEL:
      process.env.HUGGINGFACE_MODEL ||
      "meta-llama/Meta-Llama-3.1-8B-Instruct",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_BASE_URL:
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  };
}

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === CLIENT_ORIGIN || isAllowedDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  const env = readEnv();
  res.json({
    ok: true,
    provider: env.LLM_PROVIDER,
    backends: {
      ollama: { baseUrl: env.OLLAMA_BASE_URL, defaultModel: env.OLLAMA_MODEL },
      groq: { configured: Boolean(env.GROQ_API_KEY), defaultModel: env.GROQ_MODEL },
      huggingface: {
        hasToken: Boolean(env.HUGGINGFACE_API_KEY),
        defaultModel: env.HUGGINGFACE_MODEL,
      },
      openai: {
        configured: Boolean(env.OPENAI_API_KEY),
        defaultModel: env.OPENAI_MODEL,
        baseUrl: env.OPENAI_BASE_URL,
      },
    },
  });
});

app.get("/api/threads", async (_req, res) => {
  try {
    const threads = await loadThreads();
    res.json({ threads });
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to load threads",
    });
  }
});

app.post("/api/threads", async (req, res) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title : "New thread";
    const threads = await loadThreads();
    const now = new Date().toISOString();
    const thread: Thread = {
      id: newThreadId(),
      title: title.slice(0, 120),
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    threads.unshift(thread);
    await saveThreads(threads);
    res.status(201).json(thread);
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to create thread",
    });
  }
});

app.patch("/api/threads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const title =
      typeof req.body?.title === "string" ? req.body.title.slice(0, 120) : null;
    const threads = await loadThreads();
    const idx = threads.findIndex((t) => t.id === id);
    if (idx === -1) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }
    if (title) {
      threads[idx].title = title;
      threads[idx].updatedAt = new Date().toISOString();
    }
    await saveThreads(threads);
    res.json(threads[idx]);
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to update thread",
    });
  }
});

app.delete("/api/threads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const threads = await loadThreads();
    const next = threads.filter((t) => t.id !== id);
    await saveThreads(next);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({
      error: e instanceof Error ? e.message : "Failed to delete thread",
    });
  }
});

function mergeSystemMessage(
  messages: ChatMessage[],
  system: ReturnType<typeof resolveSystemPrompt>
): ChatMessage[] {
  if (!system) return messages;
  const rest = messages.filter((m) => m.role !== "system");
  return [system, ...rest];
}

app.post("/api/chat", async (req, res) => {
  const body = req.body as ChatRequestBody;
  try {
    if (!body?.messages?.length) {
      res.status(400).json({ error: "messages required" });
      return;
    }

    const system = resolveSystemPrompt(
      body.systemPromptKey,
      body.useCitationHints
    );
    const outbound = mergeSystemMessage(body.messages, system);

    let mlMeta = null;
    const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
    if (body.useCitationHints && lastUser?.content) {
      const snippet = lastUser.content.slice(0, 12000);
      mlMeta = await analyzeText(ML_SERVICE_URL, snippet);
    }

    const env = readEnv();
    const llm = resolveLlmClient(env, body.model);
    const text = await llm.complete({
      messages: outbound,
      model: body.model,
      temperature: body.temperature,
    });

    const assistantMessage: ChatMessage = { role: "assistant", content: text };

    if (body.threadId) {
      const threads = await loadThreads();
      const idx = threads.findIndex((t) => t.id === body.threadId);
      if (idx !== -1) {
        const nextMessages = [...body.messages, assistantMessage];
        threads[idx].messages = nextMessages;
        threads[idx].updatedAt = new Date().toISOString();
        const firstUser = nextMessages.find((m) => m.role === "user");
        if (firstUser && threads[idx].title === "New thread") {
          threads[idx].title = firstUser.content.slice(0, 80).trim() || threads[idx].title;
        }
        await saveThreads(threads);
      }
    }

    res.json({
      reply: text,
      ml: mlMeta,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    res.status(502).json({ error: message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://127.0.0.1:${PORT} (all interfaces)`);
});
