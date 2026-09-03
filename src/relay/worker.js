import { cfg } from '../shared/config.js';
import { nextDue, markDelivered, markRetry, bury } from '../ledger/postgres.js';
import { deliver } from './deliver.js';
import { log } from '../shared/log.js';

let moving = false;

const retryAt = (attempt) => {
  const exponential = cfg.baseRetryMs * (2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.min(1000, exponential * 0.2));
  return new Date(Date.now() + exponential + jitter);
};

export const moveOne = async () => {
  if (moving) return false;
  moving = true;
  try {
    const row = await nextDue();
    if (!row) return false;

    try {
      await deliver(row);
      await markDelivered(row.id);
      log.info('relay.delivered', { id: row.id, source: row.source });
    } catch (error) {
      const nextAttempt = row.attempts + 1;
      const message = error instanceof Error ? error.message : String(error);

      if (nextAttempt >= cfg.maxAttempts) {
        await bury(row, message);
        log.error('relay.dead-letter', { id: row.id, attempts: nextAttempt, error: message });
      } else {
        await markRetry(row.id, nextAttempt, retryAt(nextAttempt), message);
        log.warn('relay.retry', { id: row.id, attempts: nextAttempt, error: message });
      }
    }
    return true;
  } finally {
    moving = false;
  }
};

export const startRelay = () => {
  const tick = async () => {
    try {
      while (await moveOne()) { /* drain currently due work */ }
    } catch (error) {
      log.error('relay.loop', { error: error instanceof Error ? error.message : String(error) });
    }
  };
  tick();
  return setInterval(tick, cfg.workerIntervalMs);
};
