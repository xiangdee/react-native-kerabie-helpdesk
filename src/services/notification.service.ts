import { ApiService } from './api.service';

export interface KerAndroidChannel {
  channelId: string;
  name: string;
  importance?: 'min' | 'low' | 'default' | 'high' | 'max';
  sound?: string;
  vibrationPattern?: number[];
  enableVibrate?: boolean;
  description?: string;
}

const DEFAULT_CHANNELS: KerAndroidChannel[] = [
  {
    channelId: 'kerabie-messages',       // matches backend + mobile app channelId
    name: 'New Messages',
    importance: 'high',
    sound: 'default',
    enableVibrate: true,
    description: 'Notifications for new chat messages',
  },
  {
    channelId: 'kerabie-conversations',  // matches mobile app
    name: 'New Conversations',
    importance: 'high',
    sound: 'default',
    enableVibrate: true,
    description: 'Notifications for new conversations',
  },
  {
    channelId: 'kerabie-visitors',
    name: 'New Visitors',
    importance: 'default',
    sound: 'default',
    description: 'Notifications for new website visitors',
  },
  {
    channelId: 'kerabie-system',
    name: 'System Alerts',
    importance: 'low',
    description: 'System and account notifications',
  },
];

function mapImportance(level: string, Notifications: any): number {
  const map: Record<string, string> = {
    min: 'MIN', low: 'LOW', default: 'DEFAULT', high: 'HIGH', max: 'MAX',
  };
  return Notifications.AndroidImportance?.[map[level] ?? 'HIGH'] ?? 4;
}

export const NotificationService = {
  /**
   * Register Android notification channels.
   * MUST be called before requesting permissions on Android 8+ (API 26+) —
   * without a channel, push notifications will silently fail on Android.
   *
   * Usage (in App.tsx or _layout.tsx, before the provider):
   *   await NotificationService.registerAndroidChannels();
   */
  async registerAndroidChannels(channels?: KerAndroidChannel[]): Promise<void> {
    try {
      const [Notifications, RN] = await Promise.all([
        import('expo-notifications').catch(() => null),
        import('react-native').catch(() => null),
      ]);
      if (!Notifications || RN?.Platform?.OS !== 'android') return;

      const channelsToRegister = channels ?? DEFAULT_CHANNELS;
      await Promise.all(
        channelsToRegister.map((ch) =>
          Notifications.setNotificationChannelAsync(ch.channelId, {
            name: ch.name,
            importance: mapImportance(ch.importance ?? 'high', Notifications),
            sound: ch.sound ?? 'default',
            vibrationPattern: ch.vibrationPattern ?? [0, 250, 250, 250],
            enableVibrate: ch.enableVibrate ?? true,
            description: ch.description ?? null,
          }),
        ),
      );
    } catch {}
  },

  async registerToken(token: string, provider: 'expo' | 'fcm' | 'apns' = 'expo'): Promise<void> {
    try {
      await ApiService.post('/widget/push-token', { token, provider });
    } catch {}
  },

  async requestExpoPermission(): Promise<boolean> {
    try {
      const Notifications = await import('expo-notifications').catch(() => null);
      if (!Notifications) return false;
      const result = await Notifications.requestPermissionsAsync();
      // expo-notifications types differ across versions; access status safely
      const status = (result as any).status ?? (result as any).granted ? 'granted' : 'denied';
      return status === 'granted';
    } catch {
      return false;
    }
  },

  async getExpoToken(projectId?: string): Promise<string | null> {
    try {
      const Notifications = await import('expo-notifications').catch(() => null);
      if (!Notifications) return null;
      const options = projectId ? { projectId } : undefined;
      const token = await Notifications.getExpoPushTokenAsync(options);
      return token.data;
    } catch {
      return null;
    }
  },

  /**
   * Configure how notifications appear when the app is in the foreground.
   * Call once in your app root.
   */
  setForegroundHandler(options?: {
    showAlert?: boolean;
    showBadge?: boolean;
    showBanner?: boolean;
  }): void {
    import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: options?.showAlert ?? true,
          shouldPlaySound: true,
          shouldSetBadge: options?.showBadge ?? true,
          shouldShowBanner: options?.showBanner ?? true,
          shouldShowList: true,
        }),
      });
    }).catch(() => {});
  },

  /**
   * One-call full setup:
   *  1. Register Android channels (no-op on iOS)
   *  2. Request permission
   *  3. Get Expo push token
   *  4. Register token with Kerabie API
   *
   * Call once in your app entry point (App.tsx / _layout.tsx).
   *
   * @example
   * await NotificationService.setup({ projectId: 'your-expo-project-id' });
   */
  async setup(options?: {
    projectId?: string;
    channels?: KerAndroidChannel[];
    onTokenReceived?: (token: string) => void;
    appScheme?: string;      // e.g. "myapp" — used in app.json/AndroidManifest
  }): Promise<{ granted: boolean; token: string | null }> {
    NotificationService.setForegroundHandler();
    await NotificationService.registerAndroidChannels(options?.channels);

    const granted = await NotificationService.requestExpoPermission();
    if (!granted) return { granted: false, token: null };

    const token = await NotificationService.getExpoToken(options?.projectId);
    if (token) {
      await NotificationService.registerToken(token, 'expo');
      options?.onTokenReceived?.(token);
    }
    return { granted, token };
  },
};
