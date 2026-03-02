-- 00039_acara_attendance_reporting.sql
--
-- ACARA Attendance Reporting
--
-- Stores per-student, per-school-year attendance summaries in the
-- ACARA-required format (possible days, actual days, unexplained
-- absences). Schools submit these figures to their state/territory
-- authority as part of the Annual School Collection (ASC).
--
-- Key concepts:
--   possible_days   — scheduled school days for the enrolment period
--   actual_days     — days the student was present (incl. approved
--                     part-day = 0.5)
--   unexplained     — absences with no documented reason by
--                     the reporting deadline
--   attendance_rate — actual_days / possible_days * 100
--
-- A "reporting period" is a calendar year and a collection round
-- (there is one ACARA ASC per year, but schools may also track
-- internal semester snapshots).
-- ============================================================

-- ── ENUMs ────────────────────────────────────────────────────

CREATE TYPE acara_report_status AS ENUM (
  'draft',       -- being built / not yet verified
  'verified',    -- admin has reviewed, ready to export
  'exported',    -- CSV/XML generated and downloaded
  'submitted'    -- lodged with the authority
);

CREATE TYPE acara_collection_type AS ENUM (
  'annual_school_collection',  -- ASC — primary ACARA submission
  'semester_1_snapshot',       -- internal mid-year snapshot
  'semester_2_snapshot'        -- internal end-year snapshot
);

-- ── MAIN TABLES ──────────────────────────────────────────────

-- One report set per tenant per year per collection type
CREATE TABLE acara_report_periods (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  calendar_year       INTEGER     NOT NULL,           -- e.g. 2025
  collection_type     acara_collection_type NOT NULL DEFAULT 'annual_school_collection',
  status              acara_report_status   NOT NULL DEFAULT 'draft',

  period_start        DATE        NOT NULL,            -- first school day in scope
  period_end          DATE        NOT NULL,            -- last school day in scope

  notes               TEXT,
  exported_at         TIMESTAMPTZ,
  exported_by         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at        TIMESTAMPTZ,
  submitted_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, calendar_year, collection_type)
);

-- Per-student summary rows — one per student per report period
CREATE TABLE acara_student_records (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_period_id    UUID        NOT NULL REFERENCES acara_report_periods(id) ON DELETE CASCADE,
  student_id          UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- ACARA required fields
  possible_days       NUMERIC(6,1) NOT NULL DEFAULT 0,    -- scheduled days
  actual_days         NUMERIC(6,1) NOT NULL DEFAULT 0,    -- present days (0.5 for half-day)
  unexplained_days    NUMERIC(6,1) NOT NULL DEFAULT 0,    -- no reason by deadline
  attendance_rate     NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN possible_days > 0
         THEN ROUND((actual_days / possible_days) * 100, 2)
         ELSE 0
    END
  ) STORED,

  -- Breakdown (ACARA optional but useful for verification)
  absent_explained    NUMERIC(6,1) NOT NULL DEFAULT 0,    -- excused/documented
  late_days           NUMERIC(6,1) NOT NULL DEFAULT 0,    -- late arrivals counted
  exempt_days         NUMERIC(6,1) NOT NULL DEFAULT 0,    -- exemptions/approved leave

  -- Metadata
  last_synced_at      TIMESTAMPTZ,            -- when attendance records were last pulled
  override_notes      TEXT,                   -- manual override reason if any
  manually_overridden BOOLEAN     NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, report_period_id, student_id)
);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE acara_report_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acara_report_periods_tenant_isolation" ON acara_report_periods
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

ALTER TABLE acara_student_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acara_student_records_tenant_isolation" ON acara_student_records
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ── INDEXES ──────────────────────────────────────────────────

CREATE INDEX ON acara_report_periods (tenant_id);
CREATE INDEX ON acara_report_periods (tenant_id, calendar_year DESC);
CREATE INDEX ON acara_report_periods (tenant_id, status);

CREATE INDEX ON acara_student_records (tenant_id);
CREATE INDEX ON acara_student_records (report_period_id);
CREATE INDEX ON acara_student_records (tenant_id, student_id);
CREATE INDEX ON acara_student_records (tenant_id, report_period_id, attendance_rate);

-- ── TRIGGERS ─────────────────────────────────────────────────

CREATE TRIGGER update_acara_report_periods_updated_at
  BEFORE UPDATE ON acara_report_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acara_student_records_updated_at
  BEFORE UPDATE ON acara_student_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
