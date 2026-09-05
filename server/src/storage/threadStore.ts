import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Thread } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "threads.json");

interface PersistedShape {
  threads: Thread[];
}

async function ensureDataFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    const initial: PersistedShape = { threads: [] };
    await writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function loadThreads(): Promise<Thread[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw) as PersistedShape;
  return Array.isArray(parsed.threads) ? parsed.threads : [];
}

export async function saveThreads(threads: Thread[]): Promise<void> {
  await ensureDataFile();
  const payload: PersistedShape = { threads };
  await writeFile(DATA_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

export function newThreadId(): string {
  return `th_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
