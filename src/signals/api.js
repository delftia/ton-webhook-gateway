import express from 'express';
import { dashboardSnapshot, findById } from '../ledger/postgres.js';

export const signals = express.Router();

signals.get('/health', (_req, res) => res.json({ ok: true, now: new Date().toISOString() }));

signals.get('/dashboard', async (_req, res) => {
  res.json(await dashboardSnapshot());
});

signals.get('/events/:id', async (req, res) => {
  const row = await findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});
