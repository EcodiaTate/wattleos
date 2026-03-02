-- ============================================================
-- WattleOS V2 — Migration 00050: PLG Report Periods & Instances
-- ============================================================
-- Formalises the "term" concept that was previously a free-text
-- field on student_reports. Report periods are admin-managed
-- cycles that group report instances for all enrolled students.
--
-- Tables:
--   report_periods    — academic term reporting windows
--   report_instances  — per-student report instances within a period
--
-- The existing student_reports table is kept intact. Instances
-- are the new PLG-native workflow; student_reports remains for
-- backwards compatibility and the existing reports UI.
-- ============================================================

-- ---- report_periods ------------------------------------------
CREATE TABLE report_periods (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  academic_year   INTEGER,
  term            TEXT,        -- e.g. 'Term 1', 'Semester 2', 'Spring'
  opens_at        TIMESTAMPTZ,
  due_at          TIMESTAMPTZ,
  closes_at       TIMESTAMPTZ,
  status          TEXT        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX report_periods_tenant_idx    ON report_periods (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX report_periods_active_idx    ON report_periods (tenant_id) WHERE status = 'active' AND deleted_at IS NULL;

ALTER TABLE report_periods ENABLE ROW LEVEL SECURITY;

-- Admins manage their tenant's periods
CREATE POLICY "report_periods_admin"
  ON report_periods FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND (SELECT has_permission('manage_reports'))
  );

-- All authenticated users in the tenant can read periods
CREATE POLICY "report_periods_read"
  ON report_periods FOR SELECT
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND deleted_at IS NULL
  );

-- ---- report_instances ----------------------------------------
CREATE TABLE report_instances (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id           UUID        REFERENCES report_templates(id) ON DELETE SET NULL,
  report_period_id      UUID        NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
  student_id            UUID        REFERENCES students(id) ON DELETE SET NULL,

  -- Snapshot fields (preserved if student record changes)
  student_first_name    TEXT,
  student_last_name     TEXT,
  student_preferred_name TEXT,
  class_name            TEXT,

  -- Assignment
  assigned_guide_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  assigned_guide_name   TEXT,

  -- Content — JSONB array of { section_id, content, word_count, last_edited_at }
  section_responses     JSONB       NOT NULL DEFAULT '[]',

  -- Workflow
  status                TEXT        NOT NULL DEFAULT 'not_started'
                        CHECK (status IN (
                          'not_started',
                          'in_progress',
                          'submitted',
                          'changes_requested',
                          'approved',
                          'published'
                        )),
  submitted_at          TIMESTAMPTZ,
  submitted_by          UUID        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  reviewed_by           UUID        REFERENCES users(id) ON DELETE SET NULL,
  change_request_notes  TEXT,
  approved_at           TIMESTAMPTZ,
  approved_by           UUID        REFERENCES users(id) ON DELETE SET NULL,
  published_at          TIMESTAMPTZ,
  pdf_storage_path      TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,

  -- Prevent duplicate instances per student per period/template
  UNIQUE (tenant_id, report_period_id, student_id, template_id)
);

CREATE INDEX report_instances_period_idx  ON report_instances (report_period_id) WHERE deleted_at IS NULL;
CREATE INDEX report_instances_guide_idx   ON report_instances (assigned_guide_id, status) WHERE deleted_at IS NULL;
CREATE INDEX report_instances_student_idx ON report_instances (student_id) WHERE deleted_at IS NULL;
CREATE INDEX report_instances_tenant_idx  ON report_instances (tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE report_instances ENABLE ROW LEVEL SECURITY;

-- Admins manage all instances in their tenant
CREATE POLICY "report_instances_admin"
  ON report_instances FOR ALL
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND (SELECT has_permission('manage_reports'))
  );

-- Guides can read + update their own assigned instances
CREATE POLICY "report_instances_guide_select"
  ON report_instances FOR SELECT
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND assigned_guide_id = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY "report_instances_guide_update"
  ON report_instances FOR UPDATE
  USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    AND assigned_guide_id = auth.uid()
    AND deleted_at IS NULL
    AND status IN ('not_started', 'in_progress', 'changes_requested')
  );
