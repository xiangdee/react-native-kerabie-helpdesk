import { useCallback, useSyncExternalStore } from 'react';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { voiceController } from './voiceController';

/**
 * Talk to the AI by voice, live, over the chat's own connection. Needs a development build with
 * `@kerabie/realtime-audio` (it does the microphone with echo cancelling, and plays the speech). Show it with
 * `<KerAbieVoicePanel />` once near the root of your app, and start it from your own button with `start`.
 *
 * `available` is true when the AI voice agent is on in the dashboard and the plan has AI minutes left. Pass `otherCallActive` (true while your
 * own call is going on) to keep it from starting, since two things cannot share the microphone.
 */
export function useKerAbieVoice(options?: { otherCallActive?: boolean }) {
  const { config } = useKerAbieContext();
  const state = useSyncExternalStore(voiceController.subscribe, voiceController.getSnapshot);
  const blocked = options?.otherCallActive ?? false;

  const start = useCallback(() => {
    if (!blocked) void voiceController.start();
  }, [blocked]);

  return {
    available: config.aiVoiceEnabled,
    blocked,
    /** A session is starting or going on. */
    active: state.phase !== 'idle',
    ...state,
    start,
    stop: useCallback(() => voiceController.stop(), []),
    setMuted: useCallback((muted: boolean) => voiceController.setMuted(muted), []),
    dismiss: useCallback(() => voiceController.dismiss(), []),
  };
}

/** The loudness (0 to 1) of the customer's voice and of the AI's, many times a second, for drawing the orb. */
export function useVoiceLevels() {
  return useSyncExternalStore(voiceController.subscribeLevels, voiceController.getLevels);
}

export type KerAbieVoice = ReturnType<typeof useKerAbieVoice>;
