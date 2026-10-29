import React from 'react';
import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { Icon } from '../components/Icon';
import { usePalette } from '../theme/palette';
import { KerAbieCallModal } from './KerAbieCallModal';
import { useKerAbieCall } from './useKerAbieCall';

interface Props {
  /** `icon` is a compact phone (and camera, when video is on) for headers; `button` is the labelled pill. */
  variant?: 'button' | 'icon';
  /** Start with the camera on. Only used when the dashboard allows video. */
  video?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A "Call us" button and the call screen it opens. Renders nothing when calls are off in the dashboard or the plan
 * has no minutes left, so it is safe to leave in your layout.
 */
export function KerAbieCallButton({ variant = 'button', video = false, label = 'Call us', style }: Props) {
  const call = useKerAbieCall();
  const { config } = useKerAbieContext();
  const palette = usePalette(config.theme);

  if (variant === 'icon') {
    const busy = call.state.phase !== 'idle';
    return (
      <>
        {call.available && (
          <>
            <TouchableOpacity onPress={() => call.start(false)} disabled={busy} accessibilityRole="button" accessibilityLabel="Call us" style={[styles.icon, style]}>
              <Icon name="phone" size={19} color={palette.textMuted} />
            </TouchableOpacity>
            {call.videoAvailable && (
              <TouchableOpacity onPress={() => call.start(true)} disabled={busy} accessibilityRole="button" accessibilityLabel="Video call" style={[styles.icon, style]}>
                <Icon name="video" size={21} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </>
        )}
        <KerAbieCallModal call={call} />
      </>
    );
  }

  return (
    <>
      {call.available && (
        <TouchableOpacity
          onPress={() => call.start(video)}
          disabled={call.state.phase !== 'idle'}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.button, { backgroundColor: palette.primary }, style]}
        >
          <Text style={[styles.label, { color: palette.onPrimary, fontFamily: config.theme.fontFamily }]}>{label}</Text>
        </TouchableOpacity>
      )}
      <KerAbieCallModal call={call} />
    </>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 44, borderRadius: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
});
