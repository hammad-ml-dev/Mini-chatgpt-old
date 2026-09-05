import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

try {
  const t = localStorage.getItem('mini-chatgpt-theme')
  if (t === 'dark' || t === 'light') {
    document.documentElement.setAttribute('data-theme', t)
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
