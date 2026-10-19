import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LiveKitRoom, VideoTrack, isTrackReference, useLocalParticipant, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { usePalette, type KerPalette } from '../theme/palette';
import type { KerTheme } from '../types';
import type { KerAbieCall } from './useKerAbieCall';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const DANGER = '#dc2626';

const ENDED_TEXT: Record<string, string> = {
  hangup: 'Call ended',
  cancelled: 'Call cancelled',
  missed: 'Nobody was available to take your call. Please try again, or send us a message.',
  declined: 'Nobody was available to take your call. Please try again, or send us a message.',
  limit: 'The call reached its time limit.',
  connection_lost: 'The call was cut off. Please try again.',
};

function RoundButton({ label, onPress, bg, fg, palette, theme }: { label: string; onPress: () => void; bg: string; fg: string; palette: KerPalette; theme: KerTheme }) {
  return (
    <View style={styles.btnWrap}>
      <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.round, { backgroundColor: bg }]}>
        <Text style={[styles.roundText, { color: fg, fontFamily: theme.fontFamily }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Rendered inside <LiveKitRoom>: the other side's video, the timer and the call controls. */
function InCall({ call, palette, theme }: { call: KerAbieCall; palette: KerPalette; theme: KerTheme }) {
  const { state, hangUp } = call;
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera]);
  const remote = tracks.find((t) => isTrackReference(t) && !t.participant.isLocal);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const who = state.handler === 'AI' ? 'AI assistant' : state.agentName || 'Support';
  return (
    <>
      <View style={styles.center}>
        {state.video && remote && isTrackReference(remote) ? (
          <View style={styles.video}><VideoTrack trackRef={remote} style={StyleSheet.absoluteFill as any} objectFit="cover" /></View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
            <Text style={[styles.avatarText, { color: palette.onPrimary, fontFamily: theme.fontFamily }]}>{who.trim().charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: palette.text, fontFamily: theme.fontFamily }]}>{who}</Text>
        <Text style={[styles.sub, { color: palette.textMuted }]}>{clock(seconds)}</Text>
      </View>
      <View style={styles.controls}>
        <RoundButton label={isMicrophoneEnabled ? 'Mute' : 'Unmute'} onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)} bg={palette.surface} fg={palette.text} palette={palette} theme={theme} />
        {state.video && (
          <RoundButton label={isCameraEnabled ? 'Camera off' : 'Camera on'} onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)} bg={palette.surface} fg={palette.text} palette={palette} theme={theme} />
        )}
        <RoundButton label="End" onPress={hangUp} bg={DANGER} fg="#ffffff" palette={palette} theme={theme} />
      </View>
    </>
  );
}

/**
 * The call screen: waiting, ringing, the call itself, and how it ended. Shown over the app while a call exists.
 * Use it with `useKerAbieCall()`, or use `<KerAbieCallButton />` which does both.
 */
export function KerAbieCallModal({ call }: { call: KerAbieCall }) {
  const { config } = useKerAbieContext();
  const palette = usePalette(config.theme);
  const { theme } = config;
  const { state, hangUp, dismiss } = call;
  if (state.phase === 'idle') return null;

  const text = (s: string, strong = false) => (
    <Text style={[strong ? styles.name : styles.sub, { color: strong ? palette.text : palette.textMuted, fontFamily: theme.fontFamily, textAlign: 'center' }]}>{s}</Text>
  );

  let body: React.ReactNode;
  if (state.phase === 'connected' && state.livekit) {
    body = (
      <View style={styles.room}>
        <LiveKitRoom
          serverUrl={state.livekit.url}
          token={state.livekit.token}
          connect
          audio
          video={state.video}
          options={{ adaptiveStream: { pixelDensity: 'screen' } }}
          onDisconnected={hangUp}
        >
          <InCall call={call} palette={palette} theme={theme} />
        </LiveKitRoom>
      </View>
    );
  } else if (state.phase === 'ended') {
    body = (
      <>
        <View style={styles.center}>
          {text(state.error ?? ENDED_TEXT[state.endReason ?? 'hangup'] ?? 'Call ended', true)}
        </View>
        <View style={styles.controls}>
          <RoundButton label="Close" onPress={dismiss} bg={palette.primary} fg={palette.onPrimary} palette={palette} theme={theme} />
        </View>
      </>
    );
  } else {
    const status =
      state.phase === 'starting' ? 'Starting the call…'
      : state.phase === 'waiting' ? `Everyone is busy right now. You're number ${state.queuePosition ?? 1} in line.`
      : 'Calling… waiting for someone to answer.';
    body = (
      <>
        <View style={styles.center}>
          <ActivityIndicator color={palette.primary} size="large" />
          {text(status, true)}
          {state.phase === 'waiting' && text('Stay on this screen. We will connect you as soon as someone is free.')}
        </View>
        <View style={styles.controls}>
          <RoundButton label="Cancel" onPress={hangUp} bg={DANGER} fg="#ffffff" palette={palette} theme={theme} />
        </View>
      </>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={hangUp} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: palette.background }]}>{body}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 64, paddingBottom: 48, paddingHorizontal: 24 },
  room: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 38, fontWeight: '700' },
  video: { width: '100%', aspectRatio: 3 / 4, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  name: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 14, lineHeight: 20 },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
  btnWrap: { alignItems: 'center' },
  round: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  roundText: { fontSize: 13, fontWeight: '600' },
});
