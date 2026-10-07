import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, Platform, View } from 'react-native';
import {
  KerAbieContextValue,
  KerAbieProviderProps,
  KerAttachment,
  KerChatContext,
  KerChatSettings,
  KerConversation,
  KerLinkPreview,
  KerMessage,
  KerNavigationRoute,
  KerTheme,
  KerUser,
} from '../types';
import { KerAbieContext } from './KerAbieContext';
import { ApiService } from '../services/api.service';
import { socketService } from '../services/socket.service';
import { StorageService } from '../services/storage.service';
import { NotificationService } from '../services/notification.service';
import { KerAbieDeepLinkService } from '../services/deeplink.service';
import { ChatScreen } from '../components/ChatScreen';
import { CampaignBanner } from '../components/CampaignBanner';
import { useCampaignTriggers } from '../hooks/useCampaignTriggers';
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '../theme/palette';

function generateSessionId(): string {
  return 'ks_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// The server's wire format (chat-cache.service.ts CachedMessage) uses
// senderRole ('agent' | 'customer'), not this SDK's senderType
// ('visitor' | 'agent' | 'bot') — without this mapping, every incoming
// real message had senderType === undefined: an agent's own reply would
// render fine by accident (isVisitor false either way), but a visitor's
// OWN message would flip from "mine" to "theirs" styling the moment the
// server echo replaced the optimistic bubble, and a bot reply lost its
// distinct avatar (AI replies are sent as senderRole: 'agent' with
// metadata.source === 'ai', not a real 'bot' role at the wire level).
function mapIncomingMessage(raw: any): KerMessage {
  const senderType: KerMessage['senderType'] =
    raw.senderRole === 'customer' ? 'visitor' : raw.metadata?.source === 'ai' ? 'bot' : 'agent';
  return { ...raw, senderType };
}

const DEFAULT_THEME: Required<KerTheme> = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
  colorType: 'gradient',
  borderRadius: 'medium',
  mode: 'light',
  // Neutrals left unset so they come from the light/dark palette
  // (theme/palette.ts) — a developer can still pin them via `theme`.
  backgroundColor: undefined as any,
  textColor: undefined as any,
  // Left unset so the floating button and visitor bubble follow the org's
  // dashboard primaryColor/gradient — a hardcoded default here always won
  // over the remote primaryColor. A developer can still pin them via `theme`.
  bubbleColor: undefined as any,
  bubbleIcon: undefined as any,
  bubbleSize: 56,
  bubbleIconSize: 28,
  fontFamily: undefined as any,
  agentBubbleColor: undefined as any,
  userBubbleColor: undefined as any,
  chatbotAvatarUrl: undefined as any,
};

function newConversationState(id: number): KerConversation {
  const now = new Date().toISOString();
  return { id, status: 'open', unreadCount: 0, createdAt: now, updatedAt: now };
}

export function KerAbieProvider({
  widgetKey,
  appName = '',
  appVersion = '0.0.0',
  appBuild = '',
  openMode = 'modal',
  user: initialUser,
  theme: themeProp,
  position = 'bottom-right',
  defaultOpen = false,
  hideFloatingButton = false,
  navigation,
  navigationRef,
  onNavigate,
  onOpenChat,
  onCloseChat,
  screen,
  onOpenKnowledgeBase,
  notifications,
  chatSettings,
  children,
}: KerAbieProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<KerUser | null>(initialUser ?? null);
  const [conversations, setConversations] = useState<KerConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<KerConversation | null>(null);
  const [messages, setMessages] = useState<KerMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatDraft, setChatDraft] = useState<{ text: string } | null>(null);
  const [onlineAgents, setOnlineAgents] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState(appVersion);
  // Org-configured appearance from /public/widget/init — the dashboard's
  // ChatSettingsTab is the source of truth for orgs that never pass an
  // explicit `theme` prop. themeProp (an explicit developer override) always
  // wins over these when both set the same field.
  const [remoteTheme, setRemoteTheme] = useState<Partial<KerTheme>>({});
  const [remoteChatSettings, setRemoteChatSettings] = useState<Partial<KerChatSettings>>({});
  const [ticketsEnabled, setTicketsEnabled] = useState(false);

  const theme: KerTheme = { ...DEFAULT_THEME, ...remoteTheme, ...themeProp };
  // ChatScreen's own header previously always showed the hardcoded title
  // "Support" — this dashboard-configured name (same field the web widget's
  // Header.vue shows) had no way to reach it at all. chatSettings (an
  // explicit developer override) still wins when both set `name`.
  const mergedChatSettings: KerChatSettings = { ...remoteChatSettings, ...chatSettings };
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTempIds = useRef<Map<string, string>>(new Map());
  const pendingFailTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Set while the first message of a new conversation is in flight: resolves
  // with the id the server assigned (read off that message's echo), so any
  // message sent meanwhile lands in the same conversation instead of
  // creating another one.
  const draftCreation = useRef<{ tempId: string; promise: Promise<number | null>; resolve: (id: number | null) => void } | null>(null);

  // Navigate to a route — adapter picks the right navigator
  const navigateTo = useCallback((route: KerNavigationRoute) => {
    // 'push' openMode: delegate to the host app's navigator
    if (openMode === 'push') {
      if (onNavigate) {
        onNavigate(route);
        return;
      }
      if (navigation === 'expo-router') {
        import('expo-router').then((mod) => {
          const path = route.type === 'conversation' && route.conversationId
            ? `/chat/conversation/${route.conversationId}`
            : '/chat';
          mod.router.push(path as any);
        }).catch(() => {
          // expo-router not available — fall back to modal
          setIsOpen(true);
          onOpenChat?.();
        });
        return;
      }
      if (navigation === 'react-navigation' && navigationRef?.current) {
        const params = route.type === 'conversation' && route.conversationId
          ? { screen: 'KerAbieConversation', params: { conversationId: route.conversationId } }
          : { screen: 'KerAbieChat' };
        navigationRef.current.navigate('KerAbieChat', params);
        return;
      }
    }
    // Default (modal/sheet): open inline widget
    setIsOpen(true);
    onOpenChat?.();
  }, [openMode, navigation, navigationRef, onNavigate, onOpenChat]);

  // Deep link handler — open chat to the right conversation on notification tap
  useEffect(() => {
    KerAbieDeepLinkService.init({
      onConversation: (conversationId) => {
        // Always surface the conversation in state so ChatScreen can scroll to it
        setCurrentConversation((prev) => prev?.id === conversationId ? prev : {
          id: conversationId,
          status: 'open',
          unreadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        navigateTo({ type: 'conversation', conversationId });
      },
    });
    return () => KerAbieDeepLinkService.destroy();
  }, [navigateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init session
  useEffect(() => {
    (async () => {
      let sid = await StorageService.get<string>('session_id');
      if (!sid) {
        sid = generateSessionId();
        await StorageService.set('session_id', sid);
      }
      setSessionId(sid);

      ApiService.init({ widgetKey, sessionId: sid });

      // Restore this visitor's chat history — visitor:ready (the socket
      // handshake) only returns ids, never messages. Empty for a visitor who
      // hasn't sent anything yet (no conversation exists until they do).
      try {
        const history = await ApiService.get<{ conversationId: number | null; messages: any[] }>('/public/widget/messages');
        if (history.messages?.length) setMessages(history.messages.map(mapIncomingMessage));
      } catch {}

      // Resolve orgId from widget key before connecting socket
      let orgId = 0;
      try {
        const initRes = await fetch(`https://api.kerabie.com/public/widget/init`, {
          headers: { 'x-widget-key': widgetKey },
        });
        if (initRes.ok) {
          const data = await initRes.json();
          orgId = data.orgId ?? 0;

          const s = data.settings ?? {};
          setRemoteTheme({
            ...(s.primaryColor ? { primaryColor: s.primaryColor } : {}),
            ...(s.secondaryColor ? { secondaryColor: s.secondaryColor } : {}),
            ...(s.colorType ? { colorType: s.colorType } : {}),
            ...(s.borderRadius ? { borderRadius: s.borderRadius } : {}),
            ...(s.theme ? { mode: s.theme } : {}),
            ...(s.chatbotAvatarUrl ? { chatbotAvatarUrl: s.chatbotAvatarUrl } : {}),
            // Custom launcher icon (already plan-gated server-side) and its size.
            ...(s.launcherIconUrl ? { bubbleIcon: { uri: s.launcherIconUrl } } : {}),
            ...(s.launcherIconSize ? { bubbleIconSize: s.launcherIconSize } : {}),
          });
          // Same dashboard-configured values the web widget reads, so one
          // save in ChatSettingsTab reaches RN apps without the integrator
          // hardcoding them via the chatSettings prop (which still wins).
          setRemoteChatSettings({
            ...(s.name ? { name: s.name } : {}),
            ...(s.welcomeMessage ? { welcomeMessage: s.welcomeMessage } : {}),
            ...(s.offlineMessage ? { offlineMessage: s.offlineMessage } : {}),
            ...(typeof s.showBranding === 'boolean' ? { showBranding: s.showBranding } : {}),
            ...(typeof s.typingIndicator === 'boolean' ? { typingIndicator: s.typingIndicator } : {}),
            ...(typeof s.chatbotEnabled === 'boolean' ? { chatbotEnabled: s.chatbotEnabled } : {}),
            ...(s.layout ? { layout: s.layout } : {}),
            ...(typeof s.showMenu === 'boolean' ? { showMenu: s.showMenu } : {}),
            ...(s.launcherType ? { launcherType: s.launcherType } : {}),
            ...(s.searchbarPlaceholder ? { searchbarPlaceholder: s.searchbarPlaceholder } : {}),
            ...(typeof s.customerEnrichmentEnabled === 'boolean' ? { customerEnrichmentEnabled: s.customerEnrichmentEnabled } : {}),
            ...(s.customerEnrichmentForm ? { customerEnrichmentForm: s.customerEnrichmentForm } : {}),
          });
          if (typeof s.ticketsEnabled === 'boolean') setTicketsEnabled(s.ticketsEnabled);
        }
      } catch {}

      socketService.connect({
        widgetKey,
        sessionId: sid,
        orgId,
        appName,
        appVersion: currentAppVersion,
        appBuild,
        user: currentUser ?? undefined,
      });
    })();

    return () => { socketService.disconnect(); };
  }, [widgetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket events
  useEffect(() => {
    const unsubs = [
      socketService.on('connect', () => setIsConnected(true)),
      socketService.on('disconnect', () => setIsConnected(false)),
      socketService.on('visitor_ready', (data: { conversationId: number | null; agentsOnline?: boolean }) => {
        // Only a boolean here (agents:online later carries the real count) —
        // already reflects the dashboard's manual online/offline override.
        if (typeof data.agentsOnline === 'boolean') {
          setOnlineAgents((n) => (data.agentsOnline ? Math.max(n, 1) : 0));
        }
        const convId = data.conversationId;
        if (convId) setCurrentConversation((prev) => prev ?? newConversationState(convId));
      }),
      socketService.on<KerMessage & { streamId?: string }>('message', (raw) => {
        const msg = mapIncomingMessage(raw);
        // Echo of a new conversation's first message — the earliest point its
        // server-assigned id is known.
        const draft = draftCreation.current;
        if (draft && raw.conversationId && pendingTempIds.current.get(draft.tempId) === msg.body) {
          draftCreation.current = null;
          draft.resolve(raw.conversationId);
          setCurrentConversation((prev) => prev ?? newConversationState(raw.conversationId!));
        }
        setMessages((prev) => {
          // A streamed AI reply — swap the streaming placeholder (see
          // 'message_start'/'message_chunk' below) for the persisted final
          // message, matched by streamId rather than the body-match used
          // for this client's own optimistic sends below (a bot reply was
          // never something this client sent, so it can't be in pendingTempIds).
          if ((raw as any).streamId) {
            const placeholderId = `stream_${(raw as any).streamId}`;
            if (prev.some((m) => m.id === placeholderId)) {
              return prev.map((m) => m.id === placeholderId ? msg : m);
            }
          }

          // Replace a pending optimistic message that matches this incoming echo
          const pendingMatch = [...pendingTempIds.current.entries()]
            .find(([, body]) => body === msg.body);
          if (pendingMatch) {
            const [tid] = pendingMatch;
            pendingTempIds.current.delete(tid);
            const timer = pendingFailTimers.current.get(tid);
            if (timer !== undefined) {
              clearTimeout(timer);
              pendingFailTimers.current.delete(tid);
            }
            return prev.map((m) => m.id === tid ? { ...msg, status: 'sent' as const } : m);
          }
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (!isOpen) setUnreadCount((n) => n + 1);
      }),
      // AI reply streaming start — pushes a placeholder bubble immediately
      // (chat.gateway.ts runChatbot emits this on the first token), replaced
      // in place by 'message' above once the full reply is persisted.
      socketService.on<{ conversationId: number; streamId: string; senderName?: string }>('message_start', (data) => {
        setMessages((prev) => {
          const id = `stream_${data.streamId}`;
          if (prev.some((m) => m.id === id)) return prev;
          return [...prev, {
            id,
            body: '',
            createdAt: new Date().toISOString(),
            senderType: 'bot',
            senderName: data.senderName ?? 'AI Assistant',
            streaming: true,
          }];
        });
      }),
      socketService.on<{ streamId: string; delta: string }>('message_chunk', (data) => {
        setMessages((prev) => {
          const id = `stream_${data.streamId}`;
          return prev.map((m) => m.id === id ? { ...m, body: m.body + data.delta } : m);
        });
      }),
      socketService.on('typing', (data: { typing?: boolean; userId?: number }) => {
        if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
        // userId 0 is the chatbot's typing identity (chat.gateway.ts runChatbot).
        setIsAiTyping(data.userId === 0 && data.typing !== false);
        if (data.typing === false) {
          setIsTyping(false);
          return;
        }
        setIsTyping(true);
        // Safety net in case a corresponding typing:false never arrives
        // (e.g. the sender's connection drops mid-"typing").
        // The chatbot emits one typing:true and then streams, so it gets a longer net than a human agent.
        typingTimer.current = setTimeout(() => { setIsTyping(false); setIsAiTyping(false); }, data.userId === 0 ? 30000 : 3000);
      }),
      socketService.on('online_agents', (data: any) => {
        setOnlineAgents(data.count ?? 0);
      }),
      // Backend emits 'chat:message:linkpreview' (chat.gateway.ts /
      // link-preview.queue.ts) — this was listening for a name ('link_preview')
      // the server never sends, so a link's preview never reached the
      // visitor's own chat window once fetched.
      socketService.on<{ messageId: number; linkPreview: KerLinkPreview }>('chat:message:linkpreview', (data) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, linkPreview: data.linkPreview } : m)),
        );
      }),
    ];
    return () => { unsubs.forEach((u) => u()); };
  }, [isOpen]);

  // Reset unread when opened
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenChat?.();
  }, [onOpenChat]);

  const close = useCallback(() => {
    setIsOpen(false);
    onCloseChat?.();
  }, [onCloseChat]);

  const toggle = useCallback(() => {
    setIsOpen((v) => !v);
  }, []);

  const campaigns = useCampaignTriggers({
    widgetKey,
    screen,
    hasChatted: messages.length > 0 || conversations.length > 0 || currentConversation !== null,
    chatOpen: isOpen,
  });
  const noteCampaignReply = campaigns.noteReply;

  const sendMessage = useCallback(
    async (body: string, attachments?: KerAttachment[]) => {
      noteCampaignReply();
      let convId = currentConversation?.id ?? null;
      if (!convId && draftCreation.current) convId = await draftCreation.current.promise;
      const tempId = `opt_${Date.now()}`;
      const firstAttachment = attachments?.[0];
      const optimistic: KerMessage = {
        id: tempId,
        body,
        createdAt: new Date().toISOString(),
        senderType: 'visitor',
        status: 'pending',
        attachments,
        // Mirrors the real wire format (type + metadata) so MessageBubble has
        // one rendering path for both this optimistic bubble and the real
        // echo that replaces it — metadata.url here is firstAttachment.url,
        // the local-only preview (see KerAttachment), not a fetchable server URL.
        type: firstAttachment?.type as KerMessage['type'],
        metadata: firstAttachment ? { url: firstAttachment.url, fileName: firstAttachment.name } : undefined,
      };
      setMessages((prev) => [...prev, optimistic]);

      if (!socketService.isConnected) {
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...m, status: 'failed' as const } : m),
        );
        return;
      }

      pendingTempIds.current.set(tempId, body);
      if (!convId) {
        let resolve!: (id: number | null) => void;
        const promise = new Promise<number | null>((r) => { resolve = r; });
        draftCreation.current = { tempId, promise, resolve };
      }
      socketService.sendMessage(convId ?? undefined, body, attachments);

      // Mark failed if no echo from server within 8s
      const timer = setTimeout(() => {
        if (draftCreation.current?.tempId === tempId) {
          draftCreation.current.resolve(null);
          draftCreation.current = null;
        }
        if (pendingTempIds.current.has(tempId)) {
          pendingTempIds.current.delete(tempId);
          pendingFailTimers.current.delete(tempId);
          setMessages((prev) =>
            prev.map((m) => m.id === tempId ? { ...m, status: 'failed' as const } : m),
          );
        }
      }, 8000);
      pendingFailTimers.current.set(tempId, timer);
    },
    [currentConversation, noteCampaignReply],
  );

  const retryMessage = useCallback(
    async (msg: KerMessage) => {
      if (msg.status !== 'failed') return;
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      await sendMessage(msg.body, msg.attachments);
    },
    [sendMessage],
  );

  const setUser = useCallback(
    (user: KerUser) => {
      setCurrentUser(user);
      StorageService.set('user', user);
      if (sessionId) {
        ApiService.post('/widget/identify', { user }).catch(() => {});
      }
    },
    [sessionId],
  );

  const clearUser = useCallback(() => {
    setCurrentUser(null);
    StorageService.remove('user');
    setMessages([]);
    setCurrentConversation(null);
  }, []);

  const updateAttribute = useCallback(
    (key: string, value: string) => {
      const attrs = currentUser?.customAttributes ?? {};
      const updated = { ...currentUser, customAttributes: { ...attrs, [key]: value } };
      setCurrentUser(updated as KerUser);
      ApiService.post('/widget/identify', { user: updated }).catch(() => {});
    },
    [currentUser],
  );

  const requestNotificationPermission = useCallback(async () => {
    const granted = await NotificationService.requestExpoPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      const token = await NotificationService.getExpoToken();
      if (token) {
        NotificationService.registerToken(token);
        notifications?.onTokenRegister?.(token);
      }
    }
    return granted;
  }, [notifications]);

  const registerNotificationToken = useCallback((token: string) => {
    NotificationService.registerToken(token);
    notifications?.onTokenRegister?.(token);
  }, [notifications]);

  /**
   * Open the chat widget with contextual data pre-loaded.
   * The context is sent to the backend so the agent sees it immediately.
   *
   * Use cases: product click, order inquiry, failed transaction, ride issue, etc.
   */
  // Search-bar launcher: ChatScreen sends the text (and any staged attachment) on mount.
  const openWithDraft = useCallback((draft: { text: string }) => {
    setChatDraft({ text: draft.text });
    setIsOpen(true);
  }, []);
  const clearChatDraft = useCallback(() => setChatDraft(null), []);

  const openWithContext = useCallback((context: KerChatContext) => {
    if (!sessionId) return;

    // Fire-and-forget: send context to backend
    ApiService.post('/widget/context', {
      contextType: context.type,
      contextId: context.id ?? null,
      contextTitle: context.title ?? null,
      contextData: context.data ?? null,
    }).catch(() => {});

    if (context.openChat !== false) {
      setIsOpen(true);
      onOpenChat?.();
    }
  }, [sessionId, onOpenChat]);

  const ctx: KerAbieContextValue = {
    isOpen,
    open,
    close,
    toggle,
    unreadCount,
    conversations,
    currentConversation,
    messages,
    sendMessage,
    retryMessage,
    isTyping,
    isAiTyping,
    onlineAgents,
    isConnected,
    currentUser,
    setUser,
    clearUser,
    updateAttribute,
    appName,
    appVersion: currentAppVersion,
    appBuild,
    setAppVersion: setCurrentAppVersion,
    hasNotificationPermission,
    requestNotificationPermission,
    registerNotificationToken,
    visitorName: currentUser?.name ?? '',
    chatDraft,
    openWithDraft,
    clearChatDraft,
    openWithContext,
    config: {
      widgetKey,
      openMode,
      position,
      hideFloatingButton,
      theme,
      ticketsEnabled,
      launcherType: mergedChatSettings.launcherType ?? 'bubble',
      searchbarPlaceholder: mergedChatSettings.searchbarPlaceholder ?? 'Ask anything...',
    },
  };

  return (
    <KerAbieContext.Provider value={ctx}>
      {children}
      {campaigns.campaign && (
        <CampaignBanner
          campaign={campaigns.campaign}
          theme={theme}
          name={mergedChatSettings.name ?? appName ?? ''}
          position={position}
          onDismiss={campaigns.dismiss}
          onOpen={() => { campaigns.engage(false); open(); }}
          onCta={() => {
            const c = campaigns.campaign!;
            campaigns.engage(true);
            if (c.ctaAction === 'open_link') {
              // The API only accepts http(s) links; check again so a bad value can never launch another scheme.
              if (c.ctaUrl && /^https?:\/\//i.test(c.ctaUrl)) Linking.openURL(c.ctaUrl).catch(() => {});
            } else if (c.ctaAction === 'open_kb' && onOpenKnowledgeBase) {
              onOpenKnowledgeBase();
            } else {
              open();
            }
          }}
        />
      )}
      {openMode === 'modal' && (
        <Modal
          visible={isOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={close}
        >
          <ChatScreen onClose={close} theme={theme} chatSettings={mergedChatSettings} />
        </Modal>
      )}
      {openMode !== 'modal' && !hideFloatingButton && isOpen && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, pointerEvents: 'box-none' }}>
          <ChatScreen onClose={close} theme={theme} chatSettings={mergedChatSettings} />
        </View>
      )}
    </KerAbieContext.Provider>
  );
}
