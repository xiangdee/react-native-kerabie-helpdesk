/**
 * Deep link handler for Kerabie push notification taps.
 *
 * When a user taps a push notification on Android/iOS, this service:
 * 1. Intercepts the URL (any scheme by default, or only your own scheme when you pass one)
 * 2. Extracts the conversation ID
 * 3. Opens the chat to that conversation
 *
 * Setup in your app root (_layout.tsx or App.tsx):
 *   KerAbieDeepLinkService.init({ onConversation: (id) => { ... } })
 */

export interface DeepLinkHandlers {
  /** Called when a conversation link is opened: <your-scheme>://conversation/123 */
  onConversation?: (conversationId: number) => void;
  /** Called for any link that isn't recognised */
  onUnknown?: (url: string) => void;
  /** Your own app scheme, e.g. "myapp". Leave it out to accept a conversation link with any scheme. */
  scheme?: string;
}

export const KerAbieDeepLinkService = {
  _handlers: null as DeepLinkHandlers | null,

  /**
   * Initialise deep link handling. Call once in your app root.
   *
   * @example
   * // In App.tsx or _layout.tsx
   * const { open } = useKerAbieContext()
   *
   * useEffect(() => {
   *   KerAbieDeepLinkService.init({
   *     onConversation: (id) => {
   *       open()  // open the chat widget
   *       // optionally scroll to conversation if you have a list
   *     },
   *   })
   *   return () => KerAbieDeepLinkService.destroy()
   * }, [])
   */
  async init(handlers: DeepLinkHandlers): Promise<void> {
    this._handlers = handlers;

    try {
      const { Linking } = await import('react-native').catch(() => null) ?? {};
      if (!Linking) return;

      // Handle URL that launched the app cold (tapped notification while app was closed)
      const initial = await Linking.getInitialURL().catch(() => null);
      if (initial) this._handleUrl(initial);

      // Handle URL while app is already running (foreground/background)
      Linking.addEventListener('url', (event) => this._handleUrl(event.url));
    } catch {}
  },

  destroy(): void {
    try {
      import('react-native').then(({ Linking }) => {
        // React Native Linking.removeEventListener was deprecated; listener is cleaned up on unmount
      }).catch(() => {});
    } catch {}
    this._handlers = null;
  },

  _handleUrl(url: string): void {
    if (!url || !this._handlers) return;

    const scheme = this._handlers.scheme ? this._handlers.scheme.replace(/[^a-zA-Z0-9+.-]/g, '') : '[a-zA-Z][a-zA-Z0-9+.-]*';

    // <scheme>://conversation/123
    const convMatch = url.match(new RegExp(`^${scheme}:\\/\\/conversation\\/([0-9]+)`));
    if (convMatch) {
      const conversationId = parseInt(convMatch[1], 10);
      if (!isNaN(conversationId)) {
        this._handlers.onConversation?.(conversationId);
        return;
      }
    }

    this._handlers.onUnknown?.(url);
  },

  /**
   * Build a deep link URL for a conversation.
   * Use this as the `data.url` in Expo push notifications.
   *
   * @example
   * KerAbieDeepLinkService.conversationUrl(123, 'myapp')
   * // → "myapp://conversation/123"
   */
  conversationUrl(conversationId: number, scheme: string): string {
    return `${scheme}://conversation/${conversationId}`;
  },
};
