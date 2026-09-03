import Redis from 'ioredis';
import { cfg } from '../shared/config.js';

export const redis = new Redis(cfg.redisUrl, { maxRetriesPerRequest: 2 });

export const passRateGate = async (identity) => {
  const window = Math.floor(Date.now() / 60_000);
  const key = `rate:${identity}:${window}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 70);
  return count <= cfg.rateLimitPerMinute;
};

export const wakeWorker = async () => redis.publish('gateway:wake', String(Date.now()));
