-- supabase/migrations/00025_naplan_coordination.sql
--
-- ============================================================
-- NAPLAN Coordination
-- ============================================================
-- Schools administering NAPLAN need to:
--   1. Set up a test window for the collection year
--   2. Generate a cohort of eligible students (Year 3, 5, 7, 9)
--   3. Record any parental opt-outs per student (whole or domain)
--   4. Enter post-test results using ACARA's proficiency standards
--
-- NAPLAN 2023+ uses four proficiency standards replacing the
-- former band system:
--   Needs Additional Support → Developing → Strong → Exceeding
--
-- This module is admin-only (no parent portal visibility).
-- Actual test delivery is via the TAA — this module handles
-- coordination records only.
-- ============================================================

-- ============================================================
-- 1. naplan_test_windows
-- ============================================================
-- One per tenant per collection year. The status lifecycle is:
--   draft  → active (results can be entered)
--   active → closed (all results finalised, no further edits)
-- Deleting a window is only permitted while it is in draft.
-- ============================================================

CREATE TABLE IF NOT EXISTS naplan_test_windows (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  collection_year     INTEGER NOT NULL CHECK (collection_year BETWEEN 2020 AND 2099),
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'active', 'closed')),

  test_start_date     DATE,
  test_end_date       DATE,

  -- Comma-style free-text for test location / coordinator name etc.
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Only one window per year per school
  UNIQUE (tenant_id, collection_year),

  -- End date must follow start date when both are set
  CONSTRAINT naplan_window_dates_valid
    CHECK (test_end_date IS NULL OR test_start_date IS NULL OR test_end_date >= test_start_date)
);

CREATE INDEX naplan_test_windows_tenant_status
  ON naplan_test_windows (tenant_id, status, collection_year DESC);

-- ============================================================
-- 2. naplan_cohort_entries
-- ============================================================
-- One row per student per window. Generated automatically from
-- active enrolments (year_level in 3, 5, 7, 9) and can be
-- manually adjusted afterwards.
-- Opt-outs are per-student: is_opted_out covers all domains.
-- The opt_out_* fields capture who recorded the opt-out and when.
-- ============================================================

CREATE TABLE IF NOT EXISTS naplan_cohort_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  window_id           UUID NOT NULL REFERENCES naplan_test_windows(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Year level at time of this test window (must be NAPLAN-eligible)
  year_level          INTEGER NOT NULL CHECK (year_level IN (3, 5, 7, 9)),

  -- Opt-out flag (whole-of-test; domain-level opt-outs are not tracked here)
  is_opted_out        BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out_reason      TEXT,
  opt_out_recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opt_out_at          TIMESTAMPTZ,

  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- One entry per student per window
  UNIQUE (window_id, student_id)
);

CREATE INDEX naplan_cohort_entries_window
  ON naplan_cohort_entries (window_id, year_level, is_opted_out);

CREATE INDEX naplan_cohort_entries_student
  ON naplan_cohort_entries (student_id, window_id);

-- ============================================================
-- 3. naplan_domain_results
-- ============================================================
-- One row per student per domain per window.
-- Proficiency level uses ACARA's 2023 nomenclature.
-- Scaled score (optional) is the 0-1000 NAPLAN scale score.
-- National / state averages can be recorded for reporting.
-- above_national_minimum reflects ACARA's NMS benchmark.
-- ============================================================

CREATE TABLE IF NOT EXISTS naplan_domain_results (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cohort_entry_id         UUID NOT NULL REFERENCES naplan_cohort_entries(id) ON DELETE CASCADE,

  -- One of the five NAPLAN domains
  domain                  TEXT NOT NULL
                          CHECK (domain IN (
                            'reading',
                            'writing',
                            'spelling',
                            'language_conventions',
                            'numeracy'
                          )),

  -- ACARA 2023 proficiency standard
  proficiency_level       TEXT NOT NULL
                          CHECK (proficiency_level IN (
                            'needs_additional_support',
                            'developing',
                            'strong',
                            'exceeding'
                          )),

  -- NAPLAN scale score (0–1 000), optional
  scaled_score            INTEGER CHECK (scaled_score BETWEEN 0 AND 1000),

  -- Reference data for internal reporting
  national_average_score  INTEGER CHECK (national_average_score BETWEEN 0 AND 1000),
  state_average_score     INTEGER CHECK (state_average_score BETWEEN 0 AND 1000),

  -- Whether the student met or exceeded the National Minimum Standard
  above_national_minimum  BOOLEAN NOT NULL DEFAULT TRUE,

  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Only one result per domain per student per window
  UNIQUE (cohort_entry_id, domain)
);

CREATE INDEX naplan_domain_results_cohort
  ON naplan_domain_results (cohort_entry_id, domain);

-- ============================================================
-- 4. Permissions
-- ============================================================

INSERT INTO permissions (key, description) VALUES
  ('view_naplan',   'View NAPLAN test windows, cohort entries, and results'),
  ('manage_naplan', 'Create and manage NAPLAN test windows, generate cohorts, record opt-outs and results')
ON CONFLICT (key) DO NOTHING;

-- Grant Owner and Admin manage + view; Head of School and Guide view only
DO $$
DECLARE
  t RECORD;
  role_id UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    -- Owner
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Owner' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_naplan'), (role_id, 'manage_naplan')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Admin
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_naplan'), (role_id, 'manage_naplan')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Head of School (view only — they need visibility but data entry is admin-driven)
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Head of School' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_naplan')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE naplan_test_windows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE naplan_cohort_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE naplan_domain_results ENABLE ROW LEVEL SECURITY;

-- naplan_test_windows
CREATE POLICY "naplan_windows_select"
  ON naplan_test_windows FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_naplan')
  );

CREATE POLICY "naplan_windows_insert"
  ON naplan_test_windows FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

CREATE POLICY "naplan_windows_update"
  ON naplan_test_windows FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

CREATE POLICY "naplan_windows_delete"
  ON naplan_test_windows FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
    AND status = 'draft'
  );

-- naplan_cohort_entries
CREATE POLICY "naplan_cohort_select"
  ON naplan_cohort_entries FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_naplan')
  );

CREATE POLICY "naplan_cohort_insert"
  ON naplan_cohort_entries FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

CREATE POLICY "naplan_cohort_update"
  ON naplan_cohort_entries FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

CREATE POLICY "naplan_cohort_delete"
  ON naplan_cohort_entries FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

-- naplan_domain_results
CREATE POLICY "naplan_results_select"
  ON naplan_domain_results FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_naplan')
  );

CREATE POLICY "naplan_results_insert"
  ON naplan_domain_results FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

CREATE POLICY "naplan_results_update"
  ON naplan_domain_results FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

CREATE POLICY "naplan_results_delete"
  ON naplan_domain_results FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_naplan')
  );

-- ============================================================
-- 6. updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_naplan_test_windows_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER naplan_test_windows_updated_at
  BEFORE UPDATE ON naplan_test_windows
  FOR EACH ROW EXECUTE FUNCTION update_naplan_test_windows_updated_at();

CREATE OR REPLACE FUNCTION update_naplan_cohort_entries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER naplan_cohort_entries_updated_at
  BEFORE UPDATE ON naplan_cohort_entries
  FOR EACH ROW EXECUTE FUNCTION update_naplan_cohort_entries_updated_at();

CREATE OR REPLACE FUNCTION update_naplan_domain_results_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER naplan_domain_results_updated_at
  BEFORE UPDATE ON naplan_domain_results
  FOR EACH ROW EXECUTE FUNCTION update_naplan_domain_results_updated_at();
