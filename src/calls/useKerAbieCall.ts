import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioSession, registerGlobals } from '@livekit/react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { socketService } from '../services/socket.service';
import { usePreChat } from '../hooks/usePreChat';
import { CallService, type AgentSession, type CallJoin } from './call.service';

export type KerCallPhase =
  | 'idle'
  /** The org asks for the pre-chat details first (the same form as the chat). */
  | 'details'
  /** Asking Kerabie to start the call. */
  | 'starting'
  /** Every agent is busy: the customer is in the queue. */
  | 'waiting'
  /** Free agents are being rung. */
  | 'ringing'
  /** Answered by a person or the AI: audio (and video) is flowing. */
  | 'connected'
  /** Over, or could not start. `endReason` or `error` says why. */
  | 'ended';

export interface KerCallState {
  phase: KerCallPhase;
  callId: number | null;
  video: boolean;
  handler: 'HUMAN' | 'AI' | null;
  agentName?: string;
  queuePosition?: number;
  /** hangup, cancelled, missed, declined, limit or connection_lost. */
  endReason?: string;
  error?: string;
  livekit: { url: string; token: string } | null;
}

const IDLE: KerCallState = { phase: 'idle', callId: null, video: false, handler: null, livekit: null };

let globalsReady = false;
// LiveKit needs its WebRTC globals registered once, before the first room is created. An app that already uses LiveKit
// has done it, so it is not done twice.
function ensureLiveKit() {
  if (globalsReady) return;
  if (typeof (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection === 'undefined') registerGlobals();
  globalsReady = true;
}

function fromJoin(join: CallJoin): KerCallState {
  return {
    phase: join.status === 'ACTIVE' ? 'connected' : join.status === 'RINGING' ? 'ringing' : 'waiting',
    callId: join.callId,
    video: join.video,
    handler: join.handler,
    queuePosition: join.queuePosition,
    livekit: join.livekit,
  };
}

/**
 * Voice and video calls with your support team. Needs the LiveKit packages and a development build, and is imported
 * from `react-native-kerabie-helpdesk/calls` so the chat itself never depends on them.
 *
 * `available` is true when the dashboard has calls on, the plan has minutes and the packages are installed.
 */
export function useKerAbieCall(options?: {
  prepare?: () => Promise<AgentSession | undefined>;
  /**
   * Start and stop the phone's audio session for the call (default true). Set it to false when your app already
   * manages LiveKit's audio session itself, so a Kerabie call does not stop yours.
   */
  manageAudioSession?: boolean;
  /**
   * True once your app has ANSWERED another call (Zego, Agora, CallKeep, your own LiveKit...). Two calls cannot share the
   * microphone, so a Kerabie call will not start while it is true, and one in progress ends when it becomes true. Set it
   * when the customer takes the other call, not while it is only ringing: let them choose first. Only your app can see
   * its other calls, so your app sets this.
   */
  otherCallActive?: boolean;
}) {
  const manageAudioSession = options?.manageAudioSession ?? true;
  const blocked = options?.otherCallActive ?? false;
  // Read when a call is placed, so the newest token is used without rebuilding the callbacks.
  const prepare = useRef(options?.prepare);
  prepare.current = options?.prepare;
  const { config } = useKerAbieContext();
  const preChat = usePreChat();
  const [state, setState] = useState<KerCallState>(IDLE);
  const callIdRef = useRef<number | null>(null);
  callIdRef.current = state.callId;

  const available = config.callsEnabled;
  const videoAvailable = config.callsEnabled && config.videoCallsEnabled;

  // Where the call stands comes from the server, which also knows when the other side hangs up.
  useEffect(() => {
    const forThisCall = (d: { callId?: number }) => callIdRef.current === null || d.callId === callIdRef.current;
    const offs = [
      socketService.on('call_ringing', (d: any) => forThisCall(d) && setState((s) => (s.phase === 'idle' ? s : { ...s, phase: 'ringing' }))),
      socketService.on('call_queued', (d: any) => forThisCall(d) && setState((s) => (s.phase === 'idle' ? s : { ...s, phase: 'waiting', queuePosition: d.position }))),
      socketService.on('call_accepted', (d: any) =>
        forThisCall(d) && setState((s) => (s.phase === 'idle' ? s : { ...s, phase: 'connected', handler: d.handler ?? s.handler, agentName: d.agentName }))),
      socketService.on('call_ended', (d: any) =>
        forThisCall(d) && setState((s) => (s.phase === 'idle' ? s : { ...s, phase: 'ended', endReason: d.reason, livekit: null }))),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // A call that was going when the app was closed picks up again.
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    CallService.current()
      .then((join) => { if (join && !cancelled) { ensureLiveKit(); setState(fromJoin(join)); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [available]);

  // The phone's audio is routed for a call only while there is one.
  const connected = state.phase === 'connected';
  useEffect(() => {
    if (!connected || !manageAudioSession) return;
    AudioSession.startAudioSession();
    return () => { AudioSession.stopAudioSession(); };
  }, [connected, manageAudioSession]);

  const placeCall = useCallback(async (video: boolean) => {
    setState({ ...IDLE, phase: 'starting', video: video && videoAvailable });
    try {
      ensureLiveKit();
      const agent = await prepare.current?.();
      setState(fromJoin(await CallService.start(video && videoAvailable, agent)));
    } catch (e: any) {
      setState({ ...IDLE, phase: 'ended', error: e?.message || 'Could not start the call. Try again in a moment.' });
    }
  }, [videoAvailable]);

  const start = useCallback(async (video = false) => {
    if (!available || blocked) return;
    // The org asks every visitor for details before a chat. A call asks the same, once.
    if (preChat.needsDetails) {
      setState({ ...IDLE, phase: 'details', video: video && videoAvailable });
      return;
    }
    await placeCall(video);
  }, [available, blocked, videoAvailable, preChat.needsDetails, placeCall]);

  /** The details were filled in: save them and place the call the visitor asked for. */
  const submitDetails = useCallback((answers: Record<string, string>) => {
    preChat.submit(answers);
    return placeCall(state.video);
  }, [preChat, placeCall, state.video]);

  const endCall = useCallback(async (reason?: string) => {
    const id = callIdRef.current;
    setState((s) => (s.phase === 'idle' ? s : { ...s, phase: 'ended', endReason: reason ?? (s.phase === 'connected' ? 'hangup' : 'cancelled'), livekit: null }));
    if (id !== null) await CallService.end(id).catch(() => {});
  }, []);

  /** Ends the call, or cancels it before it is answered. */
  const hangUp = useCallback(() => endCall(), [endCall]);

  // The app's own call started: this one steps aside, so the microphone and the audio session are the other call's.
  useEffect(() => {
    if (blocked && callIdRef.current !== null && state.phase !== 'idle' && state.phase !== 'ended') void endCall('other_call');
  }, [blocked, state.phase, endCall]);

  /** Closes the call screen once the call is over. */
  const dismiss = useCallback(() => setState(IDLE), []);

  return { available, videoAvailable, blocked, state, start, submitDetails, hangUp, dismiss };
}

export type KerAbieCall = ReturnType<typeof useKerAbieCall>;
