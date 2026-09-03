import { cfg } from '../shared/config.js';
import { hmac, safeEqualHex } from '../shared/crypto.js';

// Intentionally tiny adapter. The demo protocol signs the exact raw HTTP body
// using HMAC-SHA256 and sends it in x-hook-signature.
// For a real provider, swap this function without touching the rest of the flow.
export const verifyEnvelope = ({ rawBody, headers }) => {
  const supplied = headers['x-hook-signature'];
  if (!supplied) return { ok: false, reason: 'missing signature' };
  const expected = hmac(cfg.ingressSecret, rawBody);
  return safeEqualHex(supplied, expected)
    ? { ok: true }
    : { ok: false, reason: 'bad signature' };
};
