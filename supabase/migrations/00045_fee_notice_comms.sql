-- ============================================================
-- 00045_fee_notice_comms.sql
-- Fee Notice Communications — billing-triggered multi-channel
-- notifications (email, SMS, push) on invoice generated / overdue.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────

CREATE TYPE fee_notice_trigger AS ENUM (
  'invoice_sent',       -- When invoice transitions to "sent"
  'invoice_overdue',    -- When invoice becomes overdue (past due_date)
  'payment_received',   -- Confirmation when payment is recorded
  'payment_failed',     -- When a recurring payment attempt fails
  'reminder_1',         -- First overdue reminder (configurable days)
  'reminder_2',         -- Second overdue reminder
  'reminder_3'          -- Final overdue reminder before escalation
);

CREATE TYPE fee_notice_channel AS ENUM ('email', 'sms', 'push');

CREATE TYPE fee_notice_delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'skipped'     -- e.g. guardian opted out or channel not configured
);

-- ────────────────────────────────────────────────────────────
-- fee_notice_configs — per-tenant configuration for auto-send
-- ────────────────────────────────────────────────────────────

CREATE TABLE fee_notice_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Which triggers are enabled
  enabled_triggers fee_notice_trigger[] NOT NULL DEFAULT ARRAY[
    'invoice_sent'::fee_notice_trigger,
    'invoice_overdue'::fee_notice_trigger,
    'payment_received'::fee_notice_trigger
  ],

  -- Which channels are enabled (ordered by preference)
  enabled_channels fee_notice_channel[] NOT NULL DEFAULT ARRAY[
    'email'::fee_notice_channel,
    'push'::fee_notice_channel
  ],

  -- Reminder schedule (days after due_date)
  reminder_1_days  INT NOT NULL DEFAULT 7,
  reminder_2_days  INT NOT NULL DEFAULT 14,
  reminder_3_days  INT NOT NULL DEFAULT 28,

  -- Auto-send or queue for manual review
  auto_send        BOOLEAN NOT NULL DEFAULT false,

  -- Include payment link in notices
  include_payment_link BOOLEAN NOT NULL DEFAULT true,

  -- Custom message templates (null = use system default)
  template_invoice_sent    TEXT,
  template_invoice_overdue TEXT,
  template_payment_received TEXT,
  template_payment_failed  TEXT,
  template_reminder        TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id)
);

ALTER TABLE fee_notice_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_notice_configs_tenant_isolation"
  ON fee_notice_configs
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ────────────────────────────────────────────────────────────
-- fee_notices — one row per notice sent (or queued)
-- ────────────────────────────────────────────────────────────

CREATE TABLE fee_notices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  guardian_id     UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  trigger_type    fee_notice_trigger NOT NULL,

  -- Snapshot of invoice data at send time (for audit trail)
  invoice_number  TEXT NOT NULL,
  amount_cents    INT NOT NULL,
  due_date        DATE NOT NULL,

  -- Queued by system or manually triggered by admin
  queued_by       UUID REFERENCES users(id),
  queued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- If auto_send is off, admin must approve
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,

  -- Overall status (derived from deliveries, but denormalized for queries)
  status          fee_notice_delivery_status NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,

  -- Custom message override (null = use config template or system default)
  custom_message  TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE fee_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_notices_tenant_isolation"
  ON fee_notices
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX idx_fee_notices_tenant_invoice ON fee_notices(tenant_id, invoice_id);
CREATE INDEX idx_fee_notices_tenant_guardian ON fee_notices(tenant_id, guardian_id);
CREATE INDEX idx_fee_notices_status ON fee_notices(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_fee_notices_trigger ON fee_notices(tenant_id, trigger_type) WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- fee_notice_deliveries — per-channel delivery tracking
-- ────────────────────────────────────────────────────────────

CREATE TABLE fee_notice_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_notice_id   UUID NOT NULL REFERENCES fee_notices(id) ON DELETE CASCADE,
  channel         fee_notice_channel NOT NULL,

  status          fee_notice_delivery_status NOT NULL DEFAULT 'pending',

  -- Channel-specific references
  email_message_id  TEXT,      -- Resend message ID
  sms_message_id    UUID,      -- References sms_messages(id)
  push_dispatch_id  UUID,      -- References notification_dispatches(id)

  recipient_address TEXT,      -- Email address or phone number (for audit)

  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  error_message   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fee_notice_deliveries_notice ON fee_notice_deliveries(fee_notice_id);
CREATE INDEX idx_fee_notice_deliveries_status ON fee_notice_deliveries(status);

-- ────────────────────────────────────────────────────────────
-- Permissions
-- ────────────────────────────────────────────────────────────

INSERT INTO permissions (key, label, description) VALUES
  ('view_fee_notice_comms',   'View Fee Notice Comms',   'View fee notice communication history and configuration'),
  ('manage_fee_notice_comms', 'Manage Fee Notice Comms', 'Configure and send fee notice communications')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner + Admin roles for ALL existing tenants
DO $$
DECLARE
  _role RECORD;
BEGIN
  FOR _role IN
    SELECT rp.role_id
    FROM roles r
    JOIN role_permissions rp ON rp.role_id = r.id
    WHERE r.name IN ('Owner', 'Admin')
    GROUP BY rp.role_id
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT _role.role_id, p.id
    FROM permissions p
    WHERE p.key IN ('view_fee_notice_comms', 'manage_fee_notice_comms')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- updated_at trigger
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER set_fee_notice_configs_updated_at
  BEFORE UPDATE ON fee_notice_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_fee_notices_updated_at
  BEFORE UPDATE ON fee_notices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
