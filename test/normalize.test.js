import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/edge/normalize.js';

test('TON payload becomes gateway.event.v1', () => {
  const event = normalize('ton', { tx_hash: 'abc', amount: '5.2', asset: 'TON', sender: 'EQ1' });
  assert.equal(event.externalId, 'abc');
  assert.equal(event.normalized.schema, 'gateway.event.v1');
  assert.equal(event.amount, 5.2);
});

test('same source + external id + kind creates same fingerprint', () => {
  const a = normalize('telegram', { id: '42', type: 'telegram.payment' });
  const b = normalize('telegram', { id: '42', type: 'telegram.payment' });
  assert.equal(a.fingerprint, b.fingerprint);
});
