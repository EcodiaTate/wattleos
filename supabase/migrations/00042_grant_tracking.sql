-- ============================================================
-- WattleOS V2 — Migration 00042: Grant Tracking
-- ============================================================
-- Adds tables for:
--   1. grants              — core grant records with funding body, amount, period, acquittal
--   2. grant_milestones    — reporting/acquittal milestones within a grant
--   3. grant_expenditures  — expenditure line items against a grant budget
--   4. grant_documents     — document/evidence attachments linked to grants
--
-- Permissions added:
--   view_grant_tracking, manage_grant_tracking
-- ============================================================

-- ── 1. Grants ────────────────────────────────────────────────
-- Core grant record: tracks the lifecycle from draft → active → acquitted → closed.

CREATE TABLE grants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Grant identity
  name             TEXT NOT NULL,
  reference_number TEXT,                        -- funder's reference / contract number
  funding_body     TEXT NOT NULL,               -- e.g. "Dept of Education", "ISQ", "AISWA"

  -- Money (always stored in cents to avoid floating-point issues)
  amount_cents     BIGINT NOT NULL CHECK (amount_cents >= 0),
  spent_cents      BIGINT NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),

  -- Grant period
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,

  -- Key dates
  acquittal_due_date DATE,                      -- when the acquittal report is due
  acquitted_at     TIMESTAMPTZ,                 -- when the grant was actually acquitted

  -- Status tracks the grant lifecycle
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN (
                     'draft',       -- being prepared, not yet submitted
                     'submitted',   -- application sent to funding body
                     'approved',    -- approved but not yet started
                     'active',      -- funds received, grant period underway
                     'acquitted',   -- final report submitted and accepted
                     'closed'       -- grant period ended, fully reconciled
                   )),

  -- Category for reporting
  category         TEXT NOT NULL DEFAULT 'general'
                   CHECK (category IN (
                     'general',
                     'capital',          -- building/infrastructure
                     'professional_dev', -- PD / training
                     'curriculum',       -- curriculum resources
                     'technology',       -- IT / equipment
                     'community',        -- community programs
                     'research',         -- action research
                     'other'
                   )),

  -- Ownership
  managed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Description / notes
  description      TEXT,
  conditions       TEXT,                        -- funding conditions / requirements
  internal_notes   TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate grant names per tenant
  UNIQUE (tenant_id, name),

  -- End date must be after start date
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_grants_tenant        ON grants(tenant_id);
CREATE INDEX idx_grants_status        ON grants(tenant_id, status);
CREATE INDEX idx_grants_acquittal_due ON grants(tenant_id, acquittal_due_date)
  WHERE acquittal_due_date IS NOT NULL AND status NOT IN ('acquitted', 'closed');
CREATE INDEX idx_grants_managed_by    ON grants(managed_by_user_id)
  WHERE managed_by_user_id IS NOT NULL;

-- ── 2. Grant Milestones ─────────────────────────────────────
-- Reporting milestones, deliverables, or acquittal checkpoints.

CREATE TABLE grant_milestones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grant_id         UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,

  title            TEXT NOT NULL,
  description      TEXT,
  due_date         DATE NOT NULL,

  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),

  completed_at     TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grant_milestones_grant    ON grant_milestones(grant_id);
CREATE INDEX idx_grant_milestones_due      ON grant_milestones(tenant_id, due_date)
  WHERE status IN ('pending', 'in_progress');

-- ── 3. Grant Expenditures ───────────────────────────────────
-- Line-item spending against a grant budget.

CREATE TABLE grant_expenditures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grant_id         UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,

  description      TEXT NOT NULL,
  amount_cents     BIGINT NOT NULL CHECK (amount_cents > 0),
  date             DATE NOT NULL,

  -- Optional categorisation
  category         TEXT,                        -- free text for now

  -- Optional link to an invoice
  invoice_id       UUID,                        -- soft reference, not FK (invoice may not exist)

  -- Receipt / evidence reference
  receipt_reference TEXT,

  recorded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grant_expenditures_grant  ON grant_expenditures(grant_id);
CREATE INDEX idx_grant_expenditures_date   ON grant_expenditures(tenant_id, date);

-- ── 4. Grant Documents ──────────────────────────────────────
-- File attachments: applications, acquittal reports, letters, etc.

CREATE TABLE grant_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grant_id         UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,

  file_name        TEXT NOT NULL,
  file_url         TEXT NOT NULL,               -- Supabase Storage path
  file_size_bytes  BIGINT,
  mime_type        TEXT,

  document_type    TEXT NOT NULL DEFAULT 'other'
                   CHECK (document_type IN (
                     'application',      -- grant application
                     'approval_letter',  -- funding approval letter
                     'agreement',        -- funding agreement / contract
                     'progress_report',  -- interim progress report
                     'acquittal_report', -- final acquittal report
                     'receipt',          -- receipt / invoice evidence
                     'correspondence',   -- general correspondence
                     'other'
                   )),

  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grant_documents_grant ON grant_documents(grant_id);

-- ── Permissions ───────────────────────────────────────────────
INSERT INTO permissions (key, label, description, module) VALUES
  ('view_grant_tracking',  'View Grant Tracking',  'View grants, milestones, and expenditures',      'finance'),
  ('manage_grant_tracking','Manage Grant Tracking','Create, edit, and manage grants and expenditures','finance')
ON CONFLICT (key) DO NOTHING;

-- Grant to existing roles that have manage_billing (Owner + Admin + Business Manager)
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
    WHERE p.key IN ('view_grant_tracking','manage_grant_tracking')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE grants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_milestones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_expenditures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_documents     ENABLE ROW LEVEL SECURITY;

-- Service role full access (server actions use service role)
CREATE POLICY "service_role_full_access" ON grants              FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON grant_milestones    FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON grant_expenditures  FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_full_access" ON grant_documents     FOR ALL TO service_role USING (true);

-- Authenticated: tenant-scoped read
CREATE POLICY "tenant_read" ON grants              FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_grant_tracking'));
CREATE POLICY "tenant_read" ON grant_milestones    FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_grant_tracking'));
CREATE POLICY "tenant_read" ON grant_expenditures  FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_grant_tracking'));
CREATE POLICY "tenant_read" ON grant_documents     FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant_id() AND has_permission('view_grant_tracking'));

-- ── Updated-at triggers ─────────────────────────────────────
CREATE TRIGGER set_updated_at BEFORE UPDATE ON grants
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON grant_milestones
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON grant_expenditures
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
