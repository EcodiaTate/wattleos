-- ============================================================
-- Migration 00030: SMS Gateway
-- ============================================================
-- Supports MessageMedia and Burst SMS providers for:
--   • Absence alerts (triggered by absence follow-up)
--   • Emergency comms (triggered from emergency coordination)
--   • Ad-hoc broadcast messages to parents/guardians
--   • Templated messages (e.g. "reminder", "absence", "general")
--
-- Two tables:
--   sms_gateway_config  — one row per tenant, stores provider + API key
--   sms_messages        — append-only log of every outbound SMS
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

-- (stored as TEXT with CHECK — no CREATE TYPE to keep migrations
-- composable without enum ordering issues)

-- ── sms_gateway_config ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS sms_gateway_config (
  tenant_id          UUID        PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  provider           TEXT        NOT NULL DEFAULT 'messagemedia'
                                 CHECK (provider IN ('messagemedia', 'burst')),
  api_key_enc        TEXT        NOT NULL,          -- AES-encrypted; never stored plaintext
  api_secret_enc     TEXT,                          -- MessageMedia needs key+secret; Burst key-only
  sender_id          TEXT        NOT NULL DEFAULT 'WattleOS'
                                 CHECK (char_length(sender_id) BETWEEN 1 AND 11),
  enabled            BOOLEAN     NOT NULL DEFAULT false,
  daily_limit        INT         NOT NULL DEFAULT 500
                                 CHECK (daily_limit BETWEEN 1 AND 50000),
  -- opt-out list: CSV of E.164 numbers that have replied STOP
  opt_out_list       TEXT[]      NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── sms_messages ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sms_messages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- who sent it
  sent_by_user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- recipient
  recipient_phone     TEXT        NOT NULL
                                  CHECK (char_length(recipient_phone) BETWEEN 7 AND 16),
  recipient_name      TEXT,
  -- optional linkages
  student_id          UUID        REFERENCES students(id) ON DELETE SET NULL,
  guardian_id         UUID        REFERENCES guardians(id) ON DELETE SET NULL,
  -- content
  message_body        TEXT        NOT NULL
                                  CHECK (char_length(message_body) BETWEEN 1 AND 1600),
  message_type        TEXT        NOT NULL DEFAULT 'general'
                                  CHECK (message_type IN (
                                    'general', 'absence_alert', 'emergency',
                                    'reminder', 'broadcast'
                                  )),
  -- delivery
  provider            TEXT        NOT NULL
                                  CHECK (provider IN ('messagemedia', 'burst')),
  provider_message_id TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN (
                                    'pending', 'sent', 'delivered', 'failed', 'bounced', 'opted_out'
                                  )),
  error_message       TEXT,
  segment_count       INT         NOT NULL DEFAULT 1
                                  CHECK (segment_count BETWEEN 1 AND 10),
  -- timestamps
  queued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  -- metadata (arbitrary JSON for context)
  metadata            JSONB       NOT NULL DEFAULT '{}'
);

-- Indices for common queries
CREATE INDEX IF NOT EXISTS sms_messages_tenant_queued
  ON sms_messages (tenant_id, queued_at DESC);

CREATE INDEX IF NOT EXISTS sms_messages_tenant_status
  ON sms_messages (tenant_id, status)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS sms_messages_student
  ON sms_messages (tenant_id, student_id)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sms_messages_type
  ON sms_messages (tenant_id, message_type, queued_at DESC);

-- ── updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE TRIGGER sms_gateway_config_updated_at
  BEFORE UPDATE ON sms_gateway_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE sms_gateway_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages       ENABLE ROW LEVEL SECURITY;

-- Config: only users with manage_sms_gateway
CREATE POLICY "sms_config_tenant_select"
  ON sms_gateway_config FOR SELECT
  USING (has_permission(auth.uid(), tenant_id, 'manage_sms_gateway'));

CREATE POLICY "sms_config_tenant_update"
  ON sms_gateway_config FOR UPDATE
  USING (has_permission(auth.uid(), tenant_id, 'manage_sms_gateway'));

CREATE POLICY "sms_config_tenant_insert"
  ON sms_gateway_config FOR INSERT
  WITH CHECK (has_permission(auth.uid(), tenant_id, 'manage_sms_gateway'));

-- Messages: view requires view_sms_gateway or higher; insert requires send_sms
CREATE POLICY "sms_messages_tenant_select"
  ON sms_messages FOR SELECT
  USING (
    has_permission(auth.uid(), tenant_id, 'view_sms_gateway')
    OR has_permission(auth.uid(), tenant_id, 'manage_sms_gateway')
  );

-- Inserts happen server-side via service role (bypasses RLS)
-- so no INSERT policy needed for authenticated users.

-- ── Permissions ───────────────────────────────────────────────

INSERT INTO permissions (key, description) VALUES
  ('view_sms_gateway',   'View outbound SMS messages and delivery logs'),
  ('manage_sms_gateway', 'Configure SMS gateway provider and send broadcast messages'),
  ('send_sms',           'Send individual or bulk SMS messages to parents/guardians')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner + Admin + Head of School for existing tenants
-- (seed_tenant_roles() trigger covers new tenants automatically)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tr.tenant_id, tr.role_id
    FROM   tenant_roles tr
    WHERE  tr.role_id IN (
      SELECT id FROM roles WHERE name IN ('Owner', 'Admin', 'Head of School')
    )
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    SELECT r.role_id, p.key
    FROM   permissions p
    WHERE  p.key IN ('view_sms_gateway', 'manage_sms_gateway', 'send_sms')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
