import express from 'express';
import { cfg } from './shared/config.js';
import { log } from './shared/log.js';
import { awakenLedger } from './ledger/postgres.js';
import { ingress } from './edge/ingress.js';
import { signals } from './signals/api.js';
import { startRelay } from './relay/worker.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => { req.rawBody = buffer.toString('utf8'); }
}));

app.use('/ingress', ingress);
app.use('/api', signals);
app.use(express.static('public'));

app.use((error, _req, res, _next) => {
  log.error('http.unhandled', { error: error instanceof Error ? error.message : String(error) });
  res.status(500).json({ error: 'internal error' });
});

await awakenLedger();
startRelay();

app.listen(cfg.port, () => {
  log.info('gateway.online', { port: cfg.port, dashboard: `${cfg.publicBaseUrl}/` });
});
