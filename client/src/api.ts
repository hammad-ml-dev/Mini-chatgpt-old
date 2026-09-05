import type { ChatMessage, SystemPromptKey, Thread } from './types'

/**
 * Empty: use same-origin /api (Vite dev and preview proxy to Node).
 * Optional: VITE_API_BASE_URL=http://127.0.0.1:3001 when you do not use the proxy.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

/** Used when relative /api fails (proxy down) but Node may still be listening. */
const DIRECT_NODE = 'http://127.0.0.1:3001'

function primaryUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

function fallbackUrl(path: string): string | null {
  if (API_BASE) return null
  const p = path.startsWith('/') ? path : `/${path}`
  return `${DIRECT_NODE}${p}`
}

/**
 * Tries the primary URL (usually Vite → Node proxy), then direct Node if that was relative.
 * "Failed to fetch" at the network layer is retried once before surfacing.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const urls = [primaryUrl(path)]
  const fb = fallbackUrl(path)
  if (fb && fb !== urls[0]) urls.push(fb)

  const headers = new Headers(init?.headers)
  const method = (init?.method ?? 'GET').toUpperCase()
  if (init?.body != null && method !== 'GET' && method !== 'HEAD' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let lastError: unknown
  for (const url of urls) {
    try {
      return await fetch(url, { ...init, headers })
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

/** Call on load to verify the stack; does not throw. */
export async function checkApiHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await apiFetch('/api/health')
    if (!res.ok) {
      return { ok: false, message: `API responded with ${res.status}. Is the server the Mini ChatGPT API?` }
    }
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null
    if (data?.ok) {
      return { ok: true, message: 'API is reachable.' }
    }
    return { ok: false, message: 'Unexpected health response.' }
  } catch {
    return {
      ok: false,
      message: `Cannot reach the API on port 3001. In a separate terminal run: cd server && npm run dev. Then refresh this page. Open ${DIRECT_NODE}/api/health in a new tab to test.`,
    }
  }
}

async function handleResponse<T>(res: Response, fallback: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : fallback
    throw new Error(msg)
  }
  return data as T
}

function networkHelp(): string {
  return `Cannot connect to the API (port 3001). Step 1: Terminal → cd server → npm run dev. Step 2: Keep this tab on http://127.0.0.1:5173 or http://localhost:5173 (run npm run dev in client). Test: open ${DIRECT_NODE}/api/health`
}

export async function fetchThreads(): Promise<Thread[]> {
  let res: Response
  try {
    res = await apiFetch('/api/threads')
  } catch {
    throw new Error(networkHelp())
  }
  const data = await handleResponse<{ threads: Thread[] }>(res, 'Could not load threads.')
  return data.threads ?? []
}

export async function createThread(title?: string): Promise<Thread> {
  let res: Response
  try {
    res = await apiFetch('/api/threads', {
      method: 'POST',
      body: JSON.stringify({ title: title ?? 'New thread' }),
    })
  } catch {
    throw new Error(networkHelp())
  }
  return handleResponse<Thread>(res, 'Could not create thread.')
}

export async function deleteThread(id: string): Promise<void> {
  let res: Response
  try {
    res = await apiFetch(`/api/threads/${id}`, { method: 'DELETE' })
  } catch {
    throw new Error(networkHelp())
  }
  if (res.status === 204) return
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || 'Could not delete thread.')
  }
}

export interface ChatResponse {
  reply: string
  ml: {
    language: string | null
    keywords: string[]
    word_count: number
    char_count: number
  } | null
}

export async function sendChat(payload: {
  threadId?: string
  messages: ChatMessage[]
  model?: string
  systemPromptKey?: SystemPromptKey
  useCitationHints?: boolean
}): Promise<ChatResponse> {
  let res: Response
  try {
    res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error(networkHelp())
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    reply?: string
    ml?: ChatResponse['ml']
  }
  if (!res.ok) {
    throw new Error(data.error || 'Chat request failed.')
  }
  return {
    reply: data.reply ?? '',
    ml: data.ml ?? null,
  }
}
