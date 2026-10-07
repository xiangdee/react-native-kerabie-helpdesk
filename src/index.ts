// Provider
export { KerAbieProvider } from './provider/KerAbieProvider';
export { KerAbieContext, useKerAbieContext } from './provider/KerAbieContext';

// Hooks
export { useKerAbieChat } from './hooks/useKerAbieChat';
export { useKerAbieUser } from './hooks/useKerAbieUser';
export { useKerAbieApp } from './hooks/useKerAbieApp';
export { useKerAbieNotifications } from './hooks/useKerAbieNotifications';
export { useKerAbieKnowledgeBase } from './hooks/useKerAbieKnowledgeBase';
export { useKerAbieStore } from './hooks/useKerAbieStore';
export { useKerAbieTickets } from './hooks/useKerAbieTickets';

// Components
export { ChatScreen as KerAbieChatScreen } from './components/ChatScreen';
export { KerAbieFloatingButton } from './components/FloatingButton';
export { KerAbieSearchBar } from './components/SearchBar';
export type { KerCampaign } from './utils/campaignRules';
export { MessageBubble as KerAbieMessageBubble } from './components/MessageBubble';
export { KnowledgeBaseScreen as KerAbieKnowledgeBaseScreen } from './components/KnowledgeBaseScreen';
export { StoreScreen as KerAbieStoreScreen } from './components/StoreScreen';
export { TicketsScreen as KerAbieTicketsScreen } from './components/TicketsScreen';
export { TicketDetailScreen as KerAbieTicketDetailScreen } from './components/TicketDetailScreen';
export { Skeleton as KerAbieSkeleton, SkeletonRows as KerAbieSkeletonRows } from './components/Skeleton';

// Types
export type {
  KerAbieProviderProps,
  KerAbieContextValue,
  KerUser,
  KerTheme,
  KerMessage,
  KerAttachment,
  KerConversation,
  KerNotification,
  KerNotificationConfig,
  KerChatSettings,
  KerChatContext,
  KerNavigationRoute,
  KerKbArticle,
  KerStoreProduct,
  KerTicket,
  KerTicketMessage,
  KerTicketPriority,
  KerTicketStatus,
  OpenMode,
  BubblePosition,
  NavigationAdapter,
} from './types';

// Notification helpers (Android channel setup, Expo token, etc.)
export { NotificationService } from './services/notification.service';
export type { KerAndroidChannel } from './services/notification.service';

// Deep link handler (notification tap → open conversation)
export { KerAbieDeepLinkService } from './services/deeplink.service';
export type { DeepLinkHandlers } from './services/deeplink.service';
