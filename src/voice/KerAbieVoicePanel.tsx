import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { usePalette } from '../theme/palette';
import { KerAbieOrb } from './KerAbieOrb';
import { useKerAbieVoice } from './useKerAbieVoice';
import type { VoiceActivity, VoiceErrorCode } from './voiceState';

interface Props {
  /** What the AI is called on screen. */
  name?: string;
  /** Space to keep clear at the bottom, for a tab bar. */
  bottomInset?: number;
}

const STATUS: Record<VoiceActivity, string> = { listening: 'Listening', thinking: 'Working on it', speaking: 'Speaking' };

const ERRORS: Record<VoiceErrorCode, (name: string) => string> = {
  unavailable: (n) => `${n} is not available right now.`,
  limit_reached: () => 'The voice minutes for this month are used up.',
  busy: () => 'Voice is busy at the moment. Try again in a moment.',
  permission: (n) => `Allow the microphone to talk to ${n}.`,
  connection: () => 'The connection dropped. Try again.',
};

const ENDED: Record<string, string> = {
  limit: 'The session reached its time limit.',
  idle: 'The session ended because it was quiet.',
  error: 'Something went wrong. Try again.',
};

/**
 * The voice session, in a panel at the bottom of the screen that leaves the app above it visible and usable, so the customer
 * sees the app change as the AI opens screens and fills things in. It can be pulled up to read the whole conversation, or
 * shrunk to a small orb that keeps listening. Render it once near the root of the app, inside `KerAbieProvider`.
 */
export function KerAbieVoicePanel({ name = 'Kerabie Agent', bottomInset = 0 }: Props) {
  const { config } = useKerAbieContext();
  const palette = usePalette(config.theme);
  const { theme } = config;
  const voice = useKerAbieVoice();
  const { height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [small, setSmall] = useState(false);

  const message = voice.error ? ERRORS[voice.error](name) : voice.endedReason && ENDED[voice.endedReason] ? ENDED[voice.endedReason] : null;

  // A message is shown for a few seconds, then the panel goes away by itself.
  useEffect(() => {
    if (!message || voice.active) return;
    const t = setTimeout(voice.dismiss, 5000);
    return () => clearTimeout(t);
  }, [message, voice.active, voice.dismiss]);

  useEffect(() => {
    if (!voice.active) {
      setExpanded(false);
      setSmall(false);
    }
  }, [voice.active]);

  if (!voice.active && !message) return null;

  const font = theme.fontFamily;

  if (small && voice.active) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Open ${name}`}
          onPress={() => setSmall(false)}
          style={[styles.floating, { right: 16, bottom: 16 + bottomInset, backgroundColor: palette.background, borderColor: palette.border }]}
          activeOpacity={0.85}
        >
          <KerAbieOrb activity={voice.activity} size={30} />
        </TouchableOpacity>
      </View>
    );
  }

  const lastUser = [...voice.lines].reverse().find((l) => l.role === 'user');
  const lastAgent = [...voice.lines].reverse().find((l) => l.role === 'agent');

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <View
        style={[
          styles.panel,
          {
            height: Math.max(230, Math.round(height * (expanded ? 0.6 : 0.27))),
            paddingBottom: 12 + bottomInset,
            backgroundColor: palette.background,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text, fontFamily: font }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.status, { color: palette.textMuted, fontFamily: font }]}>
            {message ? '' : voice.phase === 'connecting' ? 'Connecting' : voice.muted ? 'Muted' : STATUS[voice.activity]}
          </Text>
          {voice.active && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Make smaller" onPress={() => setSmall(true)} hitSlop={10} style={styles.headerButton}>
              <Text style={{ color: palette.textMuted, fontSize: 18 }}>{'–'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {message ? (
          <View style={styles.body}>
            <Text style={[styles.message, { color: palette.text, fontFamily: font }]}>{message}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={voice.dismiss} style={[styles.button, { backgroundColor: palette.surface }]}>
              <Text style={[styles.buttonText, { color: palette.text, fontFamily: font }]}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.orb}>
              <KerAbieOrb activity={voice.phase === 'connecting' ? 'thinking' : voice.activity} size={expanded ? 64 : 56} />
            </View>

            {expanded ? (
              <ScrollView style={styles.transcript} contentContainerStyle={{ gap: 6 }}>
                {voice.lines.map((l) => (
                  <Text key={l.id} style={{ color: l.role === 'user' ? palette.textMuted : palette.text, fontFamily: font, fontSize: 15, textAlign: l.role === 'user' ? 'right' : 'left' }}>
                    {l.text.trim()}
                  </Text>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.transcript}>
                {!!lastUser && (
                  <Text numberOfLines={1} style={{ color: palette.textMuted, fontFamily: font, fontSize: 13, textAlign: 'center' }}>
                    {lastUser.text.trim()}
                  </Text>
                )}
                {!!lastAgent && (
                  <Text numberOfLines={2} style={{ color: palette.text, fontFamily: font, fontSize: 15, textAlign: 'center' }}>
                    {lastAgent.text.trim()}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.controls}>
              <TouchableOpacity accessibilityRole="button" onPress={() => voice.setMuted(!voice.muted)} style={[styles.button, { backgroundColor: palette.surface }]}>
                <Text style={[styles.buttonText, { color: palette.text, fontFamily: font }]}>{voice.muted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded((e) => !e)} style={[styles.button, { backgroundColor: palette.surface }]}>
                <Text style={[styles.buttonText, { color: palette.text, fontFamily: font }]}>{expanded ? 'Smaller' : 'Transcript'}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="End" onPress={voice.stop} style={[styles.button, { backgroundColor: '#dc2626' }]}>
                <Text style={[styles.buttonText, { color: '#ffffff', fontFamily: font }]}>End</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The overlay itself ignores touches (`box-none`), so only the panel catches them and the app above stays usable.
  overlay: { justifyContent: 'flex-end' },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  status: { fontSize: 13, flex: 1 },
  headerButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  orb: { alignItems: 'center', justifyContent: 'center', marginTop: -4, marginBottom: -8 },
  transcript: { flex: 1, minHeight: 0, justifyContent: 'center', gap: 4 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  message: { fontSize: 15, textAlign: 'center' },
  button: { paddingHorizontal: 18, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '600' },
  floating: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
});
