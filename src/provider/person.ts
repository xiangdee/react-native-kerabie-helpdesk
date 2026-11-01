import type { KerUser } from '../types';

/** Who a user is, for telling one person from another: the app's own id, else the email. Empty for nobody. */
export function personOf(user?: Pick<KerUser, 'id' | 'email'> | null): string {
  return user?.id ? `id:${user.id}` : user?.email ? `email:${user.email.toLowerCase()}` : '';
}
