import express from 'express';
import { verifyEnvelope } from './verify.js';
import { normalize } from './normalize.js';
import { remember } from '../ledger/postgres.js';
import { passRateGate, wakeWorker } from '../pulse/redis.js';
import { log } from '../shared/log.js';

export const ingress = express.Router();

const acceptedSources = new Set(['ton', 'telegram']);

ingress.post('/:source', async (req, res) => {
  const source = req.params.source;
  if (!acceptedSources.has(source)) return res.status(404).json({ error: 'unknown source' });

  const identity = req.ip ?? 'unknown';
  if (!(await passRateGate(identity))) return res.status(429).json({ error: 'rate limit' });

  const proof = verifyEnvelope({ rawBody: req.rawBody ?? '', headers: req.headers });
  if (!proof.ok) return res.status(401).json({ error: 'signature rejected', reason: proof.reason });

  const event = normalize(source, req.body ?? {});
  const saved = await remember(event);

  if (saved.inserted) {
    await wakeWorker();
    log.info('event.accepted', { id: event.id, source, externalId: event.externalId });
    return res.status(202).json({ accepted: true, duplicate: false, eventId: event.id });
  }

  log.info('event.duplicate', { source, externalId: event.externalId });
  return res.status(200).json({ accepted: true, duplicate: true });
});
