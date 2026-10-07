/** Fills {{name}} with the visitor's first name; with no known name the token and its leading space are dropped ("Hi {{name}} 👋" -> "Hi 👋"). */
export function personalize(text: string, visitorName?: string | null): string {
  const first = (visitorName ?? '').trim().split(/\s+/)[0] ?? ''
  return text.replace(/\s*\{\{\s*name\s*\}\}/gi, (m) => (first ? m.replace(/\{\{\s*name\s*\}\}/i, first) : ''))
}
