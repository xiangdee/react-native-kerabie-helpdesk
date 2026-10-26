/**
 * The end of a gradient made from the brand color alone: lighter for a dark color, darker for a light one.
 * Same result as the dashboard's preview and the web widget.
 */
export function tonalEnd(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const rgb = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  const light = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.5;
  const target = light ? 0 : 255;
  const amount = light ? 0.3 : 0.35;
  return '#' + rgb.map((c) => Math.round(c + (target - c) * amount).toString(16).padStart(2, '0')).join('');
}
