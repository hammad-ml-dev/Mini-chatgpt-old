import { useRef } from 'react'
import type { Thread } from '../types'

export type ThemeMode = 'light' | 'dark'

interface SidebarProps {
  threads: Thread[]
  activeId: string | null
  isHomeActive: boolean
  onSelect: (id: string) => void
  onHome: () => void
  onDeleteThread?: (id: string) => void
  theme: ThemeMode
  onToggleTheme: () => void
  starredIds: Set<string>
  onToggleThreadStar: (id: string) => void
  starredOnly: boolean
  onToggleStarredOnly: () => void
}

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v6l4 2" />
    </svg>
  )
}

function IconStarOutline() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 2.5l2.8 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.8 7.9 20.6l1.6-6.7-5.2-4.5 6.9-.6L12 2.5z" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 109.8 9.8z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

function IconStarSmall({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      {filled ? (
        <path fill="currentColor" d="M12 2.5l2.8 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.8 7.9 20.6l1.6-6.7-5.2-4.5 6.9-.6L12 2.5z" />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          d="M12 2.5l2.8 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.8 7.9 20.6l1.6-6.7-5.2-4.5 6.9-.6L12 2.5z"
        />
      )}
    </svg>
  )
}

export function Sidebar({
  threads,
  activeId,
  isHomeActive,
  onSelect,
  onHome,
  onDeleteThread,
  theme,
  onToggleTheme,
  starredIds,
  onToggleThreadStar,
  starredOnly,
  onToggleStarredOnly,
}: SidebarProps) {
  const threadListRef = useRef<HTMLDivElement | null>(null)

  const scrollThreadsIntoView = () => {
    threadListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    threadListRef.current?.focus({ preventScroll: true })
  }

  return (
    <aside className="app-sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <button
          type="button"
          className="sidebar-logo-btn"
          onClick={onHome}
          aria-label="Home — new landing view"
        >
          <div className="sidebar-logo" aria-hidden>
            <span className="sidebar-logo-inner" />
          </div>
        </button>
      </div>
      <nav className="sidebar-nav" aria-label="Shortcuts">
        <button
          type="button"
          className={`sidebar-icon-btn${isHomeActive ? ' is-active' : ''}`}
          onClick={onHome}
          aria-label="Home"
          aria-current={isHomeActive ? 'page' : undefined}
        >
          <IconHome />
        </button>
        <div className="sidebar-divider" />
        <button
          type="button"
          className="sidebar-icon-btn"
          onClick={scrollThreadsIntoView}
          aria-label="Jump to chat history"
        >
          <IconHistory />
        </button>
        <button
          type="button"
          className={`sidebar-icon-btn${starredOnly ? ' is-active' : ''}`}
          onClick={onToggleStarredOnly}
          aria-label={starredOnly ? 'Show all threads' : 'Show starred threads only'}
          aria-pressed={starredOnly ? 'true' : 'false'}
        >
          <IconStarOutline />
        </button>
      </nav>
      <div
        ref={threadListRef}
        className="sidebar-thread-list"
        role="list"
        id="sidebar-thread-list"
        tabIndex={-1}
      >
        {threads.length === 0 ? (
          <p className="sidebar-empty-hint">{starredOnly ? 'No starred threads.' : 'No threads yet.'}</p>
        ) : null}
        {threads.map((t) => (
          <div key={t.id} role="listitem" className="sidebar-thread-item-wrap">
            <button
              type="button"
              className={`sidebar-thread-star${starredIds.has(t.id) ? ' is-starred' : ''}`}
              aria-label={starredIds.has(t.id) ? 'Remove star' : 'Star thread'}
              onClick={(e) => {
                e.stopPropagation()
                onToggleThreadStar(t.id)
              }}
            >
              <IconStarSmall filled={starredIds.has(t.id)} />
            </button>
            <button
              type="button"
              className={`sidebar-thread-item${activeId === t.id ? ' is-active' : ''}`}
              onClick={() => onSelect(t.id)}
              title={t.title}
            >
              {t.title}
            </button>
            {onDeleteThread ? (
              <button
                type="button"
                className="sidebar-thread-delete"
                aria-label={`Delete ${t.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteThread(t.id)
                }}
              >
                x
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-avatar" aria-hidden>
          U
        </div>
        <button
          type="button"
          className="sidebar-icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </aside>
  )
}
