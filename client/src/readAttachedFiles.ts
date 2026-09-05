/**
 * Reads user-selected files into plain-text chunks for the model.
 * Large files are truncated to keep requests within reasonable limits.
 */

const MAX_CHARS_PER_FILE = 120_000

const TEXT_LIKE_EXT = new Set([
  '.txt',
  '.md',
  '.json',
  '.csv',
  '.xml',
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.yml',
  '.yaml',
  '.toml',
  '.ini',
  '.log',
  '.sql',
  '.sh',
  '.bat',
  '.env',
  '.cs',
  '.cpp',
  '.c',
  '.h',
  '.vue',
  '.svelte',
])

const MAX_BYTES_TRY_READ = 2 * 1024 * 1024

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function looksPrintableUtf8(sample: string): boolean {
  if (sample.length === 0) return true
  for (let i = 0; i < Math.min(sample.length, 8000); i += 1) {
    const c = sample.charCodeAt(i)
    if (c === 9 || c === 10 || c === 13) continue
    if (c >= 32 && c !== 127) continue
    return false
  }
  return true
}

export interface AttachmentPayload {
  name: string
  content: string
}

export async function readFilesAsAttachments(files: FileList | File[]): Promise<AttachmentPayload[]> {
  const list = Array.from(files as File[])
  const out: AttachmentPayload[] = []

  for (const file of list) {
    if (file.size > MAX_BYTES_TRY_READ) {
      out.push({
        name: file.name,
        content: `[File skipped: larger than ${MAX_BYTES_TRY_READ / (1024 * 1024)} MB. Split or paste excerpts.]`,
      })
      continue
    }

    const ext = extensionOf(file.name)
    const mime = file.type

    if (mime.startsWith('image/')) {
      out.push({
        name: file.name,
        content: `[Image (${mime}). This demo sends text only. Describe the image in your message or use a vision-enabled model outside this app.]`,
      })
      continue
    }

    if (mime === 'application/pdf' || ext === '.pdf') {
      out.push({
        name: file.name,
        content:
          '[PDF not parsed in the browser. Copy text from the PDF, export to .txt, or paste the relevant pages here.]',
      })
      continue
    }

    const treatAsText =
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/javascript' ||
      mime === 'application/xml' ||
      TEXT_LIKE_EXT.has(ext) ||
      ext === ''

    if (!treatAsText) {
      try {
        const buf = await file.text()
        if (!looksPrintableUtf8(buf.slice(0, 4000))) {
          out.push({
            name: file.name,
            content: '[Binary file: open as text is not safe or not UTF-8. Convert to .txt or paste content.]',
          })
          continue
        }
        const clipped =
          buf.length > MAX_CHARS_PER_FILE
            ? `${buf.slice(0, MAX_CHARS_PER_FILE)}\n\n[...truncated...]`
            : buf
        out.push({ name: file.name, content: clipped })
      } catch {
        out.push({ name: file.name, content: '[Could not read this file.]' })
      }
      continue
    }

    try {
      let text = await file.text()
      if (!looksPrintableUtf8(text.slice(0, 4000))) {
        out.push({
          name: file.name,
          content: '[File does not look like plain UTF-8 text.]',
        })
        continue
      }
      if (text.length > MAX_CHARS_PER_FILE) {
        text = `${text.slice(0, MAX_CHARS_PER_FILE)}\n\n[...truncated...]`
      }
      out.push({ name: file.name, content: text })
    } catch {
      out.push({ name: file.name, content: '[Could not read this file.]' })
    }
  }

  return out
}

export function attachmentsToPromptBlock(userText: string, parts: AttachmentPayload[]): string {
  const lines: string[] = []
  const t = userText.trim()
  if (t) lines.push(t)
  if (!parts.length) return lines.join('\n')

  lines.push('')
  lines.push('--- Attached files (read and use this content when answering) ---')
  for (const p of parts) {
    lines.push('')
    lines.push(`### ${p.name}`)
    lines.push(p.content)
  }
  return lines.join('\n')
}
