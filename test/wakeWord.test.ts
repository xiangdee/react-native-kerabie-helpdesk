// Run with: node --test test/wakeWord.test.ts   (Node 22.6+ strips the types itself)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { distance, greetingHints, heardWake, normalise, wakeNames } from '../src/wake/wakeWord.ts';

const hears = (name: string, said: string, aliases: string[] = []) => heardWake(said, wakeNames(name, aliases));

describe('normalise', () => {
  it('lower-cases and drops punctuation, accents and extra spaces', () => {
    assert.equal(normalise('  Hello,  KERABIE!! '), 'hello kerabie');
    assert.equal(normalise('Héllo Zoë'), 'hello zoe');
  });
});

describe('distance', () => {
  it('counts the edits between two words', () => {
    assert.equal(distance('kerabie', 'kerabie'), 0);
    assert.equal(distance('kerabie', 'kerabi'), 1);
    assert.equal(distance('kerabie', 'carabie'), 2);
    assert.equal(distance('', 'abc'), 3);
  });
});

describe('waking the agent by name', () => {
  it('wakes on the name alone', () => {
    assert.ok(hears('Kerabie Agent', 'Kerabie Agent'));
    assert.ok(hears('Ted', 'Ted'));
  });

  it('wakes on a greeting and the name', () => {
    assert.ok(hears('Ted', 'hi Ted'));
    assert.ok(hears('Ted', 'Hello, Ted!'));
    assert.ok(hears('Ted', 'hey ted can you help me'));
    assert.ok(hears('Kerabie Agent', 'hi kerabie agent'));
  });

  it('wakes on the first word of a longer name', () => {
    assert.ok(hears('Kerabie Agent', 'hello kerabie'));
  });

  it('forgives small mishearings of a longer name, but not a short one', () => {
    assert.ok(hears('Kerabie', 'hi carabie'));
    assert.ok(hears('Kerabie', 'kerabi'));
    assert.ok(!hears('Ted', 'hi tad'));
    assert.ok(!hears('Ted', 'hi ned'));
  });

  it('accepts spellings the speech engine produces', () => {
    assert.ok(hears('Kerabie', 'hey karaby', ['karaby']));
  });

  it('does not wake on other words, greetings alone, or an empty result', () => {
    assert.ok(!hears('Ted', 'hello there'));
    assert.ok(!hears('Ted', 'hi'));
    assert.ok(!hears('Ted', 'the weather is nice'));
    assert.ok(!hears('Ted', ''));
    assert.ok(!hears('Kerabie Agent', 'agent'));
  });

  it('needs the whole name when it has several words and the first word is not enough', () => {
    assert.ok(!hears('Taker Rider', 'hello rider', []));
  });

  it('does not listen for a name too short to be told apart', () => {
    assert.deepEqual(wakeNames('Al'), []);
    assert.ok(!hears('Al', 'hi al'));
  });
});

describe('wakeNames', () => {
  it('lists the full name and its first word once each', () => {
    assert.deepEqual(wakeNames('Kerabie Agent'), [['kerabie', 'agent'], ['kerabie']]);
    assert.deepEqual(wakeNames('Ted'), [['ted']]);
  });
});

describe('greetingHints', () => {
  it('gives the speech engine the name and the common greetings with it', () => {
    assert.deepEqual(greetingHints('Ted'), ['Ted', 'hi Ted', 'hey Ted', 'hello Ted']);
  });
});
