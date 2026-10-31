/**
 * Deciding whether what was just heard is someone calling the agent: its name, or a greeting and its name ("hi Ted",
 * "hello Ted", "hey Ted"). Pure functions, so the rule can be tested without a phone or a microphone.
 */

/** Words that may come before the name. They are accepted, never required: the name alone wakes the agent. */
const GREETINGS = ['hi', 'hey', 'hello', 'ok', 'okay', 'yo', 'hola'];

/** Lower case, letters and numbers only, single spaces. Speech engines add punctuation and capitals inconsistently. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Edits needed to turn one word into the other. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Speech engines mishear names, so a longer word may be one or two letters off. A short word must be exact. */
function tolerance(word: string): number {
  return word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0;
}

/**
 * The names to listen for: the full name, and its first word when the name has several ("Kerabie Agent" is also heard as
 * "Kerabie"). Extra spellings the speech engine tends to produce can be passed in.
 */
export function wakeNames(name: string, aliases: readonly string[] = []): string[][] {
  const all = [name, name.trim().split(/\s+/)[0] ?? '', ...aliases];
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const n of all) {
    const words = normalise(n).split(' ').filter(Boolean);
    const key = words.join(' ');
    // A one- or two-letter name would wake on any short word.
    if (!key || key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(words);
  }
  return out;
}

/** Whether the words heard contain the name (allowing for small mishearings), optionally after a greeting. */
export function heardWake(transcript: string, names: string[][]): boolean {
  const heard = normalise(transcript).split(' ').filter(Boolean);
  if (!heard.length || !names.length) return false;
  for (const name of names) {
    for (let start = 0; start + name.length <= heard.length; start++) {
      if (name.every((word, k) => distance(heard[start + k], word) <= tolerance(word))) return true;
    }
  }
  return false;
}

/** The greetings that may come before the name, for documentation and for the speech engine's hints. */
export function greetingHints(name: string): string[] {
  return [name, ...GREETINGS.slice(0, 3).map((g) => `${g} ${name}`)];
}
