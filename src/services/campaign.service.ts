import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KerCampaign, KerCampaignEvent } from '../utils/campaignRules';

const BASE = 'https://api.kerabie.com';
// Not StorageService: it expires entries after 7 days, which would silently reset "once per visitor".
const SEEN_KEY = 'kerabie:sdk:campaign_seen';
const VISITED_KEY = 'kerabie:sdk:has_visited';

export const CampaignService = {
  async fetch(widgetKey: string): Promise<KerCampaign[]> {
    try {
      const res = await fetch(`${BASE}/public/campaigns?widgetKey=${encodeURIComponent(widgetKey)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.campaigns ?? [];
    } catch {
      return [];
    }
  },

  /** Fire-and-forget: a failed report must never get in the user's way. */
  report(widgetKey: string, campaignId: number, event: KerCampaignEvent): void {
    fetch(`${BASE}/public/campaigns/${campaignId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetKey, event }),
    }).catch(() => {});
  },

  async getSeen(): Promise<Record<number, number>> {
    try {
      return JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? '{}');
    } catch {
      return {};
    }
  },
  async markSeen(id: number): Promise<void> {
    const seen = await CampaignService.getSeen();
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify({ ...seen, [id]: Date.now() }));
  },

  /** True if the app was opened before this launch; records this launch either way. */
  async wasReturning(): Promise<boolean> {
    const before = await AsyncStorage.getItem(VISITED_KEY);
    if (!before) await AsyncStorage.setItem(VISITED_KEY, '1');
    return !!before;
  },
};
