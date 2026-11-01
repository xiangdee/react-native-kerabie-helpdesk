import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextMessage } from '../src/provider/contextMessage.ts';

test('names what the help is about, its reference and its main details', () => {
  const text = contextMessage({
    type: 'transaction',
    id: 'TX-1',
    title: '₦5,000 debit',
    data: { reference: 'TX-1', narration: 'Order 55', payment_method: 'wallet', amount: '₦5,000' },
  });

  assert.equal(
    text,
    'I need help with ₦5,000 debit (ref TX-1).\nReference: TX-1\nNarration: Order 55\nPayment method: wallet\nAmount: ₦5,000',
  );
});

test('uses the type when there is no title, and skips the reference when the title already has it', () => {
  assert.equal(contextMessage({ type: 'order', id: '9' }), 'I need help with order (ref 9).');
  assert.equal(contextMessage({ type: 'order', id: '9', title: 'Order 9' }), 'I need help with Order 9.');
});

test('keeps only simple values, and at most six detail lines', () => {
  const data: Record<string, unknown> = { a: 1, b: true, c: 'x', d: { nested: 1 }, e: [1], f: '', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k' };
  const lines = contextMessage({ type: 'order', data }).split('\n');

  assert.equal(lines.length, 7);
  assert.deepEqual(lines.slice(1, 4), ['A: 1', 'B: true', 'C: x']);
  assert.ok(!lines.some((l) => l.startsWith('D:') || l.startsWith('E:') || l.startsWith('F:')));
});

test('shortens a very long value and the whole message', () => {
  const text = contextMessage({ type: 'order', data: { note: 'y'.repeat(500) } });

  assert.ok(text.split('\n')[1].length <= 'Note: '.length + 120);
  assert.ok(contextMessage({ type: 'order', message: 'z'.repeat(2000) }).length <= 600);
});

test('an app can give its own wording', () => {
  assert.equal(contextMessage({ type: 'order', id: '9', message: '  Where is my order?  ' }), 'Where is my order?');
});
