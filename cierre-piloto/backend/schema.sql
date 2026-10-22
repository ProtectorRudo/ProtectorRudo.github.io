-- CIERRE 0.3 • Cloudflare D1 • modo sombra únicamente
-- No almacena textos de conversaciones, teléfonos en claro ni contenido de PDF.
CREATE TABLE IF NOT EXISTS inbound_events(
 id TEXT PRIMARY KEY,
 phone_id TEXT NOT NULL,
 contact_key TEXT NOT NULL,
 field TEXT NOT NULL,
 direction TEXT NOT NULL CHECK(direction IN ('in','out')),
 kind TEXT NOT NULL,
 signal TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_inbound_phone_contact
 ON inbound_events(phone_id, contact_key, created_at DESC);
CREATE TABLE IF NOT EXISTS opportunities(
 quote_id TEXT PRIMARY KEY,
 phone_id TEXT NOT NULL,
 contact_key TEXT NOT NULL,
 quote_at INTEGER NOT NULL,
 last_activity_at INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('candidate','waiting','review','blocked','superseded')),
 reason TEXT NOT NULL,
 pdf_detected INTEGER NOT NULL DEFAULT 0,
 manual_control TEXT,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_opportunities_contact
 ON opportunities(phone_id, contact_key, quote_at DESC);
CREATE INDEX IF NOT EXISTS ix_opportunities_status
 ON opportunities(status, last_activity_at);
CREATE TABLE IF NOT EXISTS contact_blocks(
 phone_id TEXT NOT NULL,
 contact_key TEXT NOT NULL,
 reason TEXT NOT NULL,
 blocked_at INTEGER NOT NULL,
 PRIMARY KEY(phone_id, contact_key)
);
CREATE TABLE IF NOT EXISTS webhook_coverage(
 field TEXT PRIMARY KEY,
 count INTEGER NOT NULL DEFAULT 0,
 last_received_at INTEGER NOT NULL
);
