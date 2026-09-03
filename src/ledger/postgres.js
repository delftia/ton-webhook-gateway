import pg from 'pg';
import { cfg } from '../shared/config.js';

const { Pool } = pg;
export const db = new Pool({ connectionString: cfg.databaseUrl });

export const awakenLedger = async () => {
  await db.query(`
    create table if not exists webhook_events (
      id uuid primary key,
      source text not null,
      external_id text not null,
      fingerprint text not null unique,
      kind text not null,
      amount numeric,
      asset text,
      sender text,
      raw jsonb not null,
      normalized jsonb not null,
      status text not null default 'queued',
      attempts integer not null default 0,
      next_attempt_at timestamptz not null default now(),
      last_error text,
      created_at timestamptz not null default now(),
      delivered_at timestamptz
    );

    create index if not exists webhook_events_status_due_idx
      on webhook_events(status, next_attempt_at);

    create table if not exists dead_letters (
      event_id uuid primary key references webhook_events(id) on delete cascade,
      reason text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
};

export const remember = async (event) => {
  const q = `
    insert into webhook_events
      (id, source, external_id, fingerprint, kind, amount, asset, sender, raw, normalized)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    on conflict (fingerprint) do nothing
    returning id
  `;
  const values = [
    event.id, event.source, event.externalId, event.fingerprint, event.kind,
    event.amount, event.asset, event.sender, event.raw, event.normalized
  ];
  const result = await db.query(q, values);
  return { inserted: result.rowCount === 1 };
};

export const findById = async (id) => {
  const { rows } = await db.query('select * from webhook_events where id = $1', [id]);
  return rows[0] ?? null;
};

export const nextDue = async () => {
  const { rows } = await db.query(`
    select * from webhook_events
    where status in ('queued','retrying') and next_attempt_at <= now()
    order by next_attempt_at asc, created_at asc
    limit 1
  `);
  return rows[0] ?? null;
};

export const markDelivered = async (id) => db.query(`
  update webhook_events
  set status='delivered', delivered_at=now(), last_error=null
  where id=$1
`, [id]);

export const markRetry = async (id, attempts, nextAttemptAt, error) => db.query(`
  update webhook_events
  set status='retrying', attempts=$2, next_attempt_at=$3, last_error=$4
  where id=$1
`, [id, attempts, nextAttemptAt, error]);

export const bury = async (row, reason) => {
  await db.query('begin');
  try {
    await db.query(`update webhook_events set status='failed', attempts=$2, last_error=$3 where id=$1`,
      [row.id, row.attempts + 1, reason]);
    await db.query(`
      insert into dead_letters(event_id, reason, payload)
      values ($1,$2,$3)
      on conflict (event_id) do update set reason=excluded.reason, payload=excluded.payload, created_at=now()
    `, [row.id, reason, row.normalized]);
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
};

export const dashboardSnapshot = async () => {
  const [counts, recent, dead] = await Promise.all([
    db.query(`select status, count(*)::int as count from webhook_events group by status`),
    db.query(`select id, source, kind, amount, asset, status, attempts, created_at, delivered_at from webhook_events order by created_at desc limit 24`),
    db.query(`select d.event_id, d.reason, d.created_at from dead_letters d order by d.created_at desc limit 12`)
  ]);
  return { counts: counts.rows, recent: recent.rows, dead: dead.rows };
};
