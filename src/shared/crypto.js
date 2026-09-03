import crypto from 'node:crypto';

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const hmac = (secret, value) =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');

export const safeEqualHex = (a, b) => {
  try {
    const left = Buffer.from(String(a), 'hex');
    const right = Buffer.from(String(b), 'hex');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
};

export const randomId = () => crypto.randomUUID();
