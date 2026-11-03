import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { greetingHints, heardWake, wakeNames } from './wakeWord';

export interface KerAbieWakeWordOptions {
  /** The agent's name, for example "Kerabie Agent" or "Ted". Saying it (alone, or after "hi", "hey", "hello") wakes the agent. */
  name: string;
  /** Called once when the name is heard. Start the agent here. Listening stops until `enabled` is true again. */
  onWake: () => void;
  /**
   * Listen only while this is true. Pass false while a call is going (the microphone is the call's), while the agent is
   * unavailable, and whenever your app should not be listening. Default true.
   */
  enabled?: boolean;
  /** Other spellings the speech engine produces for the name ("carabie" for "Kerabie"). */
  aliases?: string[];
  /** BCP 47 language of the speech, for example "en-US" (default) or "en-NG". */
  language?: string;
  /** Only use recognition that runs on the phone, so no audio leaves it (default true). When the phone cannot, it does not listen. */
  onDeviceOnly?: boolean;
}

export type KerAbieWakeWordState = 'off' | 'asking' | 'listening' | 'denied' | 'unsupported';

/** How long to wait before listening again after the speech engine stops by itself (it ends a session after a while). */
const RESTART_DELAY_MS = 400;
/** After this many failures in a row it gives up, rather than draining the battery in a loop. */
const MAX_FAILURES = 5;

/**
 * Wake the AI agent by saying its name. Needs `expo-speech-recognition` and a development build (not Expo Go). It listens
 * only while the app is in the foreground and `enabled` is true, asks for microphone and speech permission the first time,
 * and by default only uses recognition that runs on the phone.
 *
 *   const agent = useKerAbieAgent({ ... })
 *   const wake = useKerAbieWakeWord({ name: 'Ted', enabled: agent.call.state.phase === 'idle', onWake: agent.start })
 */
export function useKerAbieWakeWord({ name, onWake, enabled = true, aliases, language = 'en-US', onDeviceOnly = true }: KerAbieWakeWordOptions) {
  const [state, setState] = useState<KerAbieWakeWordState>('off');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
  const names = useRef(wakeNames(name, aliases));
  names.current = wakeNames(name, aliases);
  const listening = useRef(false);
  /** We want to be listening. Cleared only by our own stop, so an engine that ends or errors by itself is started again. */
  const wanted = useRef(false);
  const failures = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    wanted.current = false;
    if (listening.current) {
      listening.current = false;
      try { ExpoSpeechRecognitionModule.abort(); } catch { /* already stopped */ }
    }
  }, []);

  const begin = useCallback(() => {
    if (listening.current) return;
    listening.current = true;
    wanted.current = true;
    try {
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: onDeviceOnly,
        // Helps the engine hear the name as a word it should expect.
        contextualStrings: greetingHints(name),
      });
    } catch {
      listening.current = false;
      failures.current += 1;
    }
  }, [language, name, onDeviceOnly]);

  // Decide whether to listen: enabled, in the foreground, permitted and supported.
  useEffect(() => {
    if (!enabled || !foreground) {
      stop();
      setState('off');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (onDeviceOnly && !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) { if (!cancelled) setState('unsupported'); return; }
        if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) { if (!cancelled) setState('unsupported'); return; }
        if (!cancelled) setState('asking');
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) { setState('denied'); return; }
        failures.current = 0;
        setState('listening');
        begin();
      } catch {
        if (!cancelled) setState('unsupported');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, foreground, onDeviceOnly, begin, stop]);

  useSpeechRecognitionEvent('result', (event) => {
    const heard = event.results?.[0]?.transcript;
    // In development, show what the phone heard, so a name it keeps mishearing can be added to `aliases`.
    if (__DEV__ && heard) console.log('[Kerabie wake] heard:', JSON.stringify(heard), heardWake(heard, names.current) ? '-> wake' : '');
    if (!heard || !heardWake(heard, names.current)) return;
    // Stop first: the call that follows needs the microphone.
    stop();
    setState('off');
    onWakeRef.current();
  });

  // The engine ends a session by itself after a while, and reports silence as an error: listen again in both cases, unless
  // it keeps failing. (Starting again only on 'end' was not enough: the error cleared the flag 'end' looked at, so after the
  // first quiet moment it never listened again.)
  const again = useCallback(() => {
    listening.current = false;
    if (!wanted.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (wanted.current && failures.current < MAX_FAILURES) begin(); }, RESTART_DELAY_MS);
  }, [begin]);

  useSpeechRecognitionEvent('end', again);

  useSpeechRecognitionEvent('error', (event) => {
    // Hearing nothing for a while is normal, not a failure.
    if (event.error !== 'no-speech' && event.error !== 'aborted') failures.current += 1;
    if (event.error === 'not-allowed') {
      wanted.current = false;
      setState('denied');
    }
    again();
  });

  return { state };
}
