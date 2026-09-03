import test from 'node:test';
import assert from 'node:assert/strict';
import { hmac, safeEqualHex } from '../src/shared/crypto.js';

test('constant-time compatible signature check', () => {
  const a = hmac('secret', 'payload');
  assert.equal(safeEqualHex(a, a), true);
  assert.equal(safeEqualHex(a, '00'), false);
});
