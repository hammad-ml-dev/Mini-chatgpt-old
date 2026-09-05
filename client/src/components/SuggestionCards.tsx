interface SuggestionCardsProps {
  visible: boolean
  onPick: (text: string) => void
}

const EXAMPLES = [
  {
    icon: 'user',
    text: 'Write a to-do list for a personal project',
  },
  {
    icon: 'mail',
    text: 'Generate an email to reply to a job offer',
  },
  {
    icon: 'chat',
    text: 'Summarize this article in one paragraph',
  },
  {
    icon: 'code',
    text: 'How does AI work in a technical capacity',
  },
] as const

function CardIcon({ kind }: { kind: (typeof EXAMPLES)[number]['icon'] }) {
  if (kind === 'user') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M6 20v-1.5A4.5 4.5 0 0110.5 14h3A4.5 4.5 0 0118 18.5V20" />
      </svg>
    )
  }
  if (kind === 'mail') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M4 6h16v12H4V6z" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    )
  }
  if (kind === 'chat') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M6 4h12a2 2 0 012 2v9a2 2 0 01-2 2h-4l-4 4v-4H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M8 9l3 3-3 3M13 15h3" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  )
}

export function SuggestionCards({ visible, onPick }: SuggestionCardsProps) {
  if (!visible) return null

  return (
    <section className="suggestions" aria-label="Example prompts">
      <p className="suggestions-label">Get started with an example below</p>
      <div className="suggestions-grid">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.text}
            type="button"
            className="suggestion-card"
            onClick={() => onPick(ex.text)}
          >
            <span className="suggestion-card-icon">
              <CardIcon kind={ex.icon} />
            </span>
            <span className="suggestion-card-text">{ex.text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
