import { useColorScheme } from 'react-native';
import type { KerTheme } from '../types';

export interface KerPalette {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  inputBackground: string;
  agentBubble: string;
  /** Brand color — backgrounds (visitor bubble, send button, launcher). */
  primary: string;
  /** Text/icon color that stays readable ON the brand color, picked by its luminance. */
  onPrimary: string;
  /** Brand color used AS text/icon color on neutral surfaces — darkened/lightened until it reads (WCAG AA). */
  accent: string;
}

// Same neutral scales as the web widget's --kb-* tokens (kerabie-chat-widget/src/style.css).
const NEUTRALS = {
  light: {
    background: '#ffffff', surface: '#f1f5f9', surfaceStrong: '#e2e8f0', border: '#e2e8f0', borderStrong: '#d1d9e0',
    text: '#0f172a', textMuted: '#64748b', textSubtle: '#94a3b8', inputBackground: '#f8fafc',
  },
  dark: {
    background: '#1e2530', surface: '#262f3d', surfaceStrong: '#2d3746', border: '#333e4d', borderStrong: '#3a4556',
    text: '#e5e7eb', textMuted: '#9ca3af', textSubtle: '#6b7280', inputBackground: '#262f3d',
  },
} as const;

// Default slate → teal gradient — mirrors DEFAULT_WIDGET_COLORS in kerabie-backend
// (chat-widget-color.service.ts) and the web widget's constants.ts.
export const DEFAULT_PRIMARY_COLOR = '#334155';
export const DEFAULT_SECONDARY_COLOR = '#0f766e';
const DEFAULT_PRIMARY = DEFAULT_PRIMARY_COLOR;

type Rgb = [number, number, number];

// Accepts #rgb, #rrggbb, #rrggbbaa and rgb()/rgba() with comma or space separators.
export function parseColor(color: string | undefined): Rgb | null {
  if (!color) return null;
  const v = color.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
  }
  const rgb = v.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

// WCAG relative luminance — same formula and 0.5 threshold as the web
// widget's getLuminance, so both pick the same text color for a brand color.
function luminance([r, g, b]: Rgb): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Any supported color at the given opacity — safe for rgb() strings too, unlike appending hex alpha. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color);
  return rgb ? `rgba(${rgb.join(', ')}, ${alpha})` : color;
}

/** Dark or white text — whichever stays readable on the given background color. */
export function contrastText(background: string): string {
  const rgb = parseColor(background);
  return rgb && luminance(rgb) > 0.5 ? '#0f172a' : '#ffffff';
}

const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * The brand color made usable as TEXT/ICON color on a surface: same hue, darkened on a light surface (lightened on a
 * dark one) just until it reaches WCAG AA (4.5:1), and untouched when it already does. A bright brand color such as lime
 * is otherwise unreadable as text on white. Mirrors readableAccent() in kerabie-chat-widget/src/utils/readableAccent.ts.
 * Not a parseable color -> plain readable text for that surface.
 */
export function readableAccent(brand: string, surface: string, min = 4.5): string {
  const surfaceRgb = parseColor(surface) ?? ([255, 255, 255] as Rgb);
  const surfaceLum = luminance(surfaceRgb);
  const light = surfaceLum > 0.5;
  const from = parseColor(brand);
  if (!from) return light ? '#0f172a' : '#e5e7eb';
  if (contrastRatio(luminance(from), surfaceLum) >= min) return brand;

  const target: Rgb = light ? [0, 0, 0] : [255, 255, 255];
  const mixed = (t: number): Rgb => [0, 1, 2].map((i) => Math.round(from[i]! + (target[i]! - from[i]!) * t)) as Rgb;
  for (let t = 0.05; t < 1; t += 0.05) {
    const candidate = mixed(t);
    if (contrastRatio(luminance(candidate), surfaceLum) >= min) return `rgb(${candidate.join(', ')})`;
  }
  return light ? '#000000' : '#ffffff';
}

export function resolvePalette(theme: KerTheme, scheme: 'light' | 'dark'): KerPalette {
  const n = NEUTRALS[scheme];
  const primary = theme.primaryColor ?? DEFAULT_PRIMARY;
  return {
    scheme,
    ...n,
    // Explicit developer overrides on `theme` still win over the scheme's neutrals.
    background: theme.backgroundColor ?? n.background,
    text: theme.textColor ?? n.text,
    agentBubble: theme.agentBubbleColor ?? n.surface,
    primary,
    onPrimary: contrastText(primary),
    // Brand color as text/icon: readable on this scheme's strongest panel surface (see readableAccent).
    accent: readableAccent(primary, n.surfaceStrong),
  };
}

/** Resolves theme.mode ('light' | 'dark' | 'auto', from the dashboard's Theme setting) against the device scheme. */
export function usePalette(theme: KerTheme): KerPalette {
  const system = useColorScheme();
  const mode = theme.mode ?? 'light';
  const scheme = mode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return resolvePalette(theme, scheme);
}
