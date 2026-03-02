-- supabase/migrations/00020_visitor_contractor_log.sql
--
-- ============================================================
-- WattleOS V2 — Visitor & Contractor Sign-In Log
-- ============================================================
-- Two tables:
--   visitor_sign_in_records  — parents, community members,
--     officials, delivery personnel, and other visitors.
--   contractor_sign_in_records — tradespersons and service
--     providers who need licence/insurance verification.
--
-- Design notes:
--   - Both tables are tenant-scoped and soft-deleted.
--   - No FK to students — visitors are not always associated
--     with a specific student.
--   - signed_out_at NULL = currently signed in.
--   - Composite index on tenant_id + signed_in_at for
--     efficient today-view and date-range queries.
--   - Permissions inserted below and backfilled to Owner +
--     Admin roles for all existing tenants.
-- ============================================================

-- ── Visitor sign-in records ────────────────────────────────

CREATE TABLE IF NOT EXISTS visitor_sign_in_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who
  visitor_name        TEXT NOT NULL CHECK (char_length(visitor_name) <= 150),
  visitor_type        TEXT NOT NULL CHECK (visitor_type IN (
                        'parent_guardian', 'community_member', 'official',
                        'delivery', 'volunteer', 'other'
                      )),
  organisation        TEXT CHECK (char_length(organisation) <= 150),

  -- Purpose
  purpose             TEXT NOT NULL CHECK (char_length(purpose) <= 300),
  host_name           TEXT CHECK (char_length(host_name) <= 150),
  badge_number        TEXT CHECK (char_length(badge_number) <= 30),

  -- Verification
  id_sighted          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Times
  signed_in_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_out_at       TIMESTAMPTZ,

  -- Notes
  notes               TEXT CHECK (char_length(notes) <= 500),

  -- Housekeeping
  recorded_by         UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visitor_sign_in_tenant_date
  ON visitor_sign_in_records (tenant_id, signed_in_at DESC)
  WHERE deleted_at IS NULL;

-- ── Contractor sign-in records ─────────────────────────────

CREATE TABLE IF NOT EXISTS contractor_sign_in_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who
  company_name          TEXT NOT NULL CHECK (char_length(company_name) <= 150),
  contact_name          TEXT NOT NULL CHECK (char_length(contact_name) <= 150),
  trade                 TEXT CHECK (char_length(trade) <= 100),

  -- Licence & insurance
  licence_number        TEXT CHECK (char_length(licence_number) <= 60),
  insurance_number      TEXT CHECK (char_length(insurance_number) <= 60),
  insurance_expiry      DATE,

  -- Induction
  induction_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  wwcc_number           TEXT CHECK (char_length(wwcc_number) <= 30),
  wwcc_verified         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Work
  work_location         TEXT NOT NULL CHECK (char_length(work_location) <= 200),
  work_description      TEXT CHECK (char_length(work_description) <= 300),

  -- Times
  signed_in_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_out_at         TIMESTAMPTZ,

  -- Notes
  notes                 TEXT CHECK (char_length(notes) <= 500),

  -- Housekeeping
  recorded_by           UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contractor_sign_in_tenant_date
  ON contractor_sign_in_records (tenant_id, signed_in_at DESC)
  WHERE deleted_at IS NULL;

-- ── Permissions ────────────────────────────────────────────

INSERT INTO permissions (key, description) VALUES
  ('view_visitor_log',      'View visitor sign-in records'),
  ('manage_visitor_log',    'Create, sign-out, and delete visitor records'),
  ('view_contractor_log',   'View contractor sign-in records'),
  ('manage_contractor_log', 'Create, sign-out, and delete contractor records')
ON CONFLICT (key) DO NOTHING;

-- ── Backfill Owner, Admin, Head of School roles ────────────
-- seed_tenant_roles() only fires for NEW tenants. We must
-- backfill manually for all existing tenants.

DO $$
DECLARE
  perm_key TEXT;
  role_row RECORD;
BEGIN
  FOR perm_key IN
    SELECT unnest(ARRAY[
      'view_visitor_log', 'manage_visitor_log',
      'view_contractor_log', 'manage_contractor_log'
    ])
  LOOP
    FOR role_row IN
      SELECT r.id
      FROM   roles r
      WHERE  r.name IN ('Owner', 'Admin', 'Head of School')
    LOOP
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_row.id, perm_key)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE visitor_sign_in_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_sign_in_records ENABLE ROW LEVEL SECURITY;

-- Visitors: read if has view_visitor_log
CREATE POLICY "visitor_log_select" ON visitor_sign_in_records
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), 'view_visitor_log')
    AND deleted_at IS NULL
  );

-- Visitors: insert/update/delete if has manage_visitor_log
CREATE POLICY "visitor_log_write" ON visitor_sign_in_records
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), 'manage_visitor_log')
  );

-- Contractors: read
CREATE POLICY "contractor_log_select" ON contractor_sign_in_records
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), 'view_contractor_log')
    AND deleted_at IS NULL
  );

-- Contractors: write
CREATE POLICY "contractor_log_write" ON contractor_sign_in_records
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), 'manage_contractor_log')
  );
