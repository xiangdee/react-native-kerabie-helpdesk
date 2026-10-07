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
  /** Brand color used AS text/icon color on neutral surfaces — lightened in dark mode. */
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

function mixWithWhite([r, g, b]: Rgb, amount: number): string {
  return `rgb(${[r, g, b].map((c) => Math.round(c + (255 - c) * amount)).join(', ')})`;
}

export function resolvePalette(theme: KerTheme, scheme: 'light' | 'dark'): KerPalette {
  const n = NEUTRALS[scheme];
  const primary = theme.primaryColor ?? DEFAULT_PRIMARY;
  const rgb = parseColor(primary) ?? parseColor(DEFAULT_PRIMARY)!;
  return {
    scheme,
    ...n,
    // Explicit developer overrides on `theme` still win over the scheme's neutrals.
    background: theme.backgroundColor ?? n.background,
    text: theme.textColor ?? n.text,
    agentBubble: theme.agentBubbleColor ?? n.surface,
    primary,
    onPrimary: contrastText(primary),
    accent: scheme === 'dark' ? mixWithWhite(rgb, 0.45) : primary,
  };
}

/** Resolves theme.mode ('light' | 'dark' | 'auto', from the dashboard's Theme setting) against the device scheme. */
export function usePalette(theme: KerTheme): KerPalette {
  const system = useColorScheme();
  const mode = theme.mode ?? 'light';
  const scheme = mode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return resolvePalette(theme, scheme);
}
