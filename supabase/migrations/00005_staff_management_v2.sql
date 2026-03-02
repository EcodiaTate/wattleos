-- supabase/migrations/00005_staff_management_v2.sql
--
-- ============================================================
-- WattleOS V2 - Staff Management v2 (additive)
-- ============================================================
-- Builds on 00004 which created staff_profiles and
-- staff_compliance_records. This migration adds:
--
--   1. New columns on staff_profiles (HR, visa, qualifications)
--   2. New compliance record types + issuing_state column
--   3. tenant_user_permission_overrides table
--   4. Updated has_permission() that factors in overrides
-- ============================================================


-- ============================================================
-- 1. Expand staff_profiles
-- ============================================================

-- Personal
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Employment extras
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS position_title TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS end_date DATE;

-- Working rights / visa
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS working_rights TEXT
  CHECK (working_rights IN ('citizen', 'permanent_resident', 'visa_holder'));
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS visa_subclass TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS visa_expiry DATE;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS work_restrictions TEXT;

-- Qualifications
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS qualification_level TEXT
  CHECK (qualification_level IN (
    'cert3', 'diploma', 'bachelor', 'masters',
    'ect', 'working_towards', 'none'
  ));
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS qualification_detail TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS teacher_registration_number TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS teacher_registration_state TEXT;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS teacher_registration_expiry DATE;
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS acecqa_approval_number TEXT;

-- Index for visa expiry alerts
CREATE INDEX IF NOT EXISTS idx_staff_profiles_visa_expiry
  ON staff_profiles (tenant_id, visa_expiry)
  WHERE visa_expiry IS NOT NULL;


-- ============================================================
-- 2. Expand staff_compliance_records
-- ============================================================

-- Add issuing_state column
ALTER TABLE staff_compliance_records ADD COLUMN IF NOT EXISTS issuing_state TEXT;

-- Widen the record_type CHECK to include cpr, child_protection, food_safety.
-- The original constraint was defined inline and named automatically.
-- Drop it, then re-add with the expanded list.
ALTER TABLE staff_compliance_records DROP CONSTRAINT IF EXISTS staff_compliance_records_record_type_check;

ALTER TABLE staff_compliance_records ADD CONSTRAINT staff_compliance_records_record_type_check
  CHECK (record_type IN (
    'wwcc',
    'first_aid',
    'cpr',
    'anaphylaxis',
    'asthma_management',
    'child_protection',
    'food_safety',
    'police_check',
    'qualification',
    'other'
  ));


-- ============================================================
-- 3. tenant_user_permission_overrides
-- ============================================================
-- Per-user permission grants and denials layered ON TOP of
-- their role. Resolution:
--   effective = (role_perms ∪ grant_overrides) ∖ deny_overrides
-- Deny always wins.
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_user_permission_overrides (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_user_id  UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES permissions(id)  ON DELETE CASCADE,
  override_type   TEXT NOT NULL CHECK (override_type IN ('grant', 'deny')),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE (tenant_user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_overrides_tenant_user
  ON tenant_user_permission_overrides (tenant_user_id);

ALTER TABLE tenant_user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage permission overrides"
  ON tenant_user_permission_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.id = tenant_user_permission_overrides.tenant_user_id
        AND tu.tenant_id = current_tenant_id()
    )
    AND has_permission('manage_users')
  );

CREATE POLICY "Users read own overrides"
  ON tenant_user_permission_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.id = tenant_user_permission_overrides.tenant_user_id
        AND tu.tenant_id = current_tenant_id()
        AND tu.user_id = auth.uid()
    )
  );


-- ============================================================
-- 4. Replace has_permission() to factor in overrides
-- ============================================================
-- CREATE OR REPLACE is safe — replaces the function body
-- without dropping dependent objects.
-- ============================================================

CREATE OR REPLACE FUNCTION has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (
    -- Permission exists via role OR via a grant override
    EXISTS (
      SELECT 1
      FROM tenant_users tu
      JOIN role_permissions rp ON rp.role_id = tu.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = current_tenant_id()
        AND tu.deleted_at IS NULL
        AND p.key = required_permission

      UNION ALL

      SELECT 1
      FROM tenant_users tu
      JOIN tenant_user_permission_overrides ov ON ov.tenant_user_id = tu.id
      JOIN permissions p ON p.id = ov.permission_id
      WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = current_tenant_id()
        AND tu.deleted_at IS NULL
        AND p.key = required_permission
        AND ov.override_type = 'grant'
    )
    -- AND not explicitly denied
    AND NOT EXISTS (
      SELECT 1
      FROM tenant_users tu
      JOIN tenant_user_permission_overrides ov ON ov.tenant_user_id = tu.id
      JOIN permissions p ON p.id = ov.permission_id
      WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = current_tenant_id()
        AND tu.deleted_at IS NULL
        AND p.key = required_permission
        AND ov.override_type = 'deny'
    )
  );
$$;
