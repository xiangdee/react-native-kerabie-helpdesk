import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useKerAbieContext } from '../provider/KerAbieContext';
import { GradientLayer, gradientColors } from './GradientLayer';
import { DEFAULT_PRIMARY_COLOR } from '../theme/palette';

interface Props {
  style?: ViewStyle;
  size?: number;
  badgeColor?: string;
}

export function KerAbieFloatingButton({ style, size = 56, badgeColor = '#ef4444' }: Props) {
  const ctx = useKerAbieContext();
  const { config, toggle, unreadCount } = ctx;

  // The org picked the search-bar launcher instead — <KerAbieSearchBar /> renders that.
  if (config.launcherType === 'searchbar') return null;

  const posStyle = getPositionStyle(config.position);
  // Same none/small/medium/large setting as the web widget's launcher, scaled to the button — 'large' is a circle.
  const LAUNCHER_RADIUS = { none: 0, small: 0.2, medium: 0.35, large: 0.5 } as const;
  const radius = size * (LAUNCHER_RADIUS[config.theme.borderRadius ?? 'medium'] ?? LAUNCHER_RADIUS.medium);

  return (
    <View style={[styles.wrapper, posStyle, style]} pointerEvents="box-none">
      <TouchableOpacity
        onPress={toggle}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: config.theme.bubbleColor ?? config.theme.primaryColor ?? DEFAULT_PRIMARY_COLOR,
          },
        ]}
        activeOpacity={0.85}
      >
        {/* An explicit bubbleColor prop is a developer override — it wins over the org's gradient. */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]} pointerEvents="none">
          <GradientLayer colors={config.theme.bubbleColor ? null : gradientColors(config.theme)} />
        </View>
        {config.theme.bubbleIcon ? (
          <Image
            source={config.theme.bubbleIcon}
            style={{ width: config.theme.bubbleIconSize ?? 28, height: config.theme.bubbleIconSize ?? 28 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: config.theme.bubbleIconSize ?? 24 }}>💬</Text>
        )}
      </TouchableOpacity>
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
        </View>
      )}
    </View>
  );
}

function getPositionStyle(position: string): ViewStyle {
  const base: ViewStyle = { position: 'absolute' };
  switch (position) {
    case 'bottom-left': return { ...base, bottom: 24, left: 20 };
    case 'top-right': return { ...base, top: 60, right: 20 };
    case 'top-left': return { ...base, top: 60, left: 20 };
    default: return { ...base, bottom: 24, right: 20 };
  }
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
