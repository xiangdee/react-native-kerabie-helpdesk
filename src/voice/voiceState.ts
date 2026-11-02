export type VoicePhase = 'idle' | 'connecting' | 'active';
export type VoiceActivity = 'listening' | 'thinking' | 'speaking';
export type VoiceErrorCode = 'unavailable' | 'limit_reached' | 'busy' | 'permission' | 'connection';

export interface VoiceLine {
  id: number;
  role: 'user' | 'agent';
  text: string;
  /** The speaker has finished this line. */
  final: boolean;
}

export interface VoiceSnapshot {
  phase: VoicePhase;
  activity: VoiceActivity;
  /** The last few lines of the conversation, oldest first. */
  lines: VoiceLine[];
  muted: boolean;
  error: VoiceErrorCode | null;
  /** Why the last session ended ('goodbye', 'limit', 'idle', ...), until the next one starts. */
  endedReason: string | null;
}

export type VoiceAction =
  | { type: 'connecting' }
  | { type: 'ready' }
  | { type: 'activity'; activity: VoiceActivity }
  | { type: 'transcript'; role: 'user' | 'agent'; text: string; final: boolean }
  | { type: 'interrupted' }
  | { type: 'muted'; muted: boolean }
  | { type: 'dismiss' }
  | { type: 'error'; code: VoiceErrorCode }
  | { type: 'ended'; reason: string };

export const MAX_LINES = 8;

export const initialVoice: VoiceSnapshot = { phase: 'idle', activity: 'listening', lines: [], muted: false, error: null, endedReason: null };

export function voiceReducer(s: VoiceSnapshot, a: VoiceAction): VoiceSnapshot {
  switch (a.type) {
    case 'connecting':
      return { ...initialVoice, phase: 'connecting', muted: s.muted };
    case 'ready':
      return { ...s, phase: 'active', activity: 'listening' };
    case 'activity':
      return s.phase === 'active' ? { ...s, activity: a.activity } : s;
    case 'transcript': {
      const lines = s.lines.slice();
      const last = lines[lines.length - 1];
      if (a.final) {
        // Closes the speaker's open line. An empty final piece never makes a line of its own.
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].role === a.role && !lines[i].final) {
            lines[i] = { ...lines[i], final: true };
            break;
          }
        }
        return { ...s, lines };
      }
      if (last && last.role === a.role && !last.final) lines[lines.length - 1] = { ...last, text: last.text + a.text };
      else lines.push({ id: (last?.id ?? 0) + 1, role: a.role, text: a.text, final: false });
      return { ...s, lines: lines.slice(-MAX_LINES) };
    }
    case 'interrupted': {
      const lines = s.lines.map((l) => (l.role === 'agent' ? { ...l, final: true } : l));
      return { ...s, lines, activity: 'listening' };
    }
    case 'muted':
      return { ...s, muted: a.muted };
    case 'dismiss':
      return { ...initialVoice, muted: s.muted };
    case 'error':
      return { ...s, phase: 'idle', error: a.code };
    case 'ended':
      return { ...s, phase: 'idle', activity: 'listening', endedReason: a.reason };
  }
}
