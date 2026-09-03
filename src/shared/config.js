import 'dotenv/config';

const number = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
};

export const cfg = Object.freeze({
  port: number('PORT', 8080),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:8080',
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://gateway:gateway@localhost:5432/gateway',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  ingressSecret: process.env.INGRESS_SECRET ?? 'change-me-ingress',
  destinationUrl: process.env.DESTINATION_URL ?? '',
  destinationSecret: process.env.DESTINATION_SECRET ?? 'change-me-destination',
  maxAttempts: number('MAX_ATTEMPTS', 6),
  baseRetryMs: number('BASE_RETRY_MS', 1200),
  rateLimitPerMinute: number('RATE_LIMIT_PER_MINUTE', 120),
  workerIntervalMs: number('WORKER_INTERVAL_MS', 750)
});
