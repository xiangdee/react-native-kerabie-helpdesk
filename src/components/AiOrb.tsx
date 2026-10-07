import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GradientLayer } from './GradientLayer';

interface Props {
  /** Brand colors — the orb is filled with the org's gradient (or solid primary). */
  colors: [string, string] | null;
  color: string;
  textColor: string;
}

/**
 * The AI assistant "thinking" indicator — a drop of water that never holds one
 * shape. Native-driver friendly: instead of morphing borderRadius (JS-only),
 * it squashes and stretches on opposite axes while slowly rotating, which
 * reads as a liquid wobble. Mirrors the web widget's AiOrb.vue.
 */
export function AiOrb({ colors, color, textColor }: Props) {
  const squash = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(squash, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(squash, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const rotate = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true }),
    );
    wobble.start();
    rotate.start();
    return () => { wobble.stop(); rotate.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scaleX = squash.interpolate({ inputRange: [0, 1], outputRange: [1.15, 0.88] });
  const scaleY = squash.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.15] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel="Thinking">
      <Animated.View style={[styles.orb, { backgroundColor: color, transform: [{ rotate }, { scaleX }, { scaleY }] }]}>
        <View style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: color }]}>
          <GradientLayer colors={colors} />
        </View>
        <View style={styles.highlight} />
      </Animated.View>
      <Text style={[styles.label, { color: textColor }]}>Thinking…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4, paddingHorizontal: 16 },
  orb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  clip: { borderRadius: 13, overflow: 'hidden' },
  highlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  label: { fontSize: 12 },
});
