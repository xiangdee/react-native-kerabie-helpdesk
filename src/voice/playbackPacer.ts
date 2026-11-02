/** How long a piece of 16 kHz mono 16-bit speech lasts, in milliseconds. */
const speechMs = (bytes: number) => (bytes / 2 / 16000) * 1000;

/**
 * The AI's speech arrives faster than it is spoken. Handed to the phone's player all at once it would queue up, and when
 * the customer interrupts, seconds of speech would still play. So the pieces wait here and are given to the player only
 * as it needs them: it never holds more than `aheadMs` of speech, and an interruption drops everything else.
 */
export class PlaybackPacer {
  private queue: Uint8Array[] = [];
  private playingUntil = 0;
  private readonly play: (pcm: Uint8Array) => void;
  private readonly now: () => number;
  private readonly aheadMs: number;

  constructor(play: (pcm: Uint8Array) => void, now: () => number = Date.now, aheadMs = 300) {
    this.play = play;
    this.now = now;
    this.aheadMs = aheadMs;
  }

  push(pcm: Uint8Array) {
    if (pcm.length) this.queue.push(pcm);
    this.pump();
  }

  /** Gives the player what it needs. Called when a piece arrives and on a short timer. */
  pump() {
    while (this.queue.length && this.playingUntil - this.now() < this.aheadMs) {
      const piece = this.queue.shift()!;
      this.play(piece);
      this.playingUntil = Math.max(this.playingUntil, this.now()) + speechMs(piece.length);
    }
  }

  /** The customer interrupted: speech not yet handed to the player is dropped. */
  clear() {
    this.queue = [];
  }

  /** Nothing waiting and nothing still playing. */
  get idle(): boolean {
    return this.queue.length === 0 && this.playingUntil <= this.now();
  }
}
