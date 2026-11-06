import { Platform } from 'react-native';
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

/** What the AI agent needs with each message. */
export interface AgentPayload {
  userToken?: string;
  uiTools?: string[];
  appActions?: { name: string; description: string; parameters?: Record<string, unknown> }[];
}

/** The agent asks the app to show a screen or run an action, and waits. */
export interface AgentRequest {
  requestId: string;
  kind: 'ui' | 'action';
  name: string;
  args: Record<string, any>;
}

class KerSocketService {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  // The screen the app said the visitor is on (see setScreen), re-sent after every reconnect.
  private screen: string | null = null;
  private screenSince = 0;
  // What the AI agent needs with each message (the signed-in customer's token and the app's screens and actions).
  private agentSource: (() => Promise<AgentPayload | undefined>) | null = null;
  // Messages leave in the order they were sent, even though reading the token is asynchronous.
  private sendChain: Promise<void> = Promise.resolve();

  connect(config: SocketConfig) {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(`${SOCKET_URL}/chat`, {
      transports: ['websocket'],
      auth: { role: 'visitor' },
      // Exponential backoff with jitter, retrying forever: 1s, 2s, 4s ... capped at 30s, each
      // randomised by +-50%, so devices don't all hit the server at once when it comes back.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
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
          // Lets agents see ios or android next to the app version.
          ...(Platform.OS === 'ios' || Platform.OS === 'android' ? { platform: Platform.OS } : {}),
          ...(config.user?.customAttributes ?? {}),
        },
      });
      if (this.screen) this.socket?.emit('visitor:page', { url: this.screen });
      this.emit('connect', undefined);
    });

    // conversationId is the visitor's most recent open conversation, or null —
    // connecting never creates one; the first message does.
    this.socket.on('visitor:ready', (data: { conversationId: number | null; sessionId: string; agentsOnline: boolean }) => {
      this.emit('visitor_ready', data);
    });

    this.socket.on('disconnect', () => this.emit('disconnect', undefined));
    this.socket.on('chat:message', (data: KerMessage) => this.emit('message', data));
    this.socket.on('agent:request', (data: AgentRequest) => this.emit('agent_request', data));
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
    // Where a call stands, for the optional calls entry point (react-native-kerabie-helpdesk/calls).
    this.socket.on('call:incoming', (data: any) => this.emit('call_incoming', data));
    this.socket.on('call:ringing', (data: any) => this.emit('call_ringing', data));
    this.socket.on('call:queued', (data: any) => this.emit('call_queued', data));
    this.socket.on('call:accepted', (data: any) => this.emit('call_accepted', data));
    this.socket.on('call:ended', (data: any) => this.emit('call_ended', data));
    this.socket.on('chat:message:start', (data: any) => this.emit('message_start', data));
    this.socket.on('chat:message:chunk', (data: any) => this.emit('message_chunk', data));
    // Live voice with the AI (see src/voice).
    for (const event of ['ready', 'state', 'transcript', 'audio', 'interrupted', 'ended', 'error'] as const) {
      this.socket.on(`voice:${event}`, (data: any) => this.emit(`voice_${event}`, data));
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /**
   * Tells the server which screen the visitor is on (a path such as "/checkout") and how long they stayed on the one
   * before, so agents see the page and the recent screens. Same screen again changes nothing.
   */
  setScreen(path: string) {
    const next = path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`;
    if (next === this.screen) return;
    const previous = this.screen;
    const now = Date.now();
    if (previous) this.socket?.emit('visitor:page_exit', { url: previous, timeSpentMs: now - this.screenSince });
    this.screen = next;
    this.screenSince = now;
    this.socket?.emit('visitor:page', { url: next, ...(previous ? { previousUrl: previous } : {}) });
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
    choice?: { flowId: string; choiceId: string },
  ) {
    const first = attachments?.[0];
    this.sendChain = this.sendChain.then(async () => {
      let agent: AgentPayload | undefined;
      try { agent = await this.agentSource?.(); } catch { agent = undefined; }
      this.socket?.emit('visitor:message', {
        conversationId,
        body,
        choice,
        type: first?.type,
        metadata: first ? { key: first.key, fileName: first.name } : undefined,
        // An empty object (not nothing) tells the server nobody is signed in any more.
        ...(this.agentSource ? { agent: agent ?? {} } : {}),
      });
    });
  }

  /** Sets where the agent's details come from, or null when the app has no agent. */
  setAgentSource(source: (() => Promise<AgentPayload | undefined>) | null) {
    this.agentSource = source;
  }

  /** Starts a live voice session with the AI. The server answers with `voice_ready`, or `voice_error` and the reason. */
  async voiceStart() {
    let agent: AgentPayload | undefined;
    try { agent = await this.agentSource?.(); } catch { agent = undefined; }
    this.socket?.emit('voice:start', this.agentSource ? { agent: agent ?? {} } : {});
  }

  /** The customer's speech: 16-bit little-endian PCM at 16 kHz, mono. */
  voiceAudio(pcm: Uint8Array) {
    this.socket?.volatile.emit('voice:audio', pcm);
  }

  voiceStop() {
    this.socket?.emit('voice:stop');
  }

  /** Answers the agent's request for a screen or action. */
  answerAgent(requestId: string, result?: string, error?: string) {
    this.socket?.emit('agent:result', { requestId, ...(error ? { error } : { result }) });
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
