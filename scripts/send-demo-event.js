import crypto from 'node:crypto';
import 'dotenv/config';

const secret = process.env.INGRESS_SECRET ?? 'change-me-ingress';
const base = process.env.PUBLIC_BASE_URL ?? 'http://localhost:8080';
const payload = {
  tx_hash: `demo_${Date.now()}`,
  type: 'ton.payment.confirmed',
  amount: 12.5,
  asset: 'TON',
  sender: 'EQ-demo-wallet'
};
const body = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

const response = await fetch(`${base}/ingress/ton`, {
  method: 'POST',
  headers: {'content-type':'application/json','x-hook-signature':signature},
  body
});
console.log(response.status, await response.text());
