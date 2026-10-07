// Pure campaign rules (no React Native imports) — same page / audience / frequency semantics as the web widget.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface KerCampaign {
  id: number;
  name: string;
  message: string;
  /** Optional cover shown full-width on top of the popup. */
  imageUrl?: string | null;
  /** Button label; no button when empty. */
  ctaLabel?: string | null;
  ctaAction: 'open_chat' | 'open_kb' | 'open_link';
  ctaUrl?: string | null;
  /** `scroll_depth` and `exit_intent` only exist on websites — the app skips those campaigns. */
  trigger: 'page_load' | 'time_on_page' | 'scroll_depth' | 'exit_intent';
  /** Seconds in the app (time_on_page). */
  triggerValue?: string | null;
  /** Comma-separated screen patterns with * wildcards; empty = every screen. */
  pages?: string | null;
  /** `country` is already resolved by the server from the device's IP. */
  audience: 'all' | 'new' | 'returning' | 'not_chatted' | 'country';
  frequency: 'once_per_visitor' | 'once_per_day' | 'every_session';
}

export type KerCampaignEvent = 'shown' | 'opened' | 'clicked' | 'replied';

/** Triggers that make sense inside an app. */
export const NATIVE_TRIGGERS: KerCampaign['trigger'][] = ['page_load', 'time_on_page'];

const norm = (s: string) => {
  const withSlash = s.startsWith('/') ? s : `/${s}`;
  return (withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash).toLowerCase();
};

/** Glob-style match ("*" = anything) of the current screen path (e.g. Expo Router's pathname) against the campaign's patterns. */
export function matchesScreen(pages: string | null | undefined, screen: string | null | undefined): boolean {
  const patterns = (pages ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!patterns.length) return true;
  if (!screen) return false; // the app didn't say where the user is, so a screen-specific campaign can't be placed
  const path = norm(screen.split('?')[0]);
  return patterns.some((p) => new RegExp(`^${norm(p).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i').test(path));
}

export interface KerEligibility {
  screen?: string | null;
  now: number;
  /** The user had opened the app before this launch. */
  returning: boolean;
  hasChatted: boolean;
  lastShownAt?: number;
  /** Already shown since this app launch. */
  shownThisLaunch: boolean;
}

export function isEligible(c: KerCampaign, ctx: KerEligibility): boolean {
  if (!NATIVE_TRIGGERS.includes(c.trigger)) return false;
  if (!matchesScreen(c.pages, ctx.screen)) return false;

  if (c.audience === 'new' && ctx.returning) return false;
  if (c.audience === 'returning' && !ctx.returning) return false;
  if (c.audience === 'not_chatted' && ctx.hasChatted) return false;

  if (c.frequency === 'once_per_visitor') return ctx.lastShownAt === undefined;
  if (c.frequency === 'once_per_day') return ctx.lastShownAt === undefined || ctx.now - ctx.lastShownAt >= DAY_MS;
  return !ctx.shownThisLaunch;
}
