/** The phone's audio module records and plays 16-bit little-endian PCM at 16 kHz, mono; the AI sends 24 kHz. */
export const MIC_RATE = 16000;

/** What the socket hands over for a binary event: an ArrayBuffer, or a typed array / Buffer. Null for anything else. */
export function asBytes(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return null;
}

/** How long a piece of 16 kHz mono 16-bit speech lasts, in milliseconds. */
export function pcmMs(bytes: number): number {
  return (bytes / 2 / MIC_RATE) * 1000;
}

/**
 * 24 kHz to 16 kHz by linear interpolation. It remembers what is left over between pieces, so the speech stays smooth
 * across the pieces the server sends.
 */
export class Downsampler {
  private pending: number[] = [];
  private pos = 0;

  push(input: Uint8Array): Uint8Array {
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength - (input.byteLength % 2));
    for (let i = 0; i < view.byteLength; i += 2) this.pending.push(view.getInt16(i, true));

    const out: number[] = [];
    while (this.pos + 1 < this.pending.length) {
      const i = Math.floor(this.pos);
      const frac = this.pos - i;
      out.push(Math.round(this.pending[i] + (this.pending[i + 1] - this.pending[i]) * frac));
      this.pos += 1.5;
    }
    const used = Math.floor(this.pos);
    this.pending = this.pending.slice(used);
    this.pos -= used;

    const bytes = new Uint8Array(out.length * 2);
    const outView = new DataView(bytes.buffer);
    out.forEach((s, i) => outView.setInt16(i * 2, s, true));
    return bytes;
  }

  reset() {
    this.pending = [];
    this.pos = 0;
  }
}
