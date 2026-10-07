import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

export interface SkeletonProps {
  width?: number | `${number}%`;
  /** Omit (leave undefined) when using aspectRatio instead — RN's explicit height wins over aspectRatio when both are set. */
  height?: number;
  aspectRatio?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Base shimmer color — pass the host theme's surfaceContainer-equivalent for correct light/dark contrast. */
  color?: string;
}

/**
 * Lightweight shimmer placeholder built on RN core's Animated API (no extra
 * native dependency — this package doesn't otherwise need react-native-reanimated,
 * and a consumer shouldn't have to install/configure it just for a skeleton).
 */
export function Skeleton({ width = '100%', height, aspectRatio, borderRadius = 8, style, color = '#e2e8f0' }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const sizeStyle = aspectRatio !== undefined ? { width, aspectRatio } : { width, height: height ?? 16 };

  return (
    <Animated.View style={[{ opacity }, sizeStyle, { borderRadius, backgroundColor: color }, style]} />
  );
}

export interface SkeletonRowsProps {
  rows?: number;
  gap?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonRows({ rows = 3, gap = 10, color, style }: SkeletonRowsProps) {
  return (
    <Animated.View style={[{ gap }, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === rows - 1 ? '65%' : '100%'} color={color} />
      ))}
    </Animated.View>
  );
}
