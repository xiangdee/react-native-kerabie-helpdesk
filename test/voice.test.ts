import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Downsampler, asBytes, pcmMs } from '../src/voice/pcm.ts';
import { PlaybackPacer } from '../src/voice/playbackPacer.ts';
import { initialVoice, voiceReducer, MAX_LINES, type VoiceAction, type VoiceSnapshot } from '../src/voice/voiceState.ts';

const pcm = (...samples: number[]) => {
  const b = new Uint8Array(samples.length * 2);
  const v = new DataView(b.buffer);
  samples.forEach((s, i) => v.setInt16(i * 2, s, true));
  return b;
};
const samplesOf = (b: Uint8Array) => {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return Array.from({ length: b.byteLength / 2 }, (_, i) => v.getInt16(i * 2, true));
};

test('24 kHz speech becomes 16 kHz: two samples out for every three in', () => {
  const out = new Downsampler().push(pcm(...Array.from({ length: 300 }, (_, i) => i * 10)));
  assert.ok(Math.abs(out.length / 2 - 200) <= 1);
});

test('a ramp stays a ramp after downsampling', () => {
  const out = samplesOf(new Downsampler().push(pcm(...Array.from({ length: 30 }, (_, i) => i * 30))));
  for (let i = 1; i < out.length; i++) assert.ok(out[i] > out[i - 1]);
  // 16 kHz sample n sits at input position n * 1.5.
  assert.equal(out[0], 0);
  assert.equal(out[2], 90);
});

test('pieces split anywhere give the same speech as one piece', () => {
  const all = pcm(...Array.from({ length: 99 }, (_, i) => Math.round(Math.sin(i / 5) * 3000)));
  const whole = samplesOf(new Downsampler().push(all));
  const d = new Downsampler();
  const parts = [all.slice(0, 7 * 2), all.slice(7 * 2, 8 * 2), all.slice(8 * 2, 50 * 2), all.slice(50 * 2)];
  const split = parts.flatMap((p) => samplesOf(d.push(p)));
  assert.deepEqual(split, whole);
});

test('an odd trailing byte and empty input do no harm', () => {
  const d = new Downsampler();
  assert.equal(d.push(new Uint8Array(0)).length, 0);
  const out = d.push(new Uint8Array([1, 0, 2, 0, 3]));
  assert.ok(out.length % 2 === 0);
});

test('asBytes reads what the socket hands over, and nothing else', () => {
  assert.deepEqual(Array.from(asBytes(new Uint8Array([1, 2]).buffer)!), [1, 2]);
  assert.deepEqual(Array.from(asBytes(new Uint8Array([3, 4]))!), [3, 4]);
  assert.equal(asBytes('text'), null);
  assert.equal(asBytes(null), null);
  assert.equal(asBytes({}), null);
});

test('pcmMs: 16000 samples is one second', () => {
  assert.equal(pcmMs(32000), 1000);
  assert.equal(pcmMs(0), 0);
});

test('the pacer gives the player only what it needs, not everything at once', () => {
  let t = 0;
  const played: number[] = [];
  const pacer = new PlaybackPacer((b) => played.push(b.length), () => t, 300);
  const second = new Uint8Array(32000); // one second of speech
  for (let i = 0; i < 5; i++) pacer.push(second);

  assert.equal(played.length, 1); // the player has 1 s ahead; the rest waits
  t = 800;
  pacer.pump();
  assert.equal(played.length, 2); // 200 ms left, under the 300 ms ahead
  assert.equal(pacer.idle, false);
});

test('an interruption drops what has not been handed over', () => {
  let t = 0;
  const played: number[] = [];
  const pacer = new PlaybackPacer((b) => played.push(b.length), () => t, 300);
  for (let i = 0; i < 5; i++) pacer.push(new Uint8Array(32000));

  pacer.clear();
  t = 5000;
  pacer.pump();

  assert.equal(played.length, 1);
  assert.equal(pacer.idle, true);
});

test('the pacer is idle when nothing waits and the last piece has played', () => {
  let t = 0;
  const pacer = new PlaybackPacer(() => {}, () => t, 300);
  assert.equal(pacer.idle, true);
  pacer.push(new Uint8Array(3200)); // 100 ms
  assert.equal(pacer.idle, false);
  t = 150;
  assert.equal(pacer.idle, true);
});

const run = (actions: VoiceAction[], from: VoiceSnapshot = initialVoice) => actions.reduce(voiceReducer, from);

test('a session goes from connecting to active and back to idle with the reason', () => {
  let s = run([{ type: 'connecting' }]);
  assert.equal(s.phase, 'connecting');
  s = run([{ type: 'ready' }], s);
  assert.equal(s.phase, 'active');
  s = run([{ type: 'ended', reason: 'goodbye' }], s);
  assert.equal(s.phase, 'idle');
  assert.equal(s.endedReason, 'goodbye');
});

test('starting again clears the last conversation, error and reason', () => {
  const s = run([
    { type: 'connecting' }, { type: 'ready' },
    { type: 'transcript', role: 'user', text: 'hi', final: false },
    { type: 'ended', reason: 'limit' },
    { type: 'connecting' },
  ]);
  assert.deepEqual(s.lines, []);
  assert.equal(s.endedReason, null);
  assert.equal(s.error, null);
});

test('activity only changes while a session is active', () => {
  assert.equal(run([{ type: 'activity', activity: 'speaking' }]).activity, 'listening');
  assert.equal(run([{ type: 'connecting' }, { type: 'ready' }, { type: 'activity', activity: 'speaking' }]).activity, 'speaking');
});

test('pieces of one speaker become one line; a change of speaker starts a new one', () => {
  const s = run([
    { type: 'connecting' }, { type: 'ready' },
    { type: 'transcript', role: 'user', text: 'show me', final: false },
    { type: 'transcript', role: 'user', text: ' my order', final: false },
    { type: 'transcript', role: 'user', text: '', final: true },
    { type: 'transcript', role: 'agent', text: 'Here it is', final: false },
  ]);
  assert.deepEqual(s.lines.map((l) => [l.role, l.text, l.final]), [['user', 'show me my order', true], ['agent', 'Here it is', false]]);
});

test('a finished line is not added to by the next piece', () => {
  const s = run([
    { type: 'connecting' }, { type: 'ready' },
    { type: 'transcript', role: 'user', text: 'a', final: false },
    { type: 'transcript', role: 'user', text: '', final: true },
    { type: 'transcript', role: 'user', text: 'b', final: false },
  ]);
  assert.deepEqual(s.lines.map((l) => l.text), ['a', 'b']);
});

test('a closing piece with no open line adds nothing', () => {
  const s = run([{ type: 'connecting' }, { type: 'ready' }, { type: 'transcript', role: 'agent', text: '', final: true }]);
  assert.deepEqual(s.lines, []);
});

test('an interruption finishes what the agent was saying and goes back to listening', () => {
  const s = run([
    { type: 'connecting' }, { type: 'ready' },
    { type: 'activity', activity: 'speaking' },
    { type: 'transcript', role: 'agent', text: 'Your order is', final: false },
    { type: 'interrupted' },
  ]);
  assert.equal(s.activity, 'listening');
  assert.equal(s.lines[0].final, true);
});

test('only the last few lines are kept', () => {
  let s = run([{ type: 'connecting' }, { type: 'ready' }]);
  for (let i = 0; i < MAX_LINES + 5; i++) {
    const role = i % 2 ? 'agent' : 'user';
    s = run([{ type: 'transcript', role, text: String(i), final: false }, { type: 'transcript', role, text: '', final: true }], s);
  }
  assert.equal(s.lines.length, MAX_LINES);
  assert.equal(s.lines[MAX_LINES - 1].text, String(MAX_LINES + 4));
});

test('an error ends the attempt and says why', () => {
  const s = run([{ type: 'connecting' }, { type: 'error', code: 'limit_reached' }]);
  assert.equal(s.phase, 'idle');
  assert.equal(s.error, 'limit_reached');
});

test('mute is remembered, also into the next session', () => {
  const muted = run([{ type: 'muted', muted: true }]);
  assert.equal(muted.muted, true);
  assert.equal(run([{ type: 'connecting' }], muted).muted, true);
});

test('dismissing a message goes back to idle and clears it', () => {
  const s = run([{ type: 'connecting' }, { type: 'error', code: 'busy' }, { type: 'dismiss' }]);
  assert.equal(s.error, null);
  assert.equal(s.phase, 'idle');
  assert.equal(run([{ type: 'connecting' }, { type: 'ready' }, { type: 'ended', reason: 'limit' }, { type: 'dismiss' }]).endedReason, null);
});
