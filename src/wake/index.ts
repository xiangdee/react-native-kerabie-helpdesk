// Wake the AI agent by saying its name. Import from 'react-native-kerabie-helpdesk/wake' — it needs expo-speech-recognition
// and a development build, so the main package and the calls entry point never load it.
export { useKerAbieWakeWord } from './useKerAbieWakeWord';
export type { KerAbieWakeWordOptions, KerAbieWakeWordState } from './useKerAbieWakeWord';
export { heardWake, wakeNames } from './wakeWord';
