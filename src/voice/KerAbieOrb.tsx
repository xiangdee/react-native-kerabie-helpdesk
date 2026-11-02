import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { usePalette } from '../theme/palette';
import type { VoiceActivity } from './voiceState';
import { useVoiceLevels } from './useKerAbieVoice';

interface Props {
  activity: VoiceActivity;
  size?: number;
}

/**
 * The orb: it swells with the customer's voice while they talk, with the AI's voice while it talks, and breathes slowly
 * while the AI is working. Drawn with plain `Animated` circles, so it needs no graphics library.
 */
export function KerAbieOrb({ activity, size = 84 }: Props) {
  const { config } = useKerAbieContext();
  const palette = usePalette(config.theme);
  const { input, output } = useVoiceLevels();
  const level = activity === 'speaking' ? output : activity === 'listening' ? input : 0;

  const swell = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  // Follows the voice: a short spring per update keeps the motion smooth without redrawing the screen.
  useEffect(() => {
    Animated.spring(swell, { toValue: level, speed: 40, bounciness: 0, useNativeDriver: true }).start();
  }, [level, swell]);

  // Slow breathing while the AI is thinking, and a gentle idle pulse otherwise.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: activity === 'thinking' ? 700 : 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: activity === 'thinking' ? 700 : 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activity, breathe]);

  const color = activity === 'speaking' ? palette.accent : palette.primary;
  const coreScale = Animated.add(1, Animated.add(Animated.multiply(swell, 0.28), Animated.multiply(breathe, activity === 'thinking' ? 0.1 : 0.03)));
  const glowScale = Animated.add(1.15, Animated.add(Animated.multiply(swell, 0.6), Animated.multiply(breathe, activity === 'thinking' ? 0.2 : 0.06)));

  return (
    <View style={{ width: size * 1.7, height: size * 1.7, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="image" accessibilityLabel={activity}>
      <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.22, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ scale: coreScale }] }]} />
      <View style={[styles.circle, { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, backgroundColor: '#ffffff', opacity: 0.35 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: 'absolute' },
});
