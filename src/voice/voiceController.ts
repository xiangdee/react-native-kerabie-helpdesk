import { socketService } from '../services/socket.service';
import { Downsampler, asBytes } from './pcm';
import { PlaybackPacer } from './playbackPacer';
import { initialVoice, voiceReducer, type VoiceAction, type VoiceSnapshot } from './voiceState';

/** The parts of `@kerabie/realtime-audio` this uses. Loaded only when a session starts, so apps without it still load. */
interface RealtimeAudio {
  initialize(): Promise<unknown>;
  tearDown(): void;
  toggleRecording(on: boolean): boolean;
  playPCMData(pcm: Uint8Array): void;
  clearPlayback(): void;
  requestMicrophonePermissionsAsync(): Promise<{ granted: boolean }>;
  addKerabieRealtimeAudioEventListener(event: string, handler: (e: { data: any }) => void): { remove(): void };
}

type Listener = () => void;

/** How often speech waiting to be played is handed to the player. */
const PACE_MS = 50;
/** How long the server gets to answer a start before the attempt is given up. */
const START_TIMEOUT_MS = 10_000;

/**
 * One live voice session at a time, for the whole app. The orb and the panel read its state; `start` and `stop` are the
 * only ways in. Microphone speech goes to the server over the chat's own connection; the AI's speech and what it is doing
 * come back as events.
 */
class VoiceController {
  private snapshot: VoiceSnapshot = initialVoice;
  private listeners = new Set<Listener>();
  private levels = { input: 0, output: 0 };
  private levelListeners = new Set<Listener>();

  private audio: RealtimeAudio | null = null;
  private subscriptions: { remove(): void }[] = [];
  private offSocket: (() => void)[] = [];
  private downsampler = new Downsampler();
  private pacer: PlaybackPacer | null = null;
  private pace: ReturnType<typeof setInterval> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  getSnapshot = () => this.snapshot;
  getLevels = () => this.levels;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  };

  /** For the orb, which follows the loudness of the speech many times a second. */
  subscribeLevels = (l: Listener) => {
    this.levelListeners.add(l);
    return () => void this.levelListeners.delete(l);
  };

  private dispatch(action: VoiceAction) {
    this.snapshot = voiceReducer(this.snapshot, action);
    this.listeners.forEach((l) => l());
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.dispatch({ type: 'connecting' });

    let audio: RealtimeAudio;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      audio = require('@kerabie/realtime-audio') as RealtimeAudio;
    } catch {
      return this.fail('unavailable');
    }
    if (!(await audio.requestMicrophonePermissionsAsync().catch(() => ({ granted: false }))).granted) return this.fail('permission');
    if (!this.running) return;
    this.audio = audio;

    this.offSocket = [
      socketService.on('voice_ready', () => void this.onReady()),
      socketService.on('voice_state', (d: { state: 'listening' | 'thinking' | 'speaking' }) => this.dispatch({ type: 'activity', activity: d.state })),
      socketService.on('voice_transcript', (d: { role: 'user' | 'agent'; text: string; final: boolean }) => this.dispatch({ type: 'transcript', ...d })),
      socketService.on('voice_audio', (d: unknown) => this.onSpeech(d)),
      socketService.on('voice_interrupted', () => {
        this.pacer?.clear();
        this.audio?.clearPlayback();
        this.dispatch({ type: 'interrupted' });
      }),
      socketService.on('voice_ended', (d: { reason?: string }) => this.finish(d?.reason ?? 'closed')),
      socketService.on('voice_error', (d: { code?: string }) => this.fail(d?.code === 'limit_reached' ? 'limit_reached' : d?.code === 'busy' ? 'busy' : 'unavailable')),
      socketService.on('disconnect', () => this.running && this.fail('connection')),
    ];
    this.startTimer = setTimeout(() => this.fail('connection'), START_TIMEOUT_MS);
    await socketService.voiceStart();
  }

  private async onReady() {
    if (this.startTimer) clearTimeout(this.startTimer);
    const audio = this.audio;
    if (!audio || !this.running) return;
    try {
      await audio.initialize();
    } catch {
      return this.fail('unavailable');
    }
    this.downsampler.reset();
    this.pacer = new PlaybackPacer((pcm) => audio.playPCMData(pcm));
    this.pace = setInterval(() => this.pacer?.pump(), PACE_MS);
    this.subscriptions = [
      // Echo cancelled by the module, so the AI does not hear itself.
      audio.addKerabieRealtimeAudioEventListener('onMicrophoneData', (e) => {
        if (!this.snapshot.muted) socketService.voiceAudio(e.data);
      }),
      audio.addKerabieRealtimeAudioEventListener('onInputVolumeLevelData', (e) => this.setLevel('input', e.data)),
      audio.addKerabieRealtimeAudioEventListener('onOutputVolumeLevelData', (e) => this.setLevel('output', e.data)),
    ];
    audio.toggleRecording(true);
    this.dispatch({ type: 'ready' });
  }

  private onSpeech(data: unknown) {
    const bytes = asBytes(data);
    if (bytes) this.pacer?.push(this.downsampler.push(bytes));
  }

  private setLevel(which: 'input' | 'output', value: number) {
    this.levels = { ...this.levels, [which]: Math.max(0, Math.min(1, Number(value) || 0)) };
    this.levelListeners.forEach((l) => l());
  }

  setMuted(muted: boolean) {
    this.dispatch({ type: 'muted', muted });
  }

  /** Clears an error or a goodbye message once the customer has seen it. */
  dismiss() {
    if (!this.running) this.dispatch({ type: 'dismiss' });
  }

  /** The customer ends the session. */
  stop() {
    if (!this.running) return;
    socketService.voiceStop();
    this.finish('user');
  }

  private finish(reason: string) {
    if (!this.running) return;
    this.cleanup();
    this.dispatch({ type: 'ended', reason });
  }

  private fail(code: 'unavailable' | 'limit_reached' | 'busy' | 'permission' | 'connection') {
    if (!this.running) return;
    socketService.voiceStop();
    this.cleanup();
    this.dispatch({ type: 'error', code });
  }

  /** Stops the microphone and the player and forgets the listeners. */
  private cleanup() {
    this.running = false;
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.pace) clearInterval(this.pace);
    this.startTimer = this.pace = null;
    this.pacer?.clear();
    this.pacer = null;
    this.subscriptions.forEach((s) => s.remove());
    this.subscriptions = [];
    this.offSocket.forEach((off) => off());
    this.offSocket = [];
    try {
      this.audio?.toggleRecording(false);
      this.audio?.tearDown();
    } catch {
      // The module was never started.
    }
    this.audio = null;
    this.levels = { input: 0, output: 0 };
    this.levelListeners.forEach((l) => l());
  }
}

export const voiceController = new VoiceController();
