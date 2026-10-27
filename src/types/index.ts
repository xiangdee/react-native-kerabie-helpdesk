import { ImageSourcePropType } from 'react-native';

export interface KerKbArticle {
  id: number;
  title: string;
  content: string;
  type: string;
  category: string;
  imageUrl?: string | null;
  views: number;
  updatedAt: string;
}

export interface KerStoreProduct {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  imageUrl?: string | null;
  category?: string | null;
  stock?: number | null;
}

export interface KerUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  customAttributes?: Record<string, string>;
}

export interface KerTheme {
  primaryColor?: string;
  /** Gradient end color — only applied when colorType is 'gradient'. Mirrors the web dashboard's ChatWidget.secondaryColor. */
  secondaryColor?: string;
  colorType?: 'gradient' | 'singleColor';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  /** Light/dark palette — mirrors the dashboard's ChatWidget.theme; 'auto' follows the device's color scheme. */
  mode?: 'light' | 'dark' | 'auto';
  /** Overrides the palette's background — leave unset to follow `mode`. */
  backgroundColor?: string;
  textColor?: string;
  bubbleColor?: string;
  bubbleIcon?: ImageSourcePropType;
  bubbleSize?: number;
  /** Size of the icon inside the floating button — mirrors the dashboard's ChatWidget.launcherIconSize (16–48). */
  bubbleIconSize?: number;
  fontFamily?: string;
  agentBubbleColor?: string;
  userBubbleColor?: string;
  /** Custom mascot/icon shown next to AI replies (ChatWidget.chatbotAvatarUrl) — MessageBubble falls back to a generic 🤖 when unset. */
  chatbotAvatarUrl?: string;
}

export interface KerNotification {
  id: string;
  type: 'new_message' | 'conversation_assigned' | 'system';
  title: string;
  body: string;
  conversationId?: number;
  timestamp: string;
}

/** One button of a guided flow (a menu the organisation built in the dashboard). */
export interface KerGuidedChoice { id: string; label: string }

/** The opening question of the organisation's guided flow, with its buttons, shown before the visitor types. */
export interface KerGuidedGreeting { flowId: string; message: string; choices: KerGuidedChoice[] }

export interface KerMessage {
  id: number | string;
  /** Set on messages from the server; absent on local optimistic bubbles. */
  conversationId?: number;
  body: string;
  createdAt: string;
  senderType: 'visitor' | 'agent' | 'bot';
  senderName?: string;
  senderAvatar?: string;
  /** Local-only, pre-send scaffolding for ctx.sendMessage(body, attachments) —
   *  the actual wire format (and what MessageBubble renders) is `type` +
   *  `metadata`, matching the server's message shape 1:1 (see chat-cache.service.ts
   *  CachedMessage). sendMessage() derives `type`/`metadata` from the first
   *  entry here for its own optimistic bubble, same as the chat widget does. */
  attachments?: KerAttachment[];
  type?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  /** `articles` is the KB citation(s) an AI reply matched (chatbot.service.ts buildContext). */
  metadata?: { url?: string; fileName?: string; mimeType?: string; articles?: Array<{ id: number; title: string }>; [key: string]: any };
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  /** Set async, after the message arrives, via the 'chat:message:linkpreview' socket event. */
  linkPreview?: KerLinkPreview;
  /** True while an AI reply is still streaming in (chat:message:start..chat:message:chunk) — MessageBubble shows a blinking cursor instead of the sent/read ticks. */
  streaming?: boolean;
}

export interface KerAttachment {
  id: string;
  /** For local optimistic display only (a local file:// URI or similar) —
   *  attachments are private objects; the real, fetchable URL only exists
   *  server-side, resolved fresh per read from `key` (see chat.service.ts
   *  resolveAttachmentUrls). Never assume this is fetchable once the
   *  message has round-tripped through the server. */
  url: string;
  /** S3 object key — what actually gets sent to the server so it can
   *  resolve a signed URL. Absent for a purely local/optimistic attachment
   *  that hasn't finished uploading yet. */
  key?: string;
  type: 'image' | 'file' | 'audio' | 'video';
  name?: string;
  size?: number;
}

export interface KerLinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

export interface KerConversation {
  id: number;
  status: 'open' | 'resolved' | 'closed';
  assignedAgent?: { id: number; name: string; avatar?: string };
  lastMessage?: KerMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export type KerTicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type KerTicketStatus = 'WAITING' | 'ACTIVE' | 'RESOLVED' | 'CLOSED';

export interface KerTicket {
  id: number;
  subject?: string | null;
  status: KerTicketStatus;
  priority: KerTicketPriority;
  slaDueAt?: string | null;
  createdAt: string;
}

export interface KerTicketMessage {
  id: number | string;
  body: string;
  senderRole: 'agent' | 'customer';
  senderName?: string;
  createdAt: string;
}

export type OpenMode = 'modal' | 'sheet' | 'push';
export type BubblePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface KerNavigationRoute {
  /** The screen to navigate to */
  type: 'conversation' | 'inbox';
  /** Present when type === 'conversation' */
  conversationId?: number;
}

/** The push service a token came from. These are the values the Kerabie API accepts. */
export type KerPushProvider = 'expo' | 'fcm';

/**
 * The one push service your app uses. Kerabie keeps a single token per visitor session, so pass one adapter.
 * Expo is built in (`expoNotificationAdapter`); for Firebase or anything else, supply an object with these three methods.
 */
export interface KerNotificationAdapter {
  /** Asks the user for permission to show notifications. Resolves true when granted. */
  requestPermission: () => Promise<boolean>;
  /** This device's token for the service the adapter wraps, and which service that is. Null when there is none. */
  getToken: () => Promise<{ token: string; provider: KerPushProvider } | null>;
  /**
   * Calls `handler` with a notification's `data` when the user taps it, including the tap that launched the app.
   * Returns a function that stops listening. Kerabie notifications carry `conversationId` and `orgId` in `data`.
   */
  onTap: (handler: (data: Record<string, unknown>) => void) => Promise<() => void> | (() => void);
}

export interface KerNotificationConfig {
  /** The push service to use. Defaults to Expo. Create it once, outside your component. */
  adapter?: KerNotificationAdapter;
  /** Called after a token has been registered with Kerabie. */
  onTokenRegister?: (token: string, provider: KerPushProvider) => void;
}

/** One question on the pre-chat form (dashboard: Messages > Pre-chat form). name/email/phone are the contact's own fields; other keys become custom attributes. */
export interface KerEnrichmentField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface KerChatSettings {
  /** Widget title shown in ChatScreen's own header — falls back to the org's dashboard-configured Widget Name (ChatWidget.name) when unset. */
  name?: string;
  welcomeMessage?: string;
  offlineMessage?: string;
  showBranding?: boolean;
  /** Show the "agent is typing" indicator — mirrors the dashboard's ChatWidget.typingIndicator. */
  typingIndicator?: boolean;
  enableFileAttachments?: boolean;
  enableVoiceMessages?: boolean;
  /** Whether the AI chatbot can reply when no agent is online — mirrors ChatWidget.chatbotEnabled. Gates the offline pre-chat capture form in ChatScreen. */
  chatbotEnabled?: boolean;
  /** 'single' = one continuous chat; the header menu (settings) only shows when showMenu is on. Mirrors ChatWidget.layout/showMenu. */
  layout?: 'full' | 'single';
  showMenu?: boolean;
  /** The org's logo, shown in the Home header. */
  logoUrl?: string | null;
  /** Show the Home / Chat / Help tab bar even in the 'single' layout. Mirrors ChatWidget.showNavigation. */
  showNavigation?: boolean;
  /** Home header greeting. `greetingText` falls back to the default; `{{name}}` is the visitor's first name. */
  showGreeting?: boolean;
  greetingText?: string | null;
  /** The "We reply in minutes" chip in the Home header. */
  showStatusChip?: boolean;
  statusChipText?: string | null;
  /** 'searchbar' = render <KerAbieSearchBar /> instead of the floating bubble. Mirrors ChatWidget.launcherType. */
  launcherType?: 'bubble' | 'searchbar';
  searchbarPlaceholder?: string;
  /** Ask visitors the pre-chat form's questions before their first message. Mirrors ChatWidget.customerEnrichmentEnabled/Form. */
  customerEnrichmentEnabled?: boolean;
  customerEnrichmentForm?: { fields: KerEnrichmentField[] } | null;
  /** The org's guided flow opens the chat with this question and its buttons. Mirrors the widget's guidedGreeting. */
  guidedGreeting?: KerGuidedGreeting | null;
}

export interface KerAbieProviderProps {
  widgetKey: string;
  appName?: string;
  appVersion?: string;
  appBuild?: string;
  openMode?: OpenMode;
  user?: KerUser;
  theme?: KerTheme;
  position?: BubblePosition;
  defaultOpen?: boolean;
  hideFloatingButton?: boolean;
  /**
   * Called when the SDK needs to open a screen in your app's navigator. This is the only navigation hook: call
   * `router.push(...)` (Expo Router) or `navigation.navigate(...)` (React Navigation) from it.
   * Only called when openMode='push'; without it the chat opens inline.
   */
  onNavigate?: (route: KerNavigationRoute) => void;
  onOpenChat?: () => void;
  onCloseChat?: () => void;
  /**
   * The app's current screen path (for example Expo Router's `usePathname()`).
   * Campaigns can be limited to certain screens ("On pages" in the dashboard); without this,
   * only campaigns for every screen are shown.
   */
  screen?: string;
  /**
   * A campaign button can open your Knowledge Base. Chat has no built-in screen for it, so the
   * app decides where it goes (e.g. `router.push('/help')`); without this the chat opens instead.
   */
  onOpenKnowledgeBase?: () => void;
  notifications?: KerNotificationConfig;
  chatSettings?: KerChatSettings;
  children: React.ReactNode;
}

export interface KerAbieContextValue {
  // Chat state
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  unreadCount: number;
  conversations: KerConversation[];
  currentConversation: KerConversation | null;
  /** The identified user's name, used to fill {{name}} in the welcome message. */
  visitorName: string;
  messages: KerMessage[];
  /** `choice` marks a tap on a guided flow's button; `body` is then the button's label. */
  sendMessage: (body: string, attachments?: KerAttachment[], choice?: { flowId: string; choiceId: string }) => Promise<void>;
  retryMessage: (msg: KerMessage) => Promise<void>;
  /** Asks again for the guided flow's opening question for the screen the visitor is on now (it can differ by page). */
  refreshGreeting: () => Promise<void>;
  isTyping: boolean;
  /** True while the typing indicator is the AI chatbot (not a human agent) — ChatScreen shows the thinking orb for it. */
  isAiTyping: boolean;
  onlineAgents: number;
  isConnected: boolean;

  // User identity
  currentUser: KerUser | null;
  setUser: (user: KerUser) => void;
  clearUser: () => void;
  updateAttribute: (key: string, value: string) => void;

  // App identity
  appName: string;
  appVersion: string;
  appBuild: string;
  setAppVersion: (v: string) => void;

  // Notifications
  hasNotificationPermission: boolean;
  requestNotificationPermission: () => Promise<boolean>;
  registerNotificationToken: (token: string, provider?: KerPushProvider) => void;

  /** Text handed to ChatScreen when the search-bar launcher opens the chat (any staged attachment goes with it). */
  chatDraft: { text: string } | null;
  openWithDraft: (draft: { text: string }) => void;
  clearChatDraft: () => void;

  // Contextual chat
  openWithContext: (context: KerChatContext) => void;

  // Config
  config: Required<Pick<KerAbieProviderProps, 'openMode' | 'position' | 'hideFloatingButton'>> & {
    theme: KerTheme;
    widgetKey: string;
    /** From /public/widget/init — gates whether the host app should show a ticket entry point at all. */
    ticketsEnabled: boolean;
    /** From /public/widget/init — the dashboard has calls on and the plan still has minutes. Used by the optional calls entry point. */
    callsEnabled: boolean;
    videoCallsEnabled: boolean;
    /** /public/widget/init has answered — launchers render nothing before this. */
    configReady: boolean;
    launcherType: 'bubble' | 'searchbar';
    searchbarPlaceholder: string;
  };
}

/**
 * Contextual payload for opening chat with pre-loaded context.
 * Shown to the agent as context alongside the conversation.
 *
 * @example – product click
 * openWithContext({ type: 'product', id: 'sku_123', title: 'Blue Sneakers', data: { price: 4500 } })
 *
 * @example – order inquiry
 * openWithContext({ type: 'order', id: 'ORD-2024-001', title: 'Order #2024-001', data: { status: 'shipped' } })
 *
 * @example – fintech transaction
 * openWithContext({ type: 'transaction', id: 'TXN-987', title: '₦5,000 Transfer', data: { status: 'failed' } })
 *
 * @example – ride sharing
 * openWithContext({ type: 'ride', id: 'RIDE-456', title: 'Trip to Airport', data: { driver: 'John' } })
 */
export interface KerChatContext {
  type: 'order' | 'product' | 'transaction' | 'ride' | 'errand' | 'booking' | 'custom';
  id?: string;                      // external reference ID
  title?: string;                   // human-readable label shown to the agent
  data?: Record<string, any>;       // arbitrary key-value payload
  openChat?: boolean;               // auto-open the chat UI (default: true)
}
