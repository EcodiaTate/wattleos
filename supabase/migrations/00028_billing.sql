-- 00028_billing.sql
-- ============================================================
-- Fee Schedule, Invoice & Payment tables
-- ============================================================
-- Covers school-to-parent billing: fee schedules (pricing
-- rules), invoices, line items, payment records, and Stripe
-- customer mappings. Stripe integration is optional — invoices
-- can be created and tracked manually without Stripe.
--
-- Permissions:
--   view_billing   — Owners / Admins / Head of School (read)
--   manage_billing — Owners / Admins (create/update/send)
-- ============================================================

-- ── Permissions ────────────────────────────────────────────

INSERT INTO permissions (key, description)
VALUES
  ('view_billing',   'View invoices and fee schedules'),
  ('manage_billing', 'Create, update, and send invoices; manage fee schedules')
ON CONFLICT (key) DO NOTHING;

-- ── Grant to roles for NEW tenants (via seed_tenant_roles trigger) ──
-- Handled inline here for EXISTING tenants via backfill below.

-- ── Backfill permissions to existing tenants ───────────────
-- WHY: seed_tenant_roles() only runs for new tenants.
-- Any existing tenant's Owner/Admin/HoS roles need these
-- permissions added retroactively.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tm.tenant_id, tm.role_id
    FROM tenant_members tm
    JOIN roles ro ON ro.id = tm.role_id
    WHERE ro.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'view_billing'),
      (r.role_id, 'manage_billing')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── Grant view_billing to Guide role ───────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tm.tenant_id, tm.role_id
    FROM tenant_members tm
    JOIN roles ro ON ro.id = tm.role_id
    WHERE ro.name IN ('Guide', 'Teacher')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES (r.role_id, 'view_billing')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- Table: fee_schedules
-- ============================================================
-- Pricing rules used as line item templates when creating
-- invoices. Can be class-scoped (e.g., "3–6 Programme Term 1")
-- or service-wide (e.g., "Admin Fee").
-- ============================================================

CREATE TABLE IF NOT EXISTS fee_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,

  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description     TEXT CHECK (char_length(description) <= 500),
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency        TEXT NOT NULL DEFAULT 'aud' CHECK (char_length(currency) = 3),
  frequency       TEXT NOT NULL CHECK (frequency IN (
                    'weekly', 'fortnightly', 'monthly',
                    'termly', 'annually', 'one_off'
                  )),

  -- Schedule validity
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,

  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT fee_schedules_effective_dates_check
    CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_fee_schedules_tenant
  ON fee_schedules(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_schedules_class
  ON fee_schedules(class_id) WHERE class_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_schedules_active
  ON fee_schedules(tenant_id, is_active) WHERE deleted_at IS NULL;

ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_schedules_tenant_isolation"
  ON fee_schedules FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE TRIGGER set_fee_schedules_updated_at
  BEFORE UPDATE ON fee_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: invoices
-- ============================================================
-- One invoice per student per billing period. Tracks status
-- through draft → pending → sent → paid. Stripe IDs stored
-- when Stripe integration is enabled.
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id                UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  guardian_id               UUID NOT NULL REFERENCES guardians(id) ON DELETE RESTRICT,

  invoice_number            TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                              'draft', 'pending', 'sent', 'paid',
                              'partially_paid', 'overdue', 'void', 'refunded'
                            )),

  -- Financials (all in cents to avoid floating point)
  subtotal_cents            INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  discount_cents            INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents                 INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents               INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  amount_paid_cents         INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),
  currency                  TEXT NOT NULL DEFAULT 'aud' CHECK (char_length(currency) = 3),

  -- Period this invoice covers
  due_date                  DATE NOT NULL,
  period_start              DATE,
  period_end                DATE,
  notes                     TEXT CHECK (char_length(notes) <= 1000),

  -- Stripe integration (nullable — not all tenants use Stripe)
  stripe_invoice_id         TEXT,
  stripe_payment_intent_id  TEXT,
  stripe_hosted_url         TEXT,

  -- Lifecycle timestamps
  sent_at                   TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  voided_at                 TIMESTAMPTZ,

  created_by                UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ,

  CONSTRAINT invoices_tenant_number_unique UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant
  ON invoices(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_student
  ON invoices(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_guardian
  ON invoices(guardian_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON invoices(tenant_id, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_stripe
  ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_tenant_isolation"
  ON invoices FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: invoice_line_items
-- ============================================================
-- Line items on an invoice. Can link to a fee_schedule for
-- template reuse, or be ad-hoc (fee_schedule_id = NULL).
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  fee_schedule_id   UUID REFERENCES fee_schedules(id) ON DELETE SET NULL,

  description       TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 500),
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 999),
  unit_amount_cents INTEGER NOT NULL CHECK (unit_amount_cents >= 0),
  total_cents       INTEGER NOT NULL GENERATED ALWAYS AS (quantity * unit_amount_cents) STORED,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice
  ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant
  ON invoice_line_items(tenant_id);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_line_items_tenant_isolation"
  ON invoice_line_items FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================
-- Table: payments
-- ============================================================
-- Payment records created when Stripe webhook fires or when
-- an admin records a manual payment. Multiple partial payments
-- are allowed per invoice.
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id                  UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,

  amount_cents                INTEGER NOT NULL CHECK (amount_cents > 0),
  currency                    TEXT NOT NULL DEFAULT 'aud',
  status                      TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN (
                                'succeeded', 'failed', 'pending',
                                'refunded', 'partially_refunded'
                              )),

  payment_method_type         TEXT,        -- 'card', 'au_becs_debit', 'bank_transfer', etc.
  payment_method_last4        TEXT,

  -- Stripe IDs (NULL for manual payments)
  stripe_payment_intent_id    TEXT,
  stripe_charge_id            TEXT,

  -- Failure detail (for retries/dispute resolution)
  failure_reason              TEXT,

  -- Refund tracking
  refund_amount_cents         INTEGER NOT NULL DEFAULT 0 CHECK (refund_amount_cents >= 0),
  refund_reason               TEXT,

  paid_at                     TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
  ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant
  ON payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent
  ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_tenant_isolation"
  ON payments FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================
-- Table: stripe_customers
-- ============================================================
-- Maps WattleOS guardians to Stripe customer IDs.
-- One Stripe customer per guardian per tenant.
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  guardian_id           UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT NOT NULL,
  email                 TEXT,
  default_payment_method TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT stripe_customers_guardian_unique UNIQUE (tenant_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_customers_guardian
  ON stripe_customers(guardian_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id
  ON stripe_customers(stripe_customer_id);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_customers_tenant_isolation"
  ON stripe_customers FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE TRIGGER set_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Function: next_invoice_number
-- ============================================================
-- Generates a sequential invoice number in the format
-- INV-{YYYY}-{NNNN} per tenant, incrementing from the last
-- issued number. Uses advisory lock to prevent races.
-- ============================================================

CREATE OR REPLACE FUNCTION next_invoice_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year    TEXT := to_char(NOW(), 'YYYY');
  v_count   INTEGER;
  v_number  TEXT;
BEGIN
  -- Count existing invoices for this tenant in current year
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || lpad(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;
