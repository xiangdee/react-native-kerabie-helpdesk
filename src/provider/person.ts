import type { KerUser } from '../types';

/** Who a user is, for telling one person from another: the app's own id, else the email. Empty for nobody. */
export function personOf(user?: Pick<KerUser, 'id' | 'email'> | null): string {
  return user?.id ? `id:${user.id}` : user?.email ? `email:${user.email.toLowerCase()}` : '';
}

/**
 * Whether a session kept for `saved` is someone else's session for `current`. A session kept for nobody (an anonymous
 * visitor) is free to be taken by whoever signs in; one kept for a person is that person's only.
 */
export function sessionIsOthers(saved: string | null | undefined, current: string): boolean {
  return !!saved && saved !== current;
}
