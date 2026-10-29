import { useCallback } from 'react';
import { useKerAbieContext } from '../provider/KerAbieContext';
import type { KerEnrichmentField, KerUser } from '../types';

/** The built-in name and email form, used when the org has not set its own questions. */
export const DEFAULT_PRE_CHAT_FIELDS: KerEnrichmentField[] = [
  { key: 'name', label: 'Your name', type: 'text', required: false, placeholder: 'Your name' },
  { key: 'email', label: 'Email address', type: 'email', required: false, placeholder: 'Email address' },
];

/**
 * The pre-chat questions and what is known about the visitor. The chat and a call ask the same form, so a visitor
 * cannot skip it by calling instead.
 */
export function usePreChat() {
  const ctx = useKerAbieContext();
  const { customerEnrichmentEnabled, customerEnrichmentForm } = ctx.config;

  // The org's own questions when it configured a pre-chat form; otherwise the built-in name + email form.
  const custom = customerEnrichmentEnabled ? customerEnrichmentForm?.fields ?? [] : [];
  const fields = custom.length > 0 ? custom : DEFAULT_PRE_CHAT_FIELDS;
  const alreadyAnswered =
    !!ctx.currentUser?.name || !!ctx.currentUser?.email || Object.keys(ctx.currentUser?.customAttributes ?? {}).length > 0;

  const submit = useCallback((answers: Record<string, string>) => {
    // name/email/phone are the contact's own fields; every other answer is a custom attribute.
    const user: KerUser = { ...ctx.currentUser };
    const attributes: Record<string, string> = { ...(ctx.currentUser?.customAttributes ?? {}) };
    for (const f of fields) {
      const v = (answers[f.key] ?? '').trim();
      if (!v) continue;
      if (f.key === 'name' || f.key === 'email' || f.key === 'phone') user[f.key] = v;
      else attributes[f.key] = v;
    }
    if (Object.keys(attributes).length) user.customAttributes = attributes;
    // setUser persists to storage and POSTs /widget/identify (see KerAbieProvider.setUser) — the email
    // on file unlocks the backend's reply-by-email continuation once the conversation escalates.
    ctx.setUser(user);
  }, [ctx, fields]);

  return {
    fields,
    isBuiltIn: fields === DEFAULT_PRE_CHAT_FIELDS,
    /** The org asks for details before a chat, and this visitor has not given any yet. */
    needsDetails: customerEnrichmentEnabled === true && !alreadyAnswered,
    alreadyAnswered,
    initial: { name: ctx.currentUser?.name ?? '', email: ctx.currentUser?.email ?? '' },
    submit,
  };
}
