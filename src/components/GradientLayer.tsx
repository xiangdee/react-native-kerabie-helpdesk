import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { KerTheme } from '../types';

// Same none/small/medium/large setting as the web widget's --ker-radius,
// scaled for chat bubbles — 'medium' keeps the SDK's original 18px look.
const BUBBLE_RADIUS = { none: 0, small: 8, medium: 18, large: 24 } as const;

export function bubbleRadius(theme: KerTheme): number {
  return BUBBLE_RADIUS[theme.borderRadius ?? 'medium'] ?? BUBBLE_RADIUS.medium;
}

/** [primary, secondary] when the org chose a gradient (ChatWidget.colorType), else null. */
export function gradientColors(theme: KerTheme): [string, string] | null {
  if (theme.colorType !== 'gradient' || !theme.primaryColor || !theme.secondaryColor) return null;
  return [theme.primaryColor, theme.secondaryColor];
}

// expo-linear-gradient is an optional peer dependency (same pattern as
// expo-image-picker in attachment.service.ts) — bare React Native apps
// without it just keep the parent's flat backgroundColor.
type LinearGradientComponent = React.ComponentType<any>;
let loaded: LinearGradientComponent | null | undefined;
let loading: Promise<LinearGradientComponent | null> | null = null;

function loadLinearGradient(): Promise<LinearGradientComponent | null> {
  if (!loading) {
    loading = import('expo-linear-gradient')
      .then((m) => m.LinearGradient as LinearGradientComponent)
      .catch(() => null)
      .then((c) => (loaded = c));
  }
  return loading;
}

/**
 * Paints a 135deg gradient (matching the web widget) behind its parent's
 * content. The parent needs `overflow: 'hidden'` so this is clipped to its
 * border radius.
 */
export function GradientLayer({ colors }: { colors: [string, string] | null }) {
  // Wrapped in an object: useState/setState treat a bare function (which a
  // component is) as a lazy initializer/updater instead of storing it.
  const [mod, setMod] = useState<{ LinearGradient: LinearGradientComponent | null }>({ LinearGradient: loaded ?? null });

  useEffect(() => {
    if (colors && loaded === undefined) loadLinearGradient().then((c) => setMod({ LinearGradient: c }));
  }, [colors]);

  const { LinearGradient } = mod;
  if (!colors || !LinearGradient) return null;
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
