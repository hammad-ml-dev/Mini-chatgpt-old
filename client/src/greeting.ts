/**
 * Time-based salutation for the hero headline (local clock).
 */
export function greetingForNow(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function displayNameFromStorage(): string {
  try {
    const v = localStorage.getItem('mini-chatgpt-display-name')
    if (v && v.trim()) return v.trim()
  } catch {
    /* ignore */
  }
  return 'there'
}
