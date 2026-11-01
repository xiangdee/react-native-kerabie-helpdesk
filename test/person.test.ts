import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personOf } from '../src/provider/person.ts';

test('the app id tells people apart, whatever else changes', () => {
  assert.equal(personOf({ id: '42', email: 'a@b.co' }), personOf({ id: '42', email: 'other@b.co' }));
  assert.notEqual(personOf({ id: '42' }), personOf({ id: '43' }));
});

test('without an id the email decides, ignoring case', () => {
  assert.equal(personOf({ email: 'Terry@Mail.com' }), personOf({ email: 'terry@mail.com' }));
  assert.notEqual(personOf({ email: 'a@b.co' }), personOf({ email: 'c@d.co' }));
});

test('an id and an email are never taken for each other', () => {
  assert.notEqual(personOf({ id: 'a@b.co' }), personOf({ email: 'a@b.co' }));
});

test('nobody, or someone with no id and no email, is the empty person', () => {
  assert.equal(personOf(null), '');
  assert.equal(personOf(undefined), '');
  assert.equal(personOf({}), '');
});
