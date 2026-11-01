import type { KerChatContext } from '../types';

const MAX_LINES = 6;
const MAX_VALUE = 120;
const MAX_TOTAL = 600;

const label = (key: string) => key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

/**
 * The message a "get help with this" tap puts in the composer: what it is about and its main details, so the customer
 * only has to add what went wrong. An app can give its own wording with `context.message`.
 */
export function contextMessage(context: KerChatContext): string {
  if (context.message?.trim()) return context.message.trim().slice(0, MAX_TOTAL);
  const what = context.title?.trim() || context.type;
  const ref = context.id && !what.includes(context.id) ? ` (ref ${context.id})` : '';
  const lines = [`I need help with ${what}${ref}.`];
  for (const [key, value] of Object.entries(context.data ?? {})) {
    if (lines.length > MAX_LINES) break;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
    const text = String(value).trim();
    if (text) lines.push(`${label(key)}: ${text.slice(0, MAX_VALUE)}`);
  }
  return lines.join('\n').slice(0, MAX_TOTAL);
}
