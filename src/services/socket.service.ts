import { io, Socket } from 'socket.io-client';
import { KerMessage, KerUser } from '../types';

const SOCKET_URL = 'https://api.kerabie.com';

interface SocketConfig {
  widgetKey: string;
  sessionId: string;
  orgId: number;
  appName: string;
  appVersion: string;
  appBuild: string;
  user?: KerUser;
}

type EventHandler<T = any> = (data: T) => void;

class KerSocketService {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  connect(config: SocketConfig) {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(`${SOCKET_URL}/chat`, {
      transports: ['websocket'],
      auth: { role: 'visitor' },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      // Emit visitor:init after connection
      this.socket?.emit('visitor:init', {
        orgId: config.orgId,
        sessionId: config.sessionId,
        name: config.user?.name,
        email: config.user?.email,
        customData: {
          appName: config.appName,
          appVersion: config.appVersion,
          appBuild: config.appBuild,
          ...(config.user?.customAttributes ?? {}),
        },
      });
      this.emit('connect', undefined);
    });

    // conversationId is the visitor's most recent open conversation, or null —
    // connecting never creates one; the first message does.
    this.socket.on('visitor:ready', (data: { conversationId: number | null; sessionId: string; agentsOnline: boolean }) => {
      this.emit('visitor_ready', data);
    });

    this.socket.on('disconnect', () => this.emit('disconnect', undefined));
    this.socket.on('chat:message', (data: KerMessage) => this.emit('message', data));
    this.socket.on('chat:typing', (data: any) => this.emit('typing', data));
    this.socket.on('chat:read', (data: any) => this.emit('read', data));
    // The backend emits 'agents:online' and 'chat:status_change' (see
    // chat.gateway.ts) — this previously listened for 'chat:online_agents'
    // and 'chat:conversation_updated', neither of which the server ever
    // sends, so online-agent-count updates and status changes never reached
    // this SDK. Local re-emit names kept as-is for any existing consumers.
    this.socket.on('agents:online', (data: any) => this.emit('online_agents', data));
    this.socket.on('chat:status_change', (data: any) => this.emit('conversation_updated', data));
    this.socket.on('chat:message:linkpreview', (data: any) => this.emit('link_preview', data));
    // AI reply streaming (see chat.gateway.ts runChatbot) — start fires once
    // the first token arrives, chunk on every subsequent token, then the
    // normal 'chat:message' carries the persisted final message with a
    // matching streamId so the provider can swap the streaming bubble for it.
    this.socket.on('chat:message:start', (data: any) => this.emit('message_start', data));
    this.socket.on('chat:message:chunk', (data: any) => this.emit('message_chunk', data));
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // The backend's visitor message handler is 'visitor:message' (chat.gateway.ts
  // handleVisitorMessage) — this previously emitted 'chat:send', which the
  // server has no listener for at all, so every message sent from this SDK
  // was silently dropped (no error, no ack — it just vanished).
  // handleVisitorMessage accepts one attachment per message (type + metadata),
  // not an array, so only the first of `attachments` is actually forwarded.
  // Only `key` goes to the server — attachments are private objects (see
  // chat-attachment.queue.ts), so `url` (the local file:// preview, used only
  // for this client's own optimistic bubble) isn't a real fetchable URL and
  // there's nothing useful for the server to do with it.
  // conversationId undefined = first message of a new conversation; the server
  // creates it and the 'chat:message' echo carries the new id.
  sendMessage(
    conversationId: number | undefined,
    body: string,
    attachments?: Array<{ type: 'image' | 'file' | 'audio' | 'video'; key?: string; name?: string }>,
  ) {
    const first = attachments?.[0];
    this.socket?.emit('visitor:message', {
      conversationId,
      body,
      type: first?.type,
      metadata: first ? { key: first.key, fileName: first.name } : undefined,
    });
  }

  // chat.gateway.ts's TypingDto field is `typing`, not `isTyping` — every
  // typing indicator sent from this SDK was silently dropped server-side
  // (class-validator's whitelist strips unknown fields, so `dto.typing` was
  // always undefined and the handler's `if (dto.typing)` branch never ran).
  sendTyping(conversationId: number, isTyping: boolean) {
    this.socket?.emit('chat:typing', { conversationId, typing: isTyping });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on<T = any>(event: string, handler: EventHandler<T>) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }
}

export const socketService = new KerSocketService();
