-- ============================================================
-- WattleOS V2 — Migration 00041: Debt Management
-- ============================================================
-- Adds tables for:
--   1. debt_collection_stages  — state machine: overdue → reminder_sent →
--                                escalated → payment_plan → referred → written_off
--   2. debt_payment_plans      — installment schedules negotiated with families
--   3. debt_payment_plan_items — individual installments in a plan
--   4. debt_reminder_sequences — tenant-level reminder automation config
--   5. debt_reminder_log       — log of every reminder dispatched
--   6. debt_write_offs         — formal write-off records with approver
--
-- Permissions added:
--   view_debt_management, manage_debt_management, approve_write_offs
-- ============================================================

-- ── 1. Debt Collection Stages ────────────────────────────────
-- One row per overdue invoice, tracking its collection progress.
-- Created automatically when an invoice's due_date passes
-- (via action or cron), or manually by admin.

CREATE TABLE debt_collection_stages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Stage tracks progression through the collection workflow
  stage            TEXT NOT NULL DEFAULT 'overdue'
                   CHECK (stage IN (
                     'overdue',          -- just become overdue, no action yet
                     'reminder_1_sent',  -- first reminder dispatched
                     'reminder_2_sent',  -- second reminder dispatched
                     'reminder_3_sent',  -- final reminder dispatched
                     'escalated',        -- escalated to principal / management
                     'payment_plan',     -- active payment plan agreed
                     'referred',         -- referred to collection agency / solicitor
                     'written_off',      -- formally written off
                     'resolved'          -- paid or otherwise resolved
                   )),

  -- Days overdue at the time this record was created
  days_overdue_at_creation INTEGER NOT NULL DEFAULT 0,

  -- Outstanding balance when the stage was created
  outstanding_cents BIGINT NOT NULL DEFAULT 0,

  -- Who owns this debt action (defaults to creating staff member)
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Internal notes visible only to admin
  internal_notes   TEXT,

  -- Resolved when the debt is paid/written-off
  resolved_at      TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active collection stage per invoice
  UNIQUE (tenant_id, invoice_id)
);

CREATE INDEX idx_debt_collection_stages_tenant     ON debt_collection_stages(tenant_id);
CREATE INDEX idx_debt_collection_stages_invoice    ON debt_collection_stages(invoice_id);
CREATE INDEX idx_debt_collection_stages_stage      ON debt_collection_stages(tenant_id, stage);
CREATE INDEX idx_debt_collection_stages_assigned   ON debt_collection_stages(assigned_to_user_id)
  WHERE assigned_to_user_id IS NOT NULL;

-- ── 2. Debt Payment Plans ─────────────────────────────────────
-- When a family negotiates a repayment plan for an overdue balance.

CREATE TABLE debt_payment_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_stage_id UUID NOT NULL REFERENCES debt_collection_stages(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Total agreed debt under this plan
  total_agreed_cents BIGINT NOT NULL CHECK (total_agreed_cents > 0),

  -- How often installments are paid
  frequency        TEXT NOT NULL DEFAULT 'fortnightly'
                   CHECK (frequency IN ('weekly', 'fortnightly', 'monthly')),

  -- Status of the plan itself
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft', 'active', 'completed', 'defaulted', 'cancelled')),

  -- Who approved / created this plan
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Guardian was notified/agreed
  guardian_agreed  BOOLEAN NOT NULL DEFAULT false,
  guardian_agreed_at TIMESTAMPTZ,

  -- Free-form notes on terms
  terms_notes      TEXT,

  -- First installment due
  first_due_date   DATE NOT NULL,

  defaulted_at     TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  cancelled_reason TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active plan per invoice (prevent overlapping plans)
  UNIQUE (tenant_id, invoice_id)
);

CREATE INDEX idx_debt_payment_plans_tenant     ON debt_payment_plans(tenant_id);
CREATE INDEX idx_debt_payment_plans_invoice    ON debt_payment_plans(invoice_id);
CREATE INDEX idx_debt_payment_plans_status     ON debt_payment_plans(tenant_id, status);

-- ── 3. Debt Payment Plan Items ────────────────────────────────
-- Individual installments in a payment plan.

CREATE TABLE debt_payment_plan_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id          UUID NOT NULL REFERENCES debt_payment_plans(id) ON DELETE CASCADE,

  -- Sequence number in the plan (1-based)
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1),

  due_date         DATE NOT NULL,
  amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),

  -- Fulfilled once payment is received and linked
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'missed', 'waived')),

  paid_amount_cents BIGINT NOT NULL DEFAULT 0,
  paid_at          TIMESTAMPTZ,

  -- Link to the actual payment record when paid
  payment_id       UUID REFERENCES payments(id) ON DELETE SET NULL,

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (plan_id, installment_number)
);

CREATE INDEX idx_debt_plan_items_plan       ON debt_payment_plan_items(plan_id);
CREATE INDEX idx_debt_plan_items_due_date   ON debt_payment_plan_items(tenant_id, due_date)
  WHERE status = 'pending';

-- ── 4. Debt Reminder Sequences ────────────────────────────────
-- Tenant-level configuration for automated reminder timing.
-- Default: 3 reminders at +7, +14, +30 days overdue.

CREATE TABLE debt_reminder_sequences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Which reminder in the sequence (1, 2, 3)
  sequence_number  INTEGER NOT NULL CHECK (sequence_number BETWEEN 1 AND 5),

  -- How many days after due_date to send this reminder
  trigger_days_overdue INTEGER NOT NULL CHECK (trigger_days_overdue > 0),

  -- Subject + body template (supports {{student_name}}, {{amount_owing}},
  -- {{due_date}}, {{invoice_number}}, {{school_name}} placeholders)
  subject_template TEXT NOT NULL,
  body_template    TEXT NOT NULL,

  -- Send via in-app notification and/or email
  send_via_notification BOOLEAN NOT NULL DEFAULT true,
  send_via_email        BOOLEAN NOT NULL DEFAULT true,

  is_active        BOOLEAN NOT NULL DEFAULT true,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, sequence_number)
);

CREATE INDEX idx_debt_reminder_sequences_tenant ON debt_reminder_sequences(tenant_id)
  WHERE is_active = true;

-- Seed default reminder sequence for new tenants via trigger
-- (Handled in application layer via ensureDefaultReminderSequence())

-- ── 5. Debt Reminder Log ──────────────────────────────────────
-- Every reminder dispatched — for auditing and "last contacted" display.

CREATE TABLE debt_reminder_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_stage_id UUID NOT NULL REFERENCES debt_collection_stages(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sequence_number  INTEGER,                   -- NULL = manual send
  reminder_type    TEXT NOT NULL DEFAULT 'auto'
                   CHECK (reminder_type IN ('auto', 'manual')),

  -- Who triggered a manual reminder (NULL for auto)
  sent_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What was sent
  subject          TEXT NOT NULL,
  body             TEXT NOT NULL,

  -- Delivery channels used
  sent_via_notification BOOLEAN NOT NULL DEFAULT false,
  sent_via_email        BOOLEAN NOT NULL DEFAULT false,
  sent_via_sms          BOOLEAN NOT NULL DEFAULT false,

  -- Outcome tracking
  opened_at        TIMESTAMPTZ,
  payment_received_after BOOLEAN NOT NULL DEFAULT false,

  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debt_reminder_log_tenant    ON debt_reminder_log(tenant_id);
CREATE INDEX idx_debt_reminder_log_invoice   ON debt_reminder_log(invoice_id);
CREATE INDEX idx_debt_reminder_log_stage     ON debt_reminder_log(collection_stage_id);

-- ── 6. Debt Write-Offs ───────────────────────────────────────
-- Formal write-off record when a debt is deemed uncollectable.

CREATE TABLE debt_write_offs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  collection_stage_id UUID NOT NULL REFERENCES debt_collection_stages(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Amount being written off
  write_off_amount_cents BIGINT NOT NULL CHECK (write_off_amount_cents > 0),

  -- Reason codes
  reason           TEXT NOT NULL
                   CHECK (reason IN (
                     'uncollectable',
                     'hardship',
                     'dispute_resolved',
                     'deceased',
                     'relocated',
                     'statute_barred',
                     'other'
                   )),
  reason_notes     TEXT,

  -- Approver (must have approve_write_offs permission)
  approved_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Requestor (may differ from approver)
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Reference number for accounting
  write_off_reference TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One write-off per invoice
  UNIQUE (tenant_id, invoice_id)
);

CREATE INDEX idx_debt_write_offs_tenant  ON debt_write_offs(tenant_id);
CREATE INDEX idx_debt_write_offs_invoice ON debt_write_offs(invoice_id);

-- ── Permissions ───────────────────────────────────────────────
INSERT INTO permissions (key, label, description, module) VALUES
  ('view_debt_management',  'View Debt Management',  'View overdue invoices and debt collection stages',    'finance'),
  ('manage_debt_management','Manage Debt Management','Create payment plans, send reminders, escalate debts','finance'),
  ('approve_write_offs',    'Approve Write-Offs',    'Approve formal write-off of bad debt',                'finance')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner + Admin + Head of School for ALL existing tenants
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rp.role_id
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE p.key = 'manage_billing'
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.id FROM permissions p
    WHERE p.key IN ('view_debt_management','manage_debt_management')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- approve_write_offs — Owner only (most restrictive)
  FOR r IN
    SELECT rp.role_id
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE p.key = 'manage_tenant_settings'
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.role_id, p.id FROM permissions p
    WHERE p.key = 'approve_write_offs'
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE debt_collection_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment_plan_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_reminder_sequences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_reminder_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_write_offs          ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (server actions use service role)
CREATE POLICY "service_role_full_access" ON debt_collection_stages   FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON debt_payment_plans       FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON debt_payment_plan_items  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON debt_reminder_sequences  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON debt_reminder_log        FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON debt_write_offs          FOR ALL TO service_role USING (true);

-- Authenticated users: tenant-scoped read via has_permission check
CREATE POLICY "tenant_read" ON debt_collection_stages  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_debt_management'));

CREATE POLICY "tenant_read" ON debt_payment_plans      FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_debt_management'));

CREATE POLICY "tenant_read" ON debt_payment_plan_items FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_debt_management'));

CREATE POLICY "tenant_read" ON debt_reminder_sequences FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_debt_management'));

CREATE POLICY "tenant_read" ON debt_reminder_log       FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_debt_management'));

CREATE POLICY "tenant_read" ON debt_write_offs         FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_debt_management'));

-- ── Updated-at triggers ───────────────────────────────────────
CREATE TRIGGER set_updated_at BEFORE UPDATE ON debt_collection_stages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON debt_payment_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON debt_payment_plan_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON debt_reminder_sequences
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
