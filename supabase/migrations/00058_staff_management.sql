-- supabase/migrations/00058_staff_management.sql
--
-- ============================================================
-- WattleOS V2 - Staff Management (Module 15)
-- ============================================================
-- Adds:
--   staff_profiles                     — full HR profile per user per tenant
--   staff_compliance_records           — WWCC, first aid, qualifications, etc.
--   tenant_user_permission_overrides   — per-user grant/deny on top of role
--
-- Also replaces has_permission() to factor in overrides.
--
-- RLS:
--   manage_users → full CRUD on all three tables
--   own user_id  → SELECT own row only
-- ============================================================


-- ============================================================
-- 1. staff_profiles
-- ============================================================
-- Full HR profile for a staff member at a specific school.
-- Created lazily (upserted) on first admin edit.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,

  -- ── Personal ─────────────────────────────────────────────
  date_of_birth           DATE,

  -- ── Contact ──────────────────────────────────────────────
  phone                   TEXT,
  address                 TEXT,

  -- ── Emergency contact ────────────────────────────────────
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  -- ── Employment ───────────────────────────────────────────
  employment_type         TEXT CHECK (
                            employment_type IN (
                              'full_time', 'part_time', 'casual', 'contractor'
                            )
                          ),
  position_title          TEXT,     -- e.g. "Room Leader", "Educational Leader"
  start_date              DATE,
  end_date                DATE,     -- NULL = still employed

  -- ── Working Rights / Visa ────────────────────────────────
  working_rights          TEXT CHECK (
                            working_rights IN (
                              'citizen', 'permanent_resident', 'visa_holder'
                            )
                          ),
  visa_subclass           TEXT,     -- e.g. "482", "500", "485", "417"
  visa_expiry             DATE,
  work_restrictions       TEXT,     -- e.g. "40 hrs / fortnight"

  -- ── Qualifications ──────────────────────────────────────
  qualification_level     TEXT CHECK (
                            qualification_level IN (
                              'cert3', 'diploma', 'bachelor', 'masters',
                              'ect', 'working_towards', 'none'
                            )
                          ),
  qualification_detail    TEXT,     -- e.g. "Diploma of Early Childhood Education (CHC50121)"
  teacher_registration_number TEXT, -- state registration number
  teacher_registration_state  TEXT, -- e.g. "NSW", "VIC"
  teacher_registration_expiry DATE,
  acecqa_approval_number  TEXT,     -- ACECQA approved ECT number

  -- ── Internal ─────────────────────────────────────────────
  notes                   TEXT,     -- admin-only notes

  created_at              TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE (tenant_id, user_id)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_staff_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_staff_profiles_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_profiles_tenant_user
  ON staff_profiles (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_visa_expiry
  ON staff_profiles (tenant_id, visa_expiry)
  WHERE visa_expiry IS NOT NULL;

-- RLS
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage staff profiles"
  ON staff_profiles FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_users')
  );

CREATE POLICY "Staff read own profile"
  ON staff_profiles FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );


-- ============================================================
-- 2. staff_compliance_records
-- ============================================================
-- Tracks compliance documents per staff member per tenant.
-- Multiple rows per user (one per document/certificate).
-- Soft-deleted (deleted_at IS NULL for active records).
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_compliance_records (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,

  -- Type of compliance document
  record_type     TEXT NOT NULL CHECK (
                    record_type IN (
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
                    )
                  ),

  -- Human-readable label (required for 'qualification' and 'other')
  label           TEXT,

  -- Document details
  document_number TEXT,
  issuing_state   TEXT,    -- e.g. "NSW", "VIC" (relevant for WWCC, police)
  issued_at       DATE,
  expires_at      DATE,
  document_url    TEXT,    -- future: Supabase Storage path

  -- Internal notes
  notes           TEXT,

  -- Verification (admin marks as verified after sighting original)
  verified_at     TIMESTAMPTZ,
  verified_by     UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Soft delete
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at      TIMESTAMPTZ
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_staff_compliance_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_staff_compliance_updated_at
  BEFORE UPDATE ON staff_compliance_records
  FOR EACH ROW EXECUTE FUNCTION touch_staff_compliance_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_compliance_tenant_user
  ON staff_compliance_records (tenant_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_compliance_expires
  ON staff_compliance_records (tenant_id, expires_at)
  WHERE deleted_at IS NULL AND expires_at IS NOT NULL;

-- RLS
ALTER TABLE staff_compliance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage compliance records"
  ON staff_compliance_records FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_users')
  );

CREATE POLICY "Staff read own compliance"
  ON staff_compliance_records FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  );


-- ============================================================
-- 3. tenant_user_permission_overrides
-- ============================================================
-- Per-user permission grants and denials layered ON TOP of
-- their role. This lets admins start with a role as the
-- baseline, then fine-tune per person without needing a
-- custom role for every individual.
--
-- Resolution order:
--   1. Collect role permissions (from role_permissions)
--   2. Add any 'grant' overrides
--   3. Remove any 'deny' overrides (deny wins over grant)
--
-- Example: A "Guide" with a grant on 'manage_attendance'
-- gets that extra permission. An "Administrator" with a deny
-- on 'manage_integrations' loses that one permission.
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_user_permission_overrides (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_user_id  UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  permission_id   UUID NOT NULL REFERENCES permissions(id)  ON DELETE CASCADE,
  override_type   TEXT NOT NULL CHECK (override_type IN ('grant', 'deny')),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- One override per permission per user
  UNIQUE (tenant_user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_overrides_tenant_user
  ON tenant_user_permission_overrides (tenant_user_id);

-- RLS
ALTER TABLE tenant_user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Admins can manage overrides for users in their tenant
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

-- Users can read their own overrides
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
-- New logic:
--   has_permission = (role_grants ∪ override_grants) ∖ override_denials
-- Deny always wins.
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
