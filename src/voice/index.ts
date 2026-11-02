// Talk to the AI by voice, live, with an orb. Import from 'react-native-kerabie-helpdesk/voice': the main package never loads
// the audio module, so chat works in Expo Go and in apps that do not want voice.
export { useKerAbieVoice } from './useKerAbieVoice';
export type { KerAbieVoice } from './useKerAbieVoice';
export { KerAbieVoicePanel } from './KerAbieVoicePanel';
export { KerAbieOrb } from './KerAbieOrb';
export type { VoiceActivity, VoiceErrorCode, VoiceLine, VoicePhase, VoiceSnapshot } from './voiceState';
