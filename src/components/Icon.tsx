import React from 'react';
import { Text, View, ViewStyle } from 'react-native';

// Icons drawn from plain Views (borders, rotations, rounded corners) on a 24-unit grid, so the package needs
// no icon font or SVG dependency. The set mirrors the shapes the web widget uses.
export type IconName =
  | 'home' | 'chat' | 'help' | 'tickets' | 'search' | 'close' | 'back' | 'forward' | 'article' | 'sparkle'
  | 'user' | 'bell' | 'download' | 'mail' | 'shield' | 'trash' | 'check' | 'package' | 'attach' | 'smile'
  | 'send' | 'image' | 'arrowRight' | 'plus' | 'phone' | 'video';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: Props) {
  const u = size / 24;
  const t = Math.max(1.2, strokeWidth * u);

  // Centered box: (cx, cy) is the middle in grid units; `rot` turns it around that middle.
  const box = (cx: number, cy: number, w: number, h: number, style: ViewStyle = {}, rot = 0) => (
    <View
      key={`${cx}-${cy}-${w}-${h}-${rot}-${Object.keys(style).join()}`}
      style={{
        position: 'absolute',
        left: (cx - w / 2) * u,
        top: (cy - h / 2) * u,
        width: w * u,
        height: h * u,
        transform: rot ? [{ rotate: `${rot}deg` }] : undefined,
        ...style,
      }}
    />
  );
  const bar = (cx: number, cy: number, len: number, rot = 0, vertical = false) =>
    <View
      key={`b${cx}-${cy}-${len}-${rot}-${vertical}`}
      style={{
        position: 'absolute',
        left: cx * u - (vertical ? t : len * u) / 2,
        top: cy * u - (vertical ? len * u : t) / 2,
        width: vertical ? t : len * u,
        height: vertical ? len * u : t,
        borderRadius: t / 2,
        backgroundColor: color,
        transform: rot ? [{ rotate: `${rot}deg` }] : undefined,
      }}
    />;
  const dot = (cx: number, cy: number, d: number) => box(cx, cy, d, d, { backgroundColor: color, borderRadius: d * u });
  const ring = (cx: number, cy: number, d: number) => box(cx, cy, d, d, { borderWidth: t, borderColor: color, borderRadius: d * u });
  const outline = (cx: number, cy: number, w: number, h: number, r: number, extra: ViewStyle = {}) =>
    box(cx, cy, w, h, { borderWidth: t, borderColor: color, borderRadius: r * u, ...extra });
  // A corner chevron: a square with two borders, turned 45deg.
  const chevron = (cx: number, cy: number, side: number, edges: ViewStyle, rot = 45) =>
    box(cx, cy, side, side, { borderColor: color, borderRadius: t / 3, ...edges }, rot);
  const L = { borderLeftWidth: t, borderBottomWidth: t };
  const R = { borderRightWidth: t, borderTopWidth: t };
  const Dn = { borderRightWidth: t, borderBottomWidth: t };
  const Up = { borderLeftWidth: t, borderTopWidth: t };

  let parts: React.ReactNode[] = [];
  switch (name) {
    case 'close':
      parts = [bar(12, 12, 17, 45), bar(12, 12, 17, -45)];
      break;
    case 'plus':
      parts = [bar(12, 12, 14), bar(12, 12, 14, 0, true)];
      break;
    case 'back':
      parts = [chevron(13.5, 12, 9, L)];
      break;
    case 'forward':
      parts = [chevron(10.5, 12, 9, R)];
      break;
    case 'check':
      parts = [chevron(12, 11, 7, Dn, 45)];
      break;
    case 'arrowRight':
      parts = [bar(11.5, 12, 15), chevron(15.5, 12, 8, R)];
      break;
    case 'search':
      parts = [ring(10.5, 10.5, 14), bar(19, 19, 6.5, 45)];
      break;
    case 'send':
      parts = [bar(12, 13, 14, 0, true), chevron(12, 8.5, 9, Up)];
      break;
    case 'download':
      parts = [bar(12, 9, 11, 0, true), chevron(12, 12.5, 8, Dn), bar(12, 19.5, 14)];
      break;
    case 'home':
      parts = [chevron(12, 9.5, 13, Up), outline(12, 16.5, 12, 8, 1.5, { borderTopWidth: 0 })];
      break;
    case 'chat':
      parts = [outline(12, 11, 18, 14, 3.5), chevron(7.5, 19.5, 4.5, L)];
      break;
    case 'help':
      parts = [ring(12, 12, 18), <Text key="q" style={{ position: 'absolute', left: 0, right: 0, top: 3.4 * u, textAlign: 'center', color, fontWeight: '700', fontSize: 11.5 * u, lineHeight: 15 * u }}>?</Text>];
      break;
    case 'tickets':
      parts = [outline(12, 13.5, 18, 12, 2), outline(12, 6.5, 8, 4, 1, { borderBottomWidth: 0 }), bar(12, 14, 18)];
      break;
    case 'article':
      parts = [outline(12, 12, 14, 18, 2), bar(12, 11, 7), bar(12, 15, 7)];
      break;
    case 'sparkle':
      parts = [bar(12, 12, 17, 0, true), bar(12, 12, 17), bar(12, 12, 11, 45), bar(12, 12, 11, -45)];
      break;
    case 'user':
      parts = [ring(12, 8, 8), outline(12, 19, 16, 8, 8, { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 })];
      break;
    case 'bell':
      parts = [outline(12, 11, 12, 12, 6, { borderBottomLeftRadius: 2 * u, borderBottomRightRadius: 2 * u }), bar(12, 17.5, 16), dot(12, 20.5, 3)];
      break;
    case 'mail':
      parts = [outline(12, 12, 18, 13, 2.5), bar(8.2, 10, 8, 35), bar(15.8, 10, 8, -35)];
      break;
    case 'shield':
      parts = [outline(12, 12, 14, 17, 2, { borderBottomLeftRadius: 7 * u, borderBottomRightRadius: 7 * u })];
      break;
    case 'trash':
      parts = [bar(12, 6.5, 16), bar(12, 4, 6), outline(12, 14.5, 12, 12, 1.5, { borderTopWidth: 0 })];
      break;
    case 'attach':
      parts = [box(12, 12, 8, 18, { borderWidth: t, borderColor: color, borderRadius: 4 * u }, 40), bar(12.6, 11.5, 8, 40, true)];
      break;
    case 'smile':
      parts = [ring(12, 12, 18), dot(9, 10, 2), dot(15, 10, 2), box(12, 13.5, 8, 4, { borderBottomWidth: t, borderColor: color, borderBottomLeftRadius: 4 * u, borderBottomRightRadius: 4 * u })];
      break;
    case 'image':
      parts = [outline(12, 12, 18, 14, 2), dot(8, 9.5, 3), bar(15, 14, 8, -35)];
      break;
    case 'package':
      parts = [outline(12, 12, 16, 16, 2), bar(12, 9, 16), bar(12, 12.5, 7, 0, true)];
      break;
    case 'phone':
      // A handset: a pill turned on its diagonal with a heavier earpiece and mouthpiece at the ends.
      parts = [
        box(12, 12, 6, 15, { backgroundColor: color, borderRadius: 3 * u }, 45),
        box(7.5, 16.5, 7, 7, { backgroundColor: color, borderRadius: 2.5 * u }, 45),
        box(16.5, 7.5, 7, 7, { backgroundColor: color, borderRadius: 2.5 * u }, 45),
      ];
      break;
    case 'video':
      parts = [outline(10.5, 12, 14, 11, 2.5), box(19.5, 12, 4, 6, { backgroundColor: color, borderRadius: 1.5 * u })];
      break;
  }

  return (
    <View style={{ width: size, height: size }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no">
      {parts}
    </View>
  );
}
