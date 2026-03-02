-- 00032_recurring_billing.sql
-- Direct debit / recurring billing with Stripe BECS, CCS gap fee auto-collect, failed payment retry

-- ── Permissions ────────────────────────────────────────────

INSERT INTO permissions (key, description)
VALUES
  ('view_recurring_billing',   'View recurring billing setups and payment history'),
  ('manage_recurring_billing', 'Create, update, and manage recurring billing setups and payment schedules')
ON CONFLICT (key) DO NOTHING;

-- ── Grant to roles for EXISTING tenants ─────────────────────
-- WHY: seed_tenant_roles() only runs for new tenants.
-- Any existing tenant's Owner/Admin need these permissions added retroactively.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tm.tenant_id, tm.role_id
    FROM tenant_members tm
    JOIN roles ro ON ro.id = tm.role_id
    WHERE ro.name IN ('Owner', 'Admin')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'view_recurring_billing'),
      (r.role_id, 'manage_recurring_billing')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

CREATE TYPE billing_collection_method AS ENUM ('stripe_becs', 'stripe_card', 'manual_bank_transfer');
CREATE TYPE recurring_billing_status AS ENUM ('active', 'paused', 'cancelled', 'failed');
CREATE TYPE payment_attempt_status AS ENUM ('pending', 'succeeded', 'failed', 'retry_scheduled');
CREATE TYPE failure_reason AS ENUM ('insufficient_funds', 'card_declined', 'expired_card', 'invalid_account', 'bank_error', 'other');

-- Recurring billing setup per family/invoice series
CREATE TABLE recurring_billing_setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Collection method & Stripe details
  collection_method billing_collection_method NOT NULL DEFAULT 'stripe_becs',
  stripe_setup_intent_id TEXT,
  stripe_payment_method_id TEXT,

  -- Mandate info (for BECS Direct Debit)
  mandate_id TEXT,
  mandate_accepted_at TIMESTAMPTZ,
  mandate_accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Account holder details
  account_holder_name TEXT NOT NULL,
  account_holder_email TEXT NOT NULL,
  account_holder_phone TEXT,

  -- CCS gap fee specific
  is_ccs_gap_fee_setup BOOLEAN NOT NULL DEFAULT FALSE,
  ccs_program_name TEXT,

  -- Status & auto-retry config
  status recurring_billing_status NOT NULL DEFAULT 'active',
  auto_retry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  max_retry_attempts INT NOT NULL DEFAULT 3,
  retry_interval_days INT NOT NULL DEFAULT 5,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancelled_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancellation_reason TEXT
);

-- Recurring billing schedules (one per invoice type/term)
CREATE TABLE recurring_billing_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recurring_billing_setup_id UUID NOT NULL REFERENCES recurring_billing_setups(id) ON DELETE CASCADE,

  -- Which invoices this schedule covers
  invoice_type TEXT NOT NULL, -- e.g. 'tuition', 'ccs_gap_fee', 'activity_fees'
  collection_day_of_month INT NOT NULL DEFAULT 1, -- 1-28

  -- Amount & frequency
  fixed_amount_cents INT, -- NULL = match actual invoice total
  description TEXT NOT NULL,

  -- Enabled/disabled
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment attempt log
CREATE TABLE billing_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recurring_billing_setup_id UUID NOT NULL REFERENCES recurring_billing_setups(id) ON DELETE CASCADE,
  recurring_billing_schedule_id UUID REFERENCES recurring_billing_schedules(id) ON DELETE SET NULL,

  -- Invoice being collected
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Amount attempted (cents)
  amount_cents INT NOT NULL,

  -- Attempt details
  attempt_number INT NOT NULL DEFAULT 1,
  status payment_attempt_status NOT NULL DEFAULT 'pending',

  -- Stripe charge/payment intent details
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- Result
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason failure_reason,
  failure_message TEXT,

  -- Retry tracking
  next_retry_at TIMESTAMPTZ,
  retries_exhausted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Failed payment follow-up log
CREATE TABLE billing_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  recurring_billing_setup_id UUID NOT NULL REFERENCES recurring_billing_setups(id) ON DELETE CASCADE,

  -- Which payment(s) failed
  amount_cents INT NOT NULL,
  failure_reason failure_reason NOT NULL,

  -- Follow-up
  notification_sent_at TIMESTAMPTZ,
  notification_method TEXT, -- 'sms', 'email', 'in_app'
  parent_response_at TIMESTAMPTZ,
  parent_response_action TEXT, -- 'retry', 'update_payment', 'contact_support'

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE recurring_billing_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_billing_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_billing_setups_tenant_isolation" ON recurring_billing_setups
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "recurring_billing_schedules_tenant_isolation" ON recurring_billing_schedules
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "billing_payment_attempts_tenant_isolation" ON billing_payment_attempts
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));
CREATE POLICY "billing_failures_tenant_isolation" ON billing_failures
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- Indexes
CREATE INDEX ON recurring_billing_setups (tenant_id);
CREATE INDEX ON recurring_billing_setups (tenant_id, family_id);
CREATE INDEX ON recurring_billing_setups (tenant_id, status);
CREATE INDEX ON recurring_billing_setups (tenant_id, created_at DESC);
CREATE INDEX ON recurring_billing_setups (stripe_setup_intent_id);
CREATE INDEX ON recurring_billing_schedules (tenant_id, recurring_billing_setup_id);
CREATE INDEX ON recurring_billing_schedules (tenant_id, is_active);
CREATE INDEX ON billing_payment_attempts (tenant_id, recurring_billing_setup_id);
CREATE INDEX ON billing_payment_attempts (tenant_id, status);
CREATE INDEX ON billing_payment_attempts (tenant_id, created_at DESC);
CREATE INDEX ON billing_payment_attempts (stripe_payment_intent_id);
CREATE INDEX ON billing_failures (tenant_id, family_id);
CREATE INDEX ON billing_failures (tenant_id, created_at DESC);
CREATE INDEX ON billing_failures (tenant_id, resolved_at);

-- Triggers for updated_at
CREATE TRIGGER update_recurring_billing_setups_updated_at
  BEFORE UPDATE ON recurring_billing_setups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_billing_schedules_updated_at
  BEFORE UPDATE ON recurring_billing_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_payment_attempts_updated_at
  BEFORE UPDATE ON billing_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_failures_updated_at
  BEFORE UPDATE ON billing_failures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
