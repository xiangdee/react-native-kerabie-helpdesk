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
export type NavigationAdapter = 'expo-router' | 'react-navigation' | 'custom';
export type BubblePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface KerNavigationRoute {
  /** The screen to navigate to */
  type: 'conversation' | 'inbox';
  /** Present when type === 'conversation' */
  conversationId?: number;
}

export interface KerNotificationConfig {
  provider: 'expo';
  getToken?: () => Promise<string>;
  onTokenRegister?: (token: string) => void;
  onNotificationReceived?: (n: KerNotification) => void;
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
  /** 'searchbar' = render <KerAbieSearchBar /> instead of the floating bubble. Mirrors ChatWidget.launcherType. */
  launcherType?: 'bubble' | 'searchbar';
  searchbarPlaceholder?: string;
  /** Ask visitors the pre-chat form's questions before their first message. Mirrors ChatWidget.customerEnrichmentEnabled/Form. */
  customerEnrichmentEnabled?: boolean;
  customerEnrichmentForm?: { fields: KerEnrichmentField[] } | null;
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
   * Navigation adapter type.
   * - 'expo-router'       — SDK uses expo-router internally (dynamic import)
   * - 'react-navigation'  — SDK calls navigationRef.navigate()
   * - 'custom'            — SDK calls onNavigate() callback
   * Only relevant when openMode='push'.
   */
  navigation?: NavigationAdapter;
  /** React Navigation navigationRef (required when navigation='react-navigation') */
  navigationRef?: React.RefObject<any>;
  /**
   * Called when the SDK needs to open a screen via your navigator.
   * Use this for 'custom' navigation or to override default expo-router/react-navigation behavior.
   * Only called when openMode='push'.
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
  sendMessage: (body: string, attachments?: KerAttachment[]) => Promise<void>;
  retryMessage: (msg: KerMessage) => Promise<void>;
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
  registerNotificationToken: (token: string) => void;

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
