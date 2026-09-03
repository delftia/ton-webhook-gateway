import { randomId, sha256 } from '../shared/crypto.js';

const asText = (value, fallback = '') => value == null ? fallback : String(value);
const asNumber = (value) => value == null || value === '' ? null : Number(value);

const tonShape = (body) => ({
  externalId: asText(body.tx_hash ?? body.hash ?? body.transaction_id ?? body.id),
  kind: asText(body.type ?? body.event ?? 'ton.payment'),
  amount: asNumber(body.amount ?? body.value),
  asset: asText(body.asset ?? body.currency ?? 'TON'),
  sender: asText(body.sender ?? body.from ?? body.wallet)
});

const telegramShape = (body) => {
  const payment = body.successful_payment ?? body.payment ?? body;
  return {
    externalId: asText(payment.telegram_payment_charge_id ?? payment.provider_payment_charge_id ?? body.update_id ?? body.id),
    kind: asText(body.type ?? 'telegram.payment'),
    amount: asNumber(payment.total_amount ?? payment.amount),
    asset: asText(payment.currency ?? payment.asset ?? 'XTR'),
    sender: asText(body.from?.id ?? body.user_id ?? body.chat_id)
  };
};

export const normalize = (source, raw) => {
  const seed = source === 'telegram' ? telegramShape(raw) : tonShape(raw);
  const externalId = seed.externalId || sha256(JSON.stringify(raw)).slice(0, 32);
  const normalized = {
    schema: 'gateway.event.v1',
    source,
    externalId,
    kind: seed.kind,
    amount: Number.isFinite(seed.amount) ? seed.amount : null,
    asset: seed.asset || null,
    sender: seed.sender || null,
    receivedAt: new Date().toISOString()
  };

  return {
    id: randomId(),
    source,
    externalId,
    fingerprint: sha256(`${source}:${externalId}:${seed.kind}`),
    kind: seed.kind,
    amount: normalized.amount,
    asset: normalized.asset,
    sender: normalized.sender,
    raw,
    normalized
  };
};
