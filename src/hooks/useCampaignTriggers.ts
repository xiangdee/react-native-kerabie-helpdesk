import { useCallback, useEffect, useRef, useState } from 'react';
import { CampaignService } from '../services/campaign.service';
import { isEligible, KerCampaign } from '../utils/campaignRules';

const PAGE_LOAD_DELAY_MS = 1500; // lets the chat history load so "hasn't chatted yet" is accurate
const AUTO_HIDE_MS = 12_000;

interface Options {
  widgetKey: string;
  /** The app's current screen path (e.g. Expo Router's usePathname()); used by a campaign's "pages" rule. */
  screen?: string;
  hasChatted: boolean;
  /** Nothing pops up while the chat itself is open. */
  chatOpen: boolean;
}

/**
 * Proactive campaigns inside the app: queues each live campaign when its trigger fires — when a screen
 * appears (page_load) or after N seconds in the app (time_on_page) — and reports what the user does with it.
 * Scroll depth and exit intent are website-only, so those campaigns are ignored here.
 */
export function useCampaignTriggers({ widgetKey, screen, hasChatted, chatOpen }: Options) {
  const [queue, setQueue] = useState<KerCampaign[]>([]);
  const [visible, setVisible] = useState(false);

  const campaigns = useRef<KerCampaign[]>([]);
  const seen = useRef<Record<number, number>>({});
  const returning = useRef(false);
  const queued = useRef<Set<number>>(new Set()); // once per app launch
  const live = useRef({ screen, hasChatted, chatOpen });
  live.current = { screen, hasChatted, chatOpen };
  const startedAt = useRef(Date.now());
  const [ready, setReady] = useState(false);

  const current = queue[0] ?? null;

  const fire = useCallback((c: KerCampaign) => {
    if (queued.current.has(c.id) || live.current.chatOpen) return;
    const ok = isEligible(c, {
      screen: live.current.screen,
      now: Date.now(),
      returning: returning.current,
      hasChatted: live.current.hasChatted,
      lastShownAt: seen.current[c.id],
      shownThisLaunch: queued.current.has(c.id),
    });
    if (!ok) return;
    queued.current.add(c.id);
    setQueue((q) => [...q, c]);
  }, []);

  // Load once per launch.
  useEffect(() => {
    if (!widgetKey) return;
    let cancelled = false;
    (async () => {
      const [list, seenMap, wasReturning] = await Promise.all([CampaignService.fetch(widgetKey), CampaignService.getSeen(), CampaignService.wasReturning()]);
      if (cancelled) return;
      campaigns.current = list;
      seen.current = seenMap;
      returning.current = wasReturning;
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [widgetKey]);

  // Time in app: one timer per campaign, measured from when the provider mounted.
  useEffect(() => {
    if (!ready) return;
    const timers = campaigns.current
      .filter((c) => c.trigger === 'time_on_page')
      .map((c) => {
        const wait = Math.max(0, (Number(c.triggerValue) || 10) * 1000 - (Date.now() - startedAt.current));
        return setTimeout(() => fire(c), wait);
      });
    return () => timers.forEach(clearTimeout);
  }, [ready, fire]);

  // A screen appearing: each time the screen changes, campaigns for it get their chance.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => campaigns.current.filter((c) => c.trigger === 'page_load').forEach(fire), PAGE_LOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, [ready, screen, fire]);

  // Show the head of the queue, report it, and clear it after a while so the next one can show.
  useEffect(() => {
    if (!current || chatOpen) { setVisible(false); return; }
    setVisible(true);
    CampaignService.report(widgetKey, current.id, 'shown');
    seen.current = { ...seen.current, [current.id]: Date.now() };
    CampaignService.markSeen(current.id).catch(() => {});
    const t = setTimeout(() => setQueue((q) => q.filter((c) => c.id !== current.id)), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [current?.id, chatOpen, widgetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const engagedId = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (current) setQueue((q) => q.filter((c) => c.id !== current.id));
  }, [current]);

  /** The user engaged with the message (tapped it or its button): "opened", and a reply if they write back. */
  const engage = useCallback((withClick: boolean) => {
    if (!current) return;
    CampaignService.report(widgetKey, current.id, 'opened');
    if (withClick) CampaignService.report(widgetKey, current.id, 'clicked');
    engagedId.current = current.id;
    dismiss();
  }, [current, widgetKey, dismiss]);

  /** Call after the user sends a message: the first one after engaging with a campaign counts as its reply. */
  const noteReply = useCallback(() => {
    const id = engagedId.current;
    if (id === null) return;
    engagedId.current = null;
    CampaignService.report(widgetKey, id, 'replied');
  }, [widgetKey]);

  return { campaign: visible ? current : null, dismiss, engage, noteReply };
}
