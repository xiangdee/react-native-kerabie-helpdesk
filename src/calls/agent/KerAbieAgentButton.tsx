import React from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { useKerAbieContext } from '../../provider/KerAbieContext';
import { usePalette } from '../../theme/palette';
import { KerAbieCallModal } from '../KerAbieCallModal';
import { DEFAULT_AGENT_NAME, useKerAbieAgent, type KerAbieAgentOptions } from './useKerAbieAgent';

interface Props extends KerAbieAgentOptions {
  /** The agent's name, on the button and on the call screen. Defaults to "Kerabie Agent". */
  name?: string;
  /** Button text. Defaults to "Talk to {name}". */
  label?: string;
  style?: StyleProp<ViewStyle>;
  /** Set to false when your app already manages LiveKit's audio session. */
  manageAudioSession?: boolean;
}

/**
 * A button that starts the voice agent, and the call screen it opens. Renders nothing when calls or the AI voice agent
 * are off in the dashboard, so it is safe to leave in your layout.
 */
export function KerAbieAgentButton({ name = DEFAULT_AGENT_NAME, label, style, getUserToken, ui, actions, manageAudioSession }: Props) {
  const agent = useKerAbieAgent({ getUserToken, ui, actions, manageAudioSession });
  const { config } = useKerAbieContext();
  const palette = usePalette(config.theme);

  return (
    <>
      {agent.available && (
        <TouchableOpacity
          onPress={agent.start}
          disabled={agent.call.state.phase !== 'idle'}
          accessibilityRole="button"
          accessibilityLabel={label ?? `Talk to ${name}`}
          style={[styles.button, { backgroundColor: palette.primary }, style]}
        >
          <Text style={[styles.label, { color: palette.onPrimary, fontFamily: config.theme.fontFamily }]}>{label ?? `Talk to ${name}`}</Text>
        </TouchableOpacity>
      )}
      <KerAbieCallModal call={agent.call} inRoom={agent.inRoom} label={name} />
    </>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, borderRadius: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
});
