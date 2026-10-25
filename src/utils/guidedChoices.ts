/**
 * Which guided-flow buttons are on screen: the greeting's while nothing has been sent, otherwise those on the latest
 * bot message, until the visitor answers it (any later message from them removes them). Mirrors the web widget
 * (kerabie-chat-widget/src/utils/guidedChoices.ts).
 */
import type { KerGuidedChoice, KerGuidedGreeting } from '../types';

interface MessageLike {
  senderType: string;
  metadata?: Record<string, any> | null;
}

export function activeChoices(
  messages: MessageLike[],
  greeting: KerGuidedGreeting | null | undefined,
  greetingAllowed = true,
): { flowId: string; choices: KerGuidedChoice[] } | null {
  if (!messages.length) return greeting && greetingAllowed && greeting.choices.length ? { flowId: greeting.flowId, choices: greeting.choices } : null;

  const last = messages[messages.length - 1];
  if (!last || last.senderType === 'visitor') return null;
  const choices = last.metadata?.choices;
  const flowId = last.metadata?.flowId;
  if (!Array.isArray(choices) || !choices.length || typeof flowId !== 'string') return null;
  const valid = choices.filter((c): c is KerGuidedChoice => !!c && typeof c.id === 'string' && typeof c.label === 'string');
  return valid.length ? { flowId, choices: valid } : null;
}
