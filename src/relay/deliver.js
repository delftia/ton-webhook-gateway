import { cfg } from '../shared/config.js';
import { hmac } from '../shared/crypto.js';

export const deliver = async (row) => {
  if (!cfg.destinationUrl) throw new Error('DESTINATION_URL is empty');

  const body = JSON.stringify({
    id: row.id,
    ...row.normalized,
    attempts: row.attempts
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(cfg.destinationUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gateway-signature': hmac(cfg.destinationSecret, body),
        'x-gateway-event-id': row.id
      },
      body,
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`destination ${response.status}: ${detail || response.statusText}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};
