# ton-webhook-gateway

> Reliable webhook infrastructure for TON and Telegram payment applications.

A small event gateway that sits between payment/event providers and your application. It verifies inbound envelopes, normalizes payloads, rejects duplicates, records every event, retries failed deliveries with exponential backoff, and moves exhausted deliveries into a dead-letter store.

## Why the code looks different

This repository intentionally avoids the usual `controllers / services / repositories` boilerplate. The code follows the event's path instead:

```text
edge/      ingress + verification + normalization
pulse/     short-lived coordination (Redis)
ledger/    durable event memory (PostgreSQL)
relay/     outbound delivery + retry movement
signals/   observability API
```

There are no framework-heavy classes. Each module exposes a small function at one stage of the flow.

## Flow

```text
TON / Telegram-like event
        ↓
      edge
  verify raw body
        ↓
    normalize
        ↓
     ledger ─────→ duplicate? return 200
        ↓
      relay
        ↓
 destination backend
      ↙     ↘
 delivered  retry → dead letter
```

## Features

- Node.js 20 / modern JavaScript (ES modules)
- REST ingress endpoints
- raw-body HMAC verification adapter
- deterministic idempotency fingerprint
- PostgreSQL event ledger
- Redis rate gate + wake signal
- exponential retry with jitter
- dead-letter persistence
- signed outbound delivery
- structured JSON logs
- tiny live dashboard
- Docker Compose
- zero test framework: Node's built-in test runner

## Important integration note

The bundled verifier is deliberately provider-neutral and uses `HMAC-SHA256(rawBody)` via the `x-hook-signature` header so the repository can run locally without vendor credentials. **Do not assume this is the production signature scheme of a specific TON or Telegram provider.** Replace `src/edge/verify.js` with the verification method documented by the provider you integrate.

The same applies to payload shapes: the normalizer accepts several common-looking field names for a demo, but production integrations should get their own explicit adapter.

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm start
```

Open:

```text
http://localhost:8080
```

Send a signed demo TON event:

```bash
npm run demo:event
```

## API

### `POST /ingress/ton`
### `POST /ingress/telegram`

Headers:

```text
content-type: application/json
x-hook-signature: <hex HMAC-SHA256 over exact raw body>
```

Response for a new event:

```json
{
  "accepted": true,
  "duplicate": false,
  "eventId": "f4c2..."
}
```

Duplicate payloads are acknowledged and not queued twice.

### `GET /api/dashboard`
Returns status counts, recent events, and recent dead letters.

### `GET /api/events/:id`
Returns one stored event.

### `GET /api/health`
Health signal for load balancers and uptime checks.

## Outbound contract

The destination receives a normalized envelope and two gateway headers:

```text
x-gateway-event-id: <uuid>
x-gateway-signature: <HMAC-SHA256 of outbound JSON body>
```

Use `DESTINATION_SECRET` to verify the outbound signature in your application.

## Retry policy

Attempt delay grows roughly as:

```text
BASE_RETRY_MS × 2^(attempt-1) + jitter
```

Once `MAX_ATTEMPTS` is reached, the event is marked `failed` and copied to `dead_letters` for inspection.

## Repository layout

```text
src/
  boot.js
  edge/
    ingress.js
    normalize.js
    verify.js
  pulse/
    redis.js
  ledger/
    postgres.js
  relay/
    deliver.js
    worker.js
  signals/
    api.js
  shared/
    config.js
    crypto.js
    log.js
public/
  index.html
scripts/
  send-demo-event.js
test/
```

## Run tests

```bash
npm test
```

## License

MIT
