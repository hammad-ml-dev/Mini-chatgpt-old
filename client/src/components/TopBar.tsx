import type { ModelOption } from '../types'

interface TopBarProps {
  appName?: string
  models: ModelOption[]
  modelId: string
  onModelChange: (id: string) => void
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function TopBar({ appName = 'Mini ChatGPT', models, modelId, onModelChange }: TopBarProps) {
  const current = models.find((m) => m.id === modelId)?.label ?? modelId

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <span className="top-bar-brand" title={appName}>
          {appName}
        </span>
        <label className="model-select-wrap">
          <span className="visually-hidden">Model</span>
          <select
            className="model-select"
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
            aria-label="Choose model"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="model-select-ui">
            {current}
            <IconChevron />
          </span>
        </label>
      </div>
    </header>
  )
}
