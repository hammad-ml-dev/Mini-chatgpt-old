import type { RefObject } from 'react'
import { useRef } from 'react'
import type { AttachmentPayload } from '../readAttachedFiles'
import type { SystemPromptKey } from '../types'

interface ComposerProps {
  draft: string
  onDraftChange: (v: string) => void
  onSend: () => void
  disabled: boolean
  writingStyle: SystemPromptKey
  onWritingStyleChange: (k: SystemPromptKey) => void
  citationOn: boolean
  onCitationToggle: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  attachments: AttachmentPayload[]
  onAttachmentsChange: (next: AttachmentPayload[]) => void
  onPickFiles: (files: FileList | null) => void
}

function IconPaperclip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a4.5 4.5 0 01-6.36-6.36l9.19-9.19a3 3 0 014.24 4.24l-8.85 8.85a1.5 1.5 0 01-2.12-2.12l7.78-7.78" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 19V6M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Composer({
  draft,
  onDraftChange,
  onSend,
  disabled,
  writingStyle,
  onWritingStyleChange,
  citationOn,
  onCitationToggle,
  textareaRef,
  attachments,
  onAttachmentsChange,
  onPickFiles,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canSend = Boolean(draft.trim() || attachments.length)

  return (
    <div className="composer-card">
      {attachments.length ? (
        <ul className="composer-attachments" aria-label="Attached files">
          {attachments.map((a, i) => (
            <li key={`${a.name}-${i}`} className="composer-attachment-chip">
              <span className="composer-attachment-name" title={a.name}>
                {a.name}
              </span>
              <button
                type="button"
                className="composer-attachment-remove"
                aria-label={`Remove ${a.name}`}
                onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={textareaRef}
        className="composer-input"
        placeholder="Ask AI a question or make a request..."
        rows={4}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (canSend && !disabled) onSend()
          }
          if (e.key === 'Escape') {
            onDraftChange('')
          }
        }}
        disabled={disabled}
        aria-label="Message"
      />
      <div className="composer-toolbar">
        <div className="composer-toolbar-left">
          <input
            ref={fileInputRef}
            type="file"
            className="composer-file-input"
            multiple
            aria-label="Attach files"
            onChange={(e) => {
              onPickFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            aria-label="Attach files"
            onClick={() => fileInputRef.current?.click()}
          >
            <IconPaperclip />
            <span>Attach</span>
          </button>
          <label className="styles-label">
            <span className="visually-hidden">Writing style</span>
            <select
              className="styles-select"
              value={writingStyle}
              onChange={(e) => onWritingStyleChange(e.target.value as SystemPromptKey)}
            >
              <option value="default">Writing style: Balanced</option>
              <option value="code">Writing style: Code</option>
              <option value="concise">Writing style: Concise</option>
            </select>
          </label>
        </div>
        <div className="composer-toolbar-right">
          <label className="citation-toggle">
            <span className="citation-label">Citation</span>
            <button
              type="button"
              role="switch"
              aria-checked={citationOn}
              className={`switch${citationOn ? ' is-on' : ''}`}
              onClick={onCitationToggle}
            >
              <span className="switch-thumb" />
            </button>
          </label>
          <button
            type="button"
            className="btn-send"
            onClick={() => canSend && onSend()}
            disabled={disabled || !canSend}
            aria-label="Send message"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  )
}
