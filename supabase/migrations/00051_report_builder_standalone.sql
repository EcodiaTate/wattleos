-- ============================================================
-- WattleOS V2 — Migration 00051: Report Builder Standalone
-- ============================================================
-- Adds the tables needed for the standalone Report Builder
-- product (PLG entry point). These are independent of the
-- full WattleOS SIS — designed for schools that sign up
-- specifically for Report Builder with no other modules.
--
-- Tables:
--   report_builder_students  — lightweight student records (no SIS)
--   guide_invitations        — guide invite tokens + class assignments
--   product_signups          — PLG analytics (signup source tracking)
-- ============================================================

-- ---- report_builder_students ---------------------------------
-- Stores lightweight student records for schools using the
-- standalone report builder (no full SIS enrollment required).
-- When a school upgrades and connects SIS, student_id on
-- report_instances is populated from the students table and
-- these records are no longer needed.

CREATE TABLE report_builder_students (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  preferred_name  TEXT,
  class_label     TEXT        NOT NULL,  -- free text, not FK: "Wattle Room 3-6"
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_rb_students_tenant ON report_builder_students (tenant_id, is_active)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('report_builder_students');

ALTER TABLE report_builder_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rb_students_tenant_isolation"
  ON report_builder_students FOR ALL
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::UUID);


-- ---- guide_invitations ----------------------------------------
-- Coordinator invites guides by email. Token is included in
-- the invite URL. Guide clicks link → creates account → lands
-- on /reports/my-reports.

CREATE TABLE guide_invitations (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  invited_by          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token               TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  -- which class labels this guide is responsible for (empty = all)
  class_labels        TEXT[]      NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at         TIMESTAMPTZ,
  accepted_by_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_guide_invites_token
  ON guide_invitations (token)
  WHERE status = 'pending' AND deleted_at IS NULL;

CREATE INDEX idx_guide_invites_tenant
  ON guide_invitations (tenant_id)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('guide_invitations');

ALTER TABLE guide_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guide_invitations_admin"
  ON guide_invitations FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND has_permission('manage_reports')
  );

-- Pending invites readable by anyone for token validation (public route)
CREATE POLICY "guide_invitations_token_read"
  ON guide_invitations FOR SELECT
  USING (
    status = 'pending'
    AND deleted_at IS NULL
    AND expires_at > now()
  );


-- ---- product_signups ------------------------------------------
-- PLG analytics: which product each tenant signed up through,
-- UTM parameters, source URL. Service-role only for writes
-- (signup action bypasses RLS using admin client).

CREATE TABLE product_signups (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_slug    TEXT        NOT NULL,  -- 'report-builder' | 'observations' | 'curriculum'
  signed_up_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url      TEXT,
  utm_campaign    TEXT,
  utm_source      TEXT
);

ALTER TABLE product_signups ENABLE ROW LEVEL SECURITY;

-- Only accessible via service role in server actions
CREATE POLICY "product_signups_service_role_only"
  ON product_signups FOR ALL
  USING (false);


-- ---- report_settings ------------------------------------------
-- Per-tenant settings for PDF branding (logo, accent colour,
-- paper size, font). Coordinators configure in /reports/settings.

CREATE TABLE report_settings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  school_name     TEXT,       -- overrides tenant name in PDF header
  logo_storage_path TEXT,     -- Supabase Storage path for logo
  accent_colour   TEXT        DEFAULT '#22c55e',  -- hex colour for PDF headers
  paper_size      TEXT        NOT NULL DEFAULT 'A4'
                  CHECK (paper_size IN ('A4', 'Letter')),
  font_choice     TEXT        NOT NULL DEFAULT 'sans'
                  CHECK (font_choice IN ('serif', 'sans', 'rounded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT apply_updated_at_trigger('report_settings');

ALTER TABLE report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_settings_admin"
  ON report_settings FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND has_permission('manage_reports')
  );

CREATE POLICY "report_settings_read"
  ON report_settings FOR SELECT
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::UUID);
