import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../types'

interface MessageListProps {
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  const visible = messages.filter((m) => m.role !== 'system')

  if (visible.length === 0) return null

  return (
    <div className="message-list" role="log" aria-live="polite">
      {visible.map((m, i) => (
        <article
          key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
          className={`msg msg-${m.role}`}
        >
          <div className="msg-label">{m.role === 'user' ? 'You' : 'Assistant'}</div>
          <div className="msg-body">
            {m.role === 'assistant' ? (
              <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
            ) : (
              <p className="msg-plain">{m.content}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
