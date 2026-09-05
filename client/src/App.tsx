import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createThread, deleteThread, fetchThreads, sendChat } from './api'
import { Composer } from './components/Composer'
import { MessageList } from './components/MessageList'
import { OrbHero } from './components/OrbHero'
import { Sidebar, type ThemeMode } from './components/Sidebar'
import { SuggestionCards } from './components/SuggestionCards'
import { TopBar } from './components/TopBar'
import { attachmentsToPromptBlock, readFilesAsAttachments, type AttachmentPayload } from './readAttachedFiles'
import type { ChatMessage, ModelOption, SystemPromptKey, Thread } from './types'
import './App.css'

const MODELS: ModelOption[] = [
  { id: 'demo', label: 'Demo mode (no API key)' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (OpenAI, paid — ChatGPT-class)' },
  { id: 'gpt-4o', label: 'GPT-4o (OpenAI, paid)' },
  { id: 'llama3.2', label: 'Llama 3.2 (local Ollama, free)' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq, free tier)' },
  { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Meta Llama 3.1 8B (Hugging Face)' },
]

const THEME_KEY = 'mini-chatgpt-theme'
const STARRED_KEY = 'mini-chatgpt-starred'

function loadStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(STARRED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function saveStarred(ids: Set<string>) {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]))
}

function loadTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function App() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [modelId, setModelId] = useState(
    () => MODELS.find((m) => m.id === 'demo')?.id ?? MODELS[0].id
  )
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([])
  const [writingStyle, setWritingStyle] = useState<SystemPromptKey>('default')
  const [citationOn, setCitationOn] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMl, setLastMl] = useState<{
    language: string | null
    keywords: string[]
    word_count: number
    char_count: number
  } | null>(null)
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme())
  const [starredIds, setStarredIds] = useState<Set<string>>(() => loadStarred())
  const [starredOnly, setStarredOnly] = useState(false)

  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const refreshThreads = useCallback(async () => {
    const list = await fetchThreads()
    setThreads(list)
    return list
  }, [])

  useEffect(() => {
    refreshThreads().catch(() => {
      setError(
        'Could not reach the API. Start the Node server on port 3001 and run `npm run dev` in the client folder (or set VITE_API_BASE_URL).'
      )
    })
  }, [refreshThreads])

  const filteredThreads = useMemo(() => {
    let list = threads
    if (starredOnly) list = list.filter((t) => starredIds.has(t.id))
    return list
  }, [threads, starredOnly, starredIds])

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  )

  const messages: ChatMessage[] = activeThread?.messages ?? []
  const showHero = messages.length === 0
  const showOrb = showHero && activeThreadId === null

  const onHome = () => {
    setActiveThreadId(null)
    setDraft('')
    setAttachments([])
    setLastMl(null)
    setError(null)
  }

  const onSelectThread = (id: string) => {
    setActiveThreadId(id)
    setLastMl(null)
    setError(null)
    taRef.current?.focus()
  }

  const onDeleteThread = async (id: string) => {
    try {
      await deleteThread(id)
      setStarredIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        saveStarred(next)
        return next
      })
      if (activeThreadId === id) {
        setActiveThreadId(null)
      }
      await refreshThreads()
    } catch {
      setError('Could not delete thread.')
    }
  }

  const onToggleThreadStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveStarred(next)
      return next
    })
  }

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    try {
      const parts = await readFilesAsAttachments(files)
      setAttachments((prev) => {
        const byName = new Map(prev.map((p) => [p.name, p]))
        for (const p of parts) byName.set(p.name, p)
        return [...byName.values()]
      })
    } catch {
      setError('Could not read one or more files.')
    }
  }

  const onSend = async () => {
    const userText = draft.trim()
    if ((!userText && !attachments.length) || busy) return

    const fullUserContent = attachmentsToPromptBlock(userText, attachments)

    setBusy(true)
    setError(null)

    try {
      let tid = activeThreadId
      if (!tid) {
        const t = await createThread('New thread')
        tid = t.id
        setThreads((prev) => [t, ...prev])
        setActiveThreadId(t.id)
      }

      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: fullUserContent }]
      const now = new Date().toISOString()
      const draftTitle =
        activeThread && activeThread.title === 'New thread'
          ? (userText || attachments[0]?.name || 'New thread').slice(0, 80).trim() ||
            'New thread'
          : null

      setDraft('')
      setAttachments([])
      setThreads((prev) =>
        prev.map((t) =>
          t.id === tid
            ? {
                ...t,
                title: draftTitle ?? t.title,
                messages: nextMessages,
                updatedAt: now,
              }
            : t
        )
      )

      const { reply, ml } = await sendChat({
        threadId: tid,
        messages: nextMessages,
        model: modelId,
        systemPromptKey: writingStyle,
        useCitationHints: citationOn,
      })

      const assistantMessage: ChatMessage = { role: 'assistant', content: reply }
      setLastMl(citationOn ? ml : null)

      setThreads((prev) =>
        prev.map((t) =>
          t.id === tid
            ? {
                ...t,
                messages: [...nextMessages, assistantMessage],
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      )

      await refreshThreads()
      taRef.current?.focus()
    } catch (e) {
      await refreshThreads()
      setError(e instanceof Error ? e.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  const onPickSuggestion = (t: string) => {
    setDraft(t)
    taRef.current?.focus()
  }

  return (
    <div className="app-shell">
      <Sidebar
        threads={filteredThreads}
        activeId={activeThreadId}
        isHomeActive={activeThreadId === null}
        onSelect={onSelectThread}
        onHome={onHome}
        onDeleteThread={onDeleteThread}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        starredIds={starredIds}
        onToggleThreadStar={onToggleThreadStar}
        starredOnly={starredOnly}
        onToggleStarredOnly={() => setStarredOnly((v) => !v)}
      />
      <div className="app-main">
        <TopBar appName="Mini ChatGPT" models={MODELS} modelId={modelId} onModelChange={setModelId} />
        <main className="workspace">
          {error ? (
            <div className="banner-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className={`workspace-inner${showOrb ? ' is-landing' : ''}`}>
            {showOrb ? <OrbHero visible /> : null}
            {messages.length > 0 ? <MessageList messages={messages} /> : null}
            {busy ? <div className="typing-hint">Thinking...</div> : null}

            {citationOn && lastMl ? (
              <aside className="ml-panel" aria-label="Text analysis">
                <div className="ml-panel-title">Analysis (local NLP)</div>
                <ul className="ml-panel-list">
                  <li>Language: {lastMl.language ?? 'unknown'}</li>
                  <li>Words: {lastMl.word_count}</li>
                  <li>Keywords: {lastMl.keywords.join(', ') || '(none)'}</li>
                </ul>
              </aside>
            ) : null}

            <Composer
              draft={draft}
              onDraftChange={setDraft}
              onSend={onSend}
              disabled={busy}
              writingStyle={writingStyle}
              onWritingStyleChange={setWritingStyle}
              citationOn={citationOn}
              onCitationToggle={() => setCitationOn((v) => !v)}
              textareaRef={taRef}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              onPickFiles={onPickFiles}
            />

            <SuggestionCards visible={showHero} onPick={onPickSuggestion} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
