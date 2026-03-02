-- ============================================================
-- WattleOS V2 — Migration 00004: Compliance Modules A–K
-- ============================================================
-- Modules:
--   A — IITI Incident Register (Reg 87)
--   B — Medication Administration Records (Reg 93/94)
--   C — Staff Qualification & Compliance (Reg 136/145/146)
--   D — Real-time Ratio Monitoring (Reg 123)
--   E — Quality Improvement Plan / QIP Builder (Reg 55)
--   F — Immunisation Compliance (No Jab No Pay/Play)
--   G — CCS Session Reporting (Family Assistance Law)
--   H — Excursion Management (Reg 100–102)
--   I — Complaints & Policy Management (Reg 168/170)
--   J — Montessori Lesson Tracking (MQ:AP)
--   K — MQ:AP Self-Assessment Framework
-- ============================================================
-- Patterns:
--   • gen_random_uuid() PKs
--   • tenant_id = current_tenant_id() in all RLS policies
--   • apply_updated_at_trigger() on every mutable table
--   • soft-delete via deleted_at (hard-delete is never used)
--   • Permissions seeded at bottom + backfilled for existing tenants
-- ============================================================


-- ============================================================
-- MODULE A — IITI INCIDENT REGISTER (Reg 87)
-- ============================================================

CREATE TABLE incidents (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Who was involved
  student_ids                     UUID[] NOT NULL DEFAULT '{}',

  -- What happened
  occurred_at                     TIMESTAMPTZ NOT NULL,
  location                        TEXT NOT NULL,
  incident_type                   TEXT NOT NULL
    CHECK (incident_type IN ('injury', 'illness', 'trauma', 'near_miss')),
  description                     TEXT NOT NULL,
  first_aid_administered          TEXT,
  first_aid_by                    UUID REFERENCES users(id),
  witness_names                   TEXT[] NOT NULL DEFAULT '{}',

  -- Severity
  severity                        TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor', 'moderate', 'serious')),
  is_serious_incident             BOOLEAN NOT NULL DEFAULT false,
  serious_incident_reason         TEXT,   -- regulatory category for serious incidents

  -- Parent notification
  parent_notified_at              TIMESTAMPTZ,
  parent_notified_by              UUID REFERENCES users(id),
  parent_notification_method      TEXT
    CHECK (parent_notification_method IN ('in_app', 'phone', 'email', 'in_person')),
  parent_notification_notes       TEXT,

  -- Regulatory notification (24h window for serious incidents)
  regulator_notified_at           TIMESTAMPTZ,
  regulator_notified_by           UUID REFERENCES users(id),
  regulator_notification_ref      TEXT,   -- NQA ITS reference number
  regulator_notification_notes    TEXT,

  -- Workflow
  status                          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'parent_notified', 'regulator_notified', 'closed')),
  closed_at                       TIMESTAMPTZ,
  closed_by                       UUID REFERENCES users(id),

  -- Authorship
  recorded_by                     UUID REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_incidents_tenant_occurred    ON incidents (tenant_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_tenant_status      ON incidents (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_serious            ON incidents (tenant_id, is_serious_incident) WHERE is_serious_incident = true AND deleted_at IS NULL;
CREATE INDEX idx_incidents_student_ids        ON incidents USING GIN (student_ids);

SELECT apply_updated_at_trigger('incidents');

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON incidents
  FOR ALL USING (tenant_id = current_tenant_id());

-- Parents can read incidents involving their child
CREATE POLICY "Guardians can read own child incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unnest(student_ids) AS sid
      WHERE is_guardian_of(sid)
    )
  );


-- ============================================================
-- MODULE B — MEDICATION ADMINISTRATION RECORDS (Reg 93/94)
-- ============================================================

-- Medical management plans (ASCIA, asthma, diabetes, etc.)
-- Separate from the free-text medical_conditions field in SIS.
CREATE TABLE medical_management_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  student_id      UUID NOT NULL REFERENCES students(id),

  plan_type       TEXT NOT NULL
    CHECK (plan_type IN ('ascia_anaphylaxis', 'asthma', 'diabetes', 'seizure', 'other')),
  condition_name  TEXT NOT NULL,
  document_url    TEXT,
  expiry_date     DATE,
  review_due_date DATE,

  last_reviewed_at  DATE,
  reviewed_by       UUID REFERENCES users(id),

  is_active         BOOLEAN NOT NULL DEFAULT true,
  notes             TEXT,

  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_medical_plans_student   ON medical_management_plans (tenant_id, student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_medical_plans_expiring  ON medical_management_plans (tenant_id, expiry_date) WHERE is_active = true AND deleted_at IS NULL;

SELECT apply_updated_at_trigger('medical_management_plans');

ALTER TABLE medical_management_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON medical_management_plans
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardians can read own child plans" ON medical_management_plans
  FOR SELECT USING (is_guardian_of(student_id));


-- Medication authorisations: written parent consent per medication
CREATE TABLE medication_authorisations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  student_id                UUID NOT NULL REFERENCES students(id),

  medication_name           TEXT NOT NULL,
  dose                      TEXT NOT NULL,
  route                     TEXT NOT NULL,   -- oral, inhaled, injected, topical, other
  frequency                 TEXT NOT NULL,
  reason                    TEXT,

  authorised_by_user_id     UUID REFERENCES users(id),
  authorised_by_name        TEXT NOT NULL,   -- always stored in plain text for the record
  authorisation_date        DATE NOT NULL,
  valid_from                DATE,
  valid_until               DATE,

  storage_instructions      TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT true,

  created_by                UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_med_auth_student  ON medication_authorisations (tenant_id, student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_med_auth_active   ON medication_authorisations (tenant_id, is_active) WHERE is_active = true AND deleted_at IS NULL;

SELECT apply_updated_at_trigger('medication_authorisations');

ALTER TABLE medication_authorisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON medication_authorisations
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardians can read own child authorisations" ON medication_authorisations
  FOR SELECT USING (is_guardian_of(student_id));


-- Per-dose administration record (immutable after creation, so no updated_at)
CREATE TABLE medication_administrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  student_id            UUID NOT NULL REFERENCES students(id),
  authorisation_id      UUID REFERENCES medication_authorisations(id),

  administered_at       TIMESTAMPTZ NOT NULL,
  medication_name       TEXT NOT NULL,   -- denormalised for the permanent record
  dose_given            TEXT NOT NULL,
  route                 TEXT NOT NULL,

  administrator_id      UUID NOT NULL REFERENCES users(id),
  witness_id            UUID REFERENCES users(id),

  parent_notified       BOOLEAN NOT NULL DEFAULT false,
  parent_notified_at    TIMESTAMPTZ,
  child_response        TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_med_admin_student  ON medication_administrations (tenant_id, student_id, administered_at DESC);
CREATE INDEX idx_med_admin_auth     ON medication_administrations (tenant_id, authorisation_id);

ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON medication_administrations
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardians can read own child administrations" ON medication_administrations
  FOR SELECT USING (is_guardian_of(student_id));


-- ============================================================
-- MODULE C — STAFF QUALIFICATION & COMPLIANCE (Reg 136/145/146)
-- ============================================================

-- One row per staff member per tenant (upserted on changes)
CREATE TABLE staff_compliance_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  user_id                   UUID NOT NULL REFERENCES users(id),

  -- Working with Children Check
  wwcc_state                TEXT,
  wwcc_number               TEXT,
  wwcc_expiry               DATE,
  wwcc_last_verified        DATE,
  wwcc_verified_by          UUID REFERENCES users(id),

  -- Highest qualification
  highest_qualification     TEXT
    CHECK (highest_qualification IN ('cert3', 'diploma', 'ect', 'working_towards', 'other', 'none')),
  qualification_detail      TEXT,         -- institution / degree name
  acecqa_approval_number    TEXT,
  working_towards_rto       TEXT,         -- RTO name if 'working_towards'
  working_towards_expected  DATE,         -- expected completion date

  -- Geccko child safety training (mandatory from 27 Feb 2026)
  geccko_module             TEXT,
  geccko_completion_date    DATE,
  geccko_record_id          TEXT,

  -- Worker Register data (NQA ITS — mandatory from 27 Feb 2026)
  employment_start_date     DATE,
  employment_end_date       DATE,
  position_title            TEXT,
  date_of_birth             DATE,
  contact_address           TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ,

  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_staff_compliance_tenant  ON staff_compliance_profiles (tenant_id) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('staff_compliance_profiles');

ALTER TABLE staff_compliance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON staff_compliance_profiles
  FOR ALL USING (tenant_id = current_tenant_id());


-- Individual certificates (first aid, CPR, anaphylaxis, asthma, etc.)
-- Multiple rows per staff member — one per certificate instance.
CREATE TABLE staff_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  user_id         UUID NOT NULL REFERENCES users(id),

  cert_type       TEXT NOT NULL
    CHECK (cert_type IN ('first_aid', 'cpr', 'anaphylaxis', 'asthma', 'child_safety', 'other')),
  cert_name       TEXT NOT NULL,
  issue_date      DATE NOT NULL,
  expiry_date     DATE,
  cert_number     TEXT,
  provider        TEXT,
  document_url    TEXT,
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_staff_certs_user     ON staff_certificates (tenant_id, user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_certs_expiry   ON staff_certificates (tenant_id, expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_certs_type     ON staff_certificates (tenant_id, cert_type) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('staff_certificates');

ALTER TABLE staff_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON staff_certificates
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE D — REAL-TIME RATIO MONITORING (Reg 123)
-- ============================================================

-- Educator on-floor sign-in/out (distinct from timesheets)
CREATE TABLE floor_sign_ins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  class_id        UUID REFERENCES classes(id),

  signed_in_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_out_at   TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,  -- false once signed out

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_floor_sign_ins_active   ON floor_sign_ins (tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_floor_sign_ins_class    ON floor_sign_ins (tenant_id, class_id, is_active);
CREATE INDEX idx_floor_sign_ins_user     ON floor_sign_ins (tenant_id, user_id, signed_in_at DESC);

SELECT apply_updated_at_trigger('floor_sign_ins');

ALTER TABLE floor_sign_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON floor_sign_ins
  FOR ALL USING (tenant_id = current_tenant_id());


-- Append-only time-stamped ratio snapshots (compliance evidence)
CREATE TABLE ratio_logs (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenants(id),
  class_id                      UUID NOT NULL REFERENCES classes(id),

  logged_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  children_present              INT NOT NULL DEFAULT 0,
  educators_on_floor            INT NOT NULL DEFAULT 0,

  -- The required ratio for this snapshot (denominator = max children per educator)
  required_ratio_denominator    INT NOT NULL,   -- e.g. 11 for 3–school-age, 4 for 0–24m
  youngest_child_months         INT,            -- drives mixed-age ratio selection

  is_breached                   BOOLEAN NOT NULL DEFAULT false,
  breach_acknowledged_by        UUID REFERENCES users(id),
  breach_acknowledged_at        TIMESTAMPTZ,

  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — this table is append-only
);

CREATE INDEX idx_ratio_logs_class_time   ON ratio_logs (tenant_id, class_id, logged_at DESC);
CREATE INDEX idx_ratio_logs_breaches     ON ratio_logs (tenant_id, is_breached, logged_at DESC) WHERE is_breached = true;

ALTER TABLE ratio_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ratio_logs
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE E — QIP BUILDER (Reg 55)
-- ============================================================

-- Service philosophy: versioned rich text, one active version at a time
CREATE TABLE service_philosophies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),

  content       TEXT NOT NULL,
  version       INT NOT NULL DEFAULT 1,
  published_at  TIMESTAMPTZ,
  published_by  UUID REFERENCES users(id),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_philosophy_tenant  ON service_philosophies (tenant_id, version DESC);

SELECT apply_updated_at_trigger('service_philosophies');

ALTER TABLE service_philosophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON service_philosophies
  FOR ALL USING (tenant_id = current_tenant_id());


-- NQS self-assessment: one row per element per tenant (upserted on rating change)
-- Element IDs follow the NQS numbering convention: '1.1.1', '2.2.3', etc.
CREATE TABLE qip_element_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),

  nqs_element_id  TEXT NOT NULL,   -- e.g. '1.1.1', '2.2.3'
  rating          TEXT
    CHECK (rating IN ('working_towards', 'meeting', 'exceeding')),
  strengths       TEXT,

  assessed_at     TIMESTAMPTZ,
  assessed_by     UUID REFERENCES users(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, nqs_element_id)
);

CREATE INDEX idx_qip_assessments_tenant  ON qip_element_assessments (tenant_id);

SELECT apply_updated_at_trigger('qip_element_assessments');

ALTER TABLE qip_element_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON qip_element_assessments
  FOR ALL USING (tenant_id = current_tenant_id());


-- Improvement goals per NQS element
CREATE TABLE qip_goals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  nqs_element_id          TEXT NOT NULL,
  description             TEXT NOT NULL,
  strategies              TEXT,
  responsible_person_id   UUID REFERENCES users(id),
  due_date                DATE,
  success_measures        TEXT,

  status                  TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'achieved')),
  achieved_at             TIMESTAMPTZ,

  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_qip_goals_tenant   ON qip_goals (tenant_id, nqs_element_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_qip_goals_status   ON qip_goals (tenant_id, status) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('qip_goals');

ALTER TABLE qip_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON qip_goals
  FOR ALL USING (tenant_id = current_tenant_id());


-- Evidence links: polymorphic attachments to QA elements or goals
CREATE TABLE qip_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),

  nqs_element_id  TEXT,
  qip_goal_id     UUID REFERENCES qip_goals(id) ON DELETE CASCADE,

  evidence_type   TEXT NOT NULL
    CHECK (evidence_type IN ('observation', 'incident', 'policy', 'photo', 'document', 'other')),
  evidence_id     UUID,       -- FK to the relevant entity (polymorphic reference)
  title           TEXT NOT NULL,
  notes           TEXT,

  attached_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qip_evidence_element  ON qip_evidence (tenant_id, nqs_element_id);
CREATE INDEX idx_qip_evidence_goal     ON qip_evidence (tenant_id, qip_goal_id);

ALTER TABLE qip_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON qip_evidence
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE F — IMMUNISATION COMPLIANCE (No Jab No Pay/Play)
-- ============================================================

CREATE TABLE immunisation_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  student_id              UUID NOT NULL REFERENCES students(id),

  ihs_date                DATE,   -- date of the Immunisation History Statement
  status                  TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('up_to_date', 'catch_up_schedule', 'medical_exemption', 'pending')),
  document_url            TEXT,

  -- Catch-up schedule support period (16-week temporary attendance window)
  support_period_start    DATE,
  support_period_end      DATE,
  next_air_check_due      DATE,   -- when to recheck AIR

  -- Medical exemption (recorded by GP on AIR; service sights and notes)
  exemption_noted_by      UUID REFERENCES users(id),
  exemption_noted_at      DATE,

  recorded_by             UUID REFERENCES users(id),
  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_immunisation_student   ON immunisation_records (tenant_id, student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_immunisation_status    ON immunisation_records (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_immunisation_air_check ON immunisation_records (tenant_id, next_air_check_due) WHERE status = 'catch_up_schedule' AND deleted_at IS NULL;

SELECT apply_updated_at_trigger('immunisation_records');

ALTER TABLE immunisation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON immunisation_records
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardians can read own child immunisation records" ON immunisation_records
  FOR SELECT USING (is_guardian_of(student_id));


-- ============================================================
-- MODULE G — CCS SESSION REPORTING (Family Assistance Law)
-- ============================================================

-- Global reference table: the 16 DET-defined absence type codes.
-- No tenant_id — this is platform data, not school data.
-- Populate via seed after migration.
CREATE TABLE ccs_absence_type_codes (
  code                  TEXT PRIMARY KEY,
  label                 TEXT NOT NULL,
  description           TEXT,
  annual_cap_applies    BOOLEAN NOT NULL DEFAULT true,  -- counts toward the 42-day cap
  requires_evidence     BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE ccs_absence_type_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read CCS absence codes" ON ccs_absence_type_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed the 16 DESE-defined absence type codes
-- Source: Family Assistance Guide, CCMS Technical Specification
INSERT INTO ccs_absence_type_codes (code, label, description, annual_cap_applies, requires_evidence) VALUES
  ('NO_REASON',         'No reason required',                    'Standard absence within the 42-day annual cap',                               true,  false),
  ('ILLNESS',           'Illness (no certificate)',               'Child is unwell; no medical certificate required within initial cap',          true,  false),
  ('ILLNESS_CERT',      'Illness with medical certificate',       'Child is unwell; medical certificate provided; does not count toward 42-day cap after initial period', false, true),
  ('EMERGENCY',         'Emergency or exceptional circumstances', 'Family emergency or exceptional event preventing attendance',                  true,  false),
  ('EMERGENCY_CERT',    'Exceptional circumstances (documented)', 'Exceptional circumstances supported by evidence; uncapped',                    false, true),
  ('NATURAL_DISASTER',  'Natural disaster',                       'Natural disaster or other emergency affecting the family or area',             false, false),
  ('TEMPORARY_CLOSURE', 'Service temporarily closed',             'Service is temporarily closed (e.g. infrastructure, emergency)',               false, false),
  ('PUPIL_FREE',        'Pupil-free day',                        'Gazetted pupil-free or school development day',                               false, false),
  ('PUBLIC_HOLIDAY',    'Public holiday',                        'State/territory or national public holiday',                                   false, false),
  ('IMMUNISATION',      'Child being immunised',                 'Child absent to attend an immunisation appointment',                           true,  false),
  ('BEREAVEMENT',       'Family bereavement',                    'Death in the immediate family',                                               true,  false),
  ('SHARED_PARENTING',  'Shared parenting arrangement',          'Absent due to a court-ordered or informal shared care arrangement',            true,  false),
  ('SERVICE_PROVISION', 'Non-attendance due to service circumstances', 'Service unable to provide care (e.g. educator absence)',                 true,  false),
  ('FOSTER_CARE',       'Child in foster or kinship care',       'Child transitioning into or within foster/kinship care arrangement',           true,  false),
  ('STAND_DOWN',        'Regulatory stand-down',                 'Child excluded by the service under a regulatory or health direction',         false, false),
  ('OTHER_UNCAPPED',    'Other (uncapped, with documentation)',  'Other absence type not listed; documented evidence required; not capped',     false, true)
ON CONFLICT (code) DO NOTHING;


-- Weekly bundle: groups all session reports for a given week
CREATE TABLE ccs_weekly_bundles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  week_start_date         DATE NOT NULL,   -- Monday
  week_end_date           DATE NOT NULL,   -- Sunday

  status                  TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'submitted', 'accepted', 'rejected')),
  submitted_at            TIMESTAMPTZ,
  submitted_by            UUID REFERENCES users(id),
  acceptance_reference    TEXT,
  rejection_reason        TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, week_start_date)
);

CREATE INDEX idx_ccs_bundles_tenant_week  ON ccs_weekly_bundles (tenant_id, week_start_date DESC);
CREATE INDEX idx_ccs_bundles_status       ON ccs_weekly_bundles (tenant_id, status);

SELECT apply_updated_at_trigger('ccs_weekly_bundles');

ALTER TABLE ccs_weekly_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ccs_weekly_bundles
  FOR ALL USING (tenant_id = current_tenant_id());


-- Individual session report: one row per child per session
CREATE TABLE ccs_session_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id),
  bundle_id                   UUID REFERENCES ccs_weekly_bundles(id),
  student_id                  UUID NOT NULL REFERENCES students(id),

  session_date                DATE NOT NULL,
  start_time                  TIME NOT NULL,
  end_time                    TIME NOT NULL,
  hours_of_care               NUMERIC(4,2) NOT NULL,

  session_type                TEXT NOT NULL
    CHECK (session_type IN ('long_day_care', 'oshc', 'vacation_care', 'occasional')),

  full_fee_cents              INT NOT NULL DEFAULT 0,
  gap_fee_cents               INT NOT NULL DEFAULT 0,

  absence_flag                BOOLEAN NOT NULL DEFAULT false,
  absence_type_code           TEXT REFERENCES ccs_absence_type_codes(code),

  -- Mandatory from 1 July 2025
  prescribed_discount_cents   INT NOT NULL DEFAULT 0,
  third_party_payment_cents   INT NOT NULL DEFAULT 0,

  report_status               TEXT NOT NULL DEFAULT 'draft'
    CHECK (report_status IN ('draft', 'ready', 'submitted', 'accepted', 'rejected')),
  notes                       TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                  TIMESTAMPTZ,

  UNIQUE (tenant_id, student_id, session_date, start_time)
);

CREATE INDEX idx_ccs_sessions_bundle    ON ccs_session_reports (tenant_id, bundle_id);
CREATE INDEX idx_ccs_sessions_student   ON ccs_session_reports (tenant_id, student_id, session_date DESC);
CREATE INDEX idx_ccs_sessions_absence   ON ccs_session_reports (tenant_id, absence_flag, session_date) WHERE absence_flag = true;

SELECT apply_updated_at_trigger('ccs_session_reports');

ALTER TABLE ccs_session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ccs_session_reports
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE H — EXCURSION MANAGEMENT (Reg 100–102)
-- ============================================================

CREATE TABLE excursions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),

  name                      TEXT NOT NULL,
  description               TEXT,
  excursion_date            DATE NOT NULL,
  destination               TEXT NOT NULL,

  transport_type            TEXT NOT NULL
    CHECK (transport_type IN ('walking', 'private_vehicle', 'bus', 'public_transport', 'other')),
  departure_time            TIME,
  return_time               TIME,

  supervising_educator_ids  UUID[] NOT NULL DEFAULT '{}',
  attending_student_ids     UUID[] NOT NULL DEFAULT '{}',

  -- Regular excursions (e.g. weekly park visit) assessed once, reviewed annually
  is_regular                BOOLEAN NOT NULL DEFAULT false,
  regular_review_due        DATE,

  status                    TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'risk_assessed', 'consents_pending', 'ready_to_depart', 'in_progress', 'returned', 'cancelled')),

  departed_at               TIMESTAMPTZ,
  returned_at               TIMESTAMPTZ,
  return_notes              TEXT,

  created_by                UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_excursions_date    ON excursions (tenant_id, excursion_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_excursions_status  ON excursions (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_excursions_studs   ON excursions USING GIN (attending_student_ids);

SELECT apply_updated_at_trigger('excursions');

ALTER TABLE excursions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON excursions
  FOR ALL USING (tenant_id = current_tenant_id());


-- Risk assessment per excursion
CREATE TABLE excursion_risk_assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  excursion_id          UUID NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,

  -- hazards: [{hazard: text, likelihood: low|medium|high,
  --             consequence: low|medium|high, controls: text, residual_rating: low|medium|high}]
  hazards               JSONB NOT NULL DEFAULT '[]',
  overall_risk_rating   TEXT CHECK (overall_risk_rating IN ('low', 'medium', 'high')),

  approved_by           UUID REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  notes                 TEXT,

  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_excursion_ra_excursion  ON excursion_risk_assessments (tenant_id, excursion_id);

SELECT apply_updated_at_trigger('excursion_risk_assessments');

ALTER TABLE excursion_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON excursion_risk_assessments
  FOR ALL USING (tenant_id = current_tenant_id());


-- Per-child consent per excursion
CREATE TABLE excursion_consents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  excursion_id      UUID NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id),

  consent_status    TEXT NOT NULL DEFAULT 'pending'
    CHECK (consent_status IN ('pending', 'consented', 'declined')),

  consented_by      UUID REFERENCES users(id),
  consented_by_name TEXT,
  consented_at      TIMESTAMPTZ,
  method            TEXT CHECK (method IN ('digital_portal', 'paper', 'verbal')),
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, excursion_id, student_id)
);

CREATE INDEX idx_excursion_consents_excursion  ON excursion_consents (tenant_id, excursion_id);
CREATE INDEX idx_excursion_consents_pending    ON excursion_consents (tenant_id, excursion_id, consent_status) WHERE consent_status = 'pending';

SELECT apply_updated_at_trigger('excursion_consents');

ALTER TABLE excursion_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON excursion_consents
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardians can read and submit own child consents" ON excursion_consents
  FOR ALL USING (is_guardian_of(student_id));


-- Headcount checks during excursion (works offline on device; synced on return)
CREATE TABLE excursion_headcounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  excursion_id        UUID NOT NULL REFERENCES excursions(id),

  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by         UUID REFERENCES users(id),
  student_ids_present UUID[] NOT NULL DEFAULT '{}',
  count               INT NOT NULL,
  location_note       TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_excursion_headcounts_excursion  ON excursion_headcounts (tenant_id, excursion_id, recorded_at DESC);

ALTER TABLE excursion_headcounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON excursion_headcounts
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE I — COMPLAINTS & POLICY MANAGEMENT (Reg 168/170)
-- ============================================================

CREATE TABLE policies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  title                   TEXT NOT NULL,
  category                TEXT NOT NULL,          -- e.g. 'health_safety', 'staffing', 'complaints'
  regulation_reference    TEXT,                   -- e.g. 'Reg 168(2)(a)'
  content                 TEXT,                   -- rich text body
  document_url            TEXT,                   -- PDF upload alternative to content

  version                 INT NOT NULL DEFAULT 1,
  effective_date          DATE,
  review_date             DATE,

  status                  TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  -- 14-day parent notice workflow (Reg 170)
  requires_parent_notice  BOOLEAN NOT NULL DEFAULT false,
  notice_sent_at          TIMESTAMPTZ,

  published_at            TIMESTAMPTZ,
  published_by            UUID REFERENCES users(id),

  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_policies_tenant_status  ON policies (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_policies_review_due     ON policies (tenant_id, review_date) WHERE status = 'active' AND deleted_at IS NULL;

SELECT apply_updated_at_trigger('policies');

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON policies
  FOR ALL USING (tenant_id = current_tenant_id());


-- Version history: previous versions are retained in full
CREATE TABLE policy_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  policy_id     UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,

  version       INT NOT NULL,
  content       TEXT,
  document_url  TEXT,
  change_summary TEXT,

  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policy_versions_policy  ON policy_versions (tenant_id, policy_id, version DESC);

ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON policy_versions
  FOR ALL USING (tenant_id = current_tenant_id());


-- Staff acknowledgements: tracks who has read each version
CREATE TABLE policy_acknowledgements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  policy_id       UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),

  version         INT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, policy_id, user_id, version)
);

CREATE INDEX idx_policy_acks_policy  ON policy_acknowledgements (tenant_id, policy_id);
CREATE INDEX idx_policy_acks_user    ON policy_acknowledgements (tenant_id, user_id);

ALTER TABLE policy_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON policy_acknowledgements
  FOR ALL USING (tenant_id = current_tenant_id());


-- Complaints register
CREATE TABLE complaints (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  received_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  complainant_type        TEXT NOT NULL
    CHECK (complainant_type IN ('parent', 'staff', 'anonymous', 'regulator', 'other')),
  complainant_name        TEXT,
  complainant_contact     TEXT,

  subject                 TEXT NOT NULL,
  description             TEXT NOT NULL,

  assigned_to             UUID REFERENCES users(id),
  target_resolution_date  DATE,

  status                  TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  resolution_outcome      TEXT,
  resolved_at             TIMESTAMPTZ,
  resolved_by             UUID REFERENCES users(id),

  escalated_to            TEXT,
  escalated_at            TIMESTAMPTZ,

  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_complaints_tenant_status  ON complaints (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_complaints_received       ON complaints (tenant_id, received_at DESC) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('complaints');

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON complaints
  FOR ALL USING (tenant_id = current_tenant_id());


-- Response log per complaint (append-only)
CREATE TABLE complaint_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  complaint_id  UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,

  action_taken  TEXT NOT NULL,
  notes         TEXT,
  recorded_by   UUID REFERENCES users(id),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaint_responses_complaint  ON complaint_responses (tenant_id, complaint_id);

ALTER TABLE complaint_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON complaint_responses
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE J — MONTESSORI LESSON TRACKING (MQ:AP)
-- ============================================================

-- Material library: tenant_id NULL = global WattleOS-curated library
-- Tenant rows = school-specific customisations
CREATE TABLE montessori_materials (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID REFERENCES tenants(id),   -- NULL = global

  area                      TEXT NOT NULL
    CHECK (area IN ('practical_life', 'sensorial', 'language', 'mathematics', 'cultural')),
  name                      TEXT NOT NULL,
  description               TEXT,
  age_level                 TEXT NOT NULL
    CHECK (age_level IN ('0_3', '3_6', '6_9', '9_12')),

  prerequisite_material_id  UUID REFERENCES montessori_materials(id),
  sequence_order            INT NOT NULL DEFAULT 0,
  is_active                 BOOLEAN NOT NULL DEFAULT true,

  -- EYLF outcome mappings (e.g. ['EYLF_LO1', 'EYLF_LO4'])
  eylf_outcome_codes        TEXT[] NOT NULL DEFAULT '{}',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_montessori_materials_area   ON montessori_materials (area, age_level) WHERE is_active = true;
CREATE INDEX idx_montessori_materials_tenant ON montessori_materials (tenant_id) WHERE tenant_id IS NOT NULL AND is_active = true;

SELECT apply_updated_at_trigger('montessori_materials');

ALTER TABLE montessori_materials ENABLE ROW LEVEL SECURITY;

-- Global materials (tenant_id IS NULL) are visible to all authenticated users
CREATE POLICY "Global materials are readable by all" ON montessori_materials
  FOR SELECT USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

-- Tenant-specific materials are scoped to that tenant
CREATE POLICY "Tenant-scoped materials" ON montessori_materials
  FOR ALL USING (tenant_id = current_tenant_id());


-- Per-child lesson record: captures each presentation
CREATE TABLE lesson_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  student_id        UUID NOT NULL REFERENCES students(id),
  material_id       UUID NOT NULL REFERENCES montessori_materials(id),
  educator_id       UUID REFERENCES users(id),

  presentation_date DATE NOT NULL,
  stage             TEXT NOT NULL
    CHECK (stage IN ('introduction', 'practice', 'mastery')),
  child_response    TEXT
    CHECK (child_response IN ('engaged', 'struggled', 'not_ready', 'mastered', 'other')),
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_records_student   ON lesson_records (tenant_id, student_id, presentation_date DESC);
CREATE INDEX idx_lesson_records_material  ON lesson_records (tenant_id, material_id);

SELECT apply_updated_at_trigger('lesson_records');

ALTER TABLE lesson_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON lesson_records
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardians can read own child lesson records" ON lesson_records
  FOR SELECT USING (is_guardian_of(student_id));


-- Work cycle session: records the protected three-hour work period per day
CREATE TABLE work_cycle_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  class_id      UUID REFERENCES classes(id),

  session_date  DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME,

  -- interruptions: [{time: "HH:MM", reason: text, duration_minutes: int}]
  interruptions JSONB NOT NULL DEFAULT '[]',

  recorded_by   UUID REFERENCES users(id),
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_cycle_sessions_class  ON work_cycle_sessions (tenant_id, class_id, session_date DESC);

SELECT apply_updated_at_trigger('work_cycle_sessions');

ALTER TABLE work_cycle_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON work_cycle_sessions
  FOR ALL USING (tenant_id = current_tenant_id());


-- Material self-selections per child per work cycle session
CREATE TABLE work_cycle_material_selections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  session_id          UUID NOT NULL REFERENCES work_cycle_sessions(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id),

  material_id         UUID REFERENCES montessori_materials(id),
  material_free_text  TEXT,   -- for materials not yet in the library

  concentration_level TEXT
    CHECK (concentration_level IN ('deep', 'moderate', 'distracted', 'not_observed')),
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wc_selections_session  ON work_cycle_material_selections (tenant_id, session_id);
CREATE INDEX idx_wc_selections_student  ON work_cycle_material_selections (tenant_id, student_id);

ALTER TABLE work_cycle_material_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON work_cycle_material_selections
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- MODULE K — MQ:AP SELF-ASSESSMENT FRAMEWORK
-- ============================================================

-- Global MQ:AP criteria library (no tenant_id — platform-managed)
-- Populated separately via seed; not in this migration.
CREATE TABLE mqap_criteria (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code                  TEXT NOT NULL UNIQUE,     -- e.g. 'MQ1.1.1'
  quality_area          INT NOT NULL,             -- 1–7
  standard_number       TEXT NOT NULL,            -- e.g. '1.1'
  criterion_number      TEXT NOT NULL,            -- e.g. '1.1.1'
  criterion_text        TEXT NOT NULL,
  guidance              TEXT,
  nqs_element_alignment TEXT,                     -- corresponding NQS element code(s)

  sequence_order        INT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mqap_criteria_qa      ON mqap_criteria (quality_area, sequence_order) WHERE is_active = true;
CREATE INDEX idx_mqap_criteria_code    ON mqap_criteria (code);

ALTER TABLE mqap_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read MQ:AP criteria" ON mqap_criteria
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- Tenant self-assessment against each MQ:AP criterion (one row per criterion per tenant)
CREATE TABLE mqap_assessments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  criteria_id   UUID NOT NULL REFERENCES mqap_criteria(id),

  rating        TEXT CHECK (rating IN ('working_towards', 'meeting', 'exceeding')),
  strengths     TEXT,

  assessed_at   TIMESTAMPTZ,
  assessed_by   UUID REFERENCES users(id),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, criteria_id)
);

CREATE INDEX idx_mqap_assessments_tenant  ON mqap_assessments (tenant_id);

SELECT apply_updated_at_trigger('mqap_assessments');

ALTER TABLE mqap_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON mqap_assessments
  FOR ALL USING (tenant_id = current_tenant_id());


-- Improvement goals per MQ:AP criterion
CREATE TABLE mqap_goals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  criteria_id             UUID NOT NULL REFERENCES mqap_criteria(id),

  description             TEXT NOT NULL,
  strategies              TEXT,
  responsible_person_id   UUID REFERENCES users(id),
  due_date                DATE,
  success_measures        TEXT,

  status                  TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'achieved')),
  achieved_at             TIMESTAMPTZ,

  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_mqap_goals_tenant    ON mqap_goals (tenant_id, criteria_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mqap_goals_status    ON mqap_goals (tenant_id, status) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('mqap_goals');

ALTER TABLE mqap_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON mqap_goals
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- PERMISSIONS — INSERT ALL NEW COMPLIANCE PERMISSION KEYS
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES

  -- Module A: Incidents
  ('create_incident',            'Log Incident',                   'incidents',         'Create a new incident, injury, trauma or illness record'),
  ('manage_incidents',           'Manage Incidents',               'incidents',         'Edit incidents, manage notifications, and close records'),
  ('view_incidents',             'View Incident Register',         'incidents',         'View all incident records and their status'),

  -- Module B: Medication
  ('manage_medication_plans',    'Manage Medical Plans',           'medication',        'Add and edit medical management plans for students'),
  ('administer_medication',      'Record Medication Administration','medication',       'Record a per-dose medication administration and witness'),
  ('view_medication_records',    'View Medication Records',        'medication',        'View medication authorisations and administration history'),

  -- Module C: Staff Compliance
  ('manage_staff_compliance',    'Manage Staff Compliance',        'staff_compliance',  'Edit staff qualification, certificate, and WWCC records'),
  ('view_staff_compliance',      'View Staff Compliance',          'staff_compliance',  'View compliance dashboard and expiry status for all staff'),
  ('export_worker_register',     'Export Worker Register',         'staff_compliance',  'Generate NQA ITS-compatible Worker Register export'),

  -- Module D: Ratios
  ('manage_floor_signin',        'Floor Sign-in / Sign-out',       'ratios',            'Sign in and out as on-floor educator for ratio tracking'),
  ('view_ratios',                'View Ratio Dashboard',           'ratios',            'View real-time and historical ratio data for all rooms'),

  -- Module E: QIP
  ('manage_qip',                 'Manage QIP',                     'qip',               'Edit NQS self-assessments, goals, evidence, and service philosophy'),
  ('view_qip',                   'View QIP',                       'qip',               'View the Quality Improvement Plan and NQS self-assessment'),

  -- Module F: Immunisation
  ('manage_immunisation',        'Manage Immunisation Records',    'immunisation',      'Add and update student Immunisation History Statements'),
  ('view_immunisation',          'View Immunisation Compliance',   'immunisation',      'View immunisation compliance dashboard for all students'),

  -- Module G: CCS
  ('manage_ccs_reports',         'Manage CCS Session Reports',     'ccs',               'Generate, edit, and submit CCS session report bundles'),
  ('view_ccs_reports',           'View CCS Reports',               'ccs',               'View CCS session report bundles and absence day counters'),

  -- Module H: Excursions
  ('manage_excursions',          'Manage Excursions',              'excursions',        'Create excursions, complete risk assessments, record headcounts'),
  ('view_excursions',            'View Excursions',                'excursions',        'View excursion records and consent status'),

  -- Module I: Complaints & Policies
  ('manage_policies',            'Manage Policies',                'compliance',        'Create, publish, and version-control policy documents'),
  ('manage_complaints',          'Manage Complaints',              'compliance',        'Record and manage the complaints register'),
  ('view_complaints',            'View Complaints Register',       'compliance',        'View complaints and their resolution status'),

  -- Module J: Lesson Tracking
  ('manage_lesson_records',      'Record Lessons',                 'lesson_tracking',   'Record Montessori lesson presentations and work cycle sessions'),
  ('view_lesson_records',        'View Lesson Records',            'lesson_tracking',   'View lesson history and work cycle journals'),

  -- Module K: MQ:AP
  ('manage_mqap',                'Manage MQ:AP Self-Assessment',   'mqap',              'Edit MQ:AP ratings, goals, and evidence for each criterion'),
  ('view_mqap',                  'View MQ:AP Framework',           'mqap',              'View MQ:AP self-assessment and gap report')

ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- BACKFILL ROLE PERMISSIONS FOR EXISTING TENANTS
-- ============================================================
-- Owner and Admin use wildcard selects — they auto-receive new permissions.
-- Head of School, Lead Guide, Guide, and Assistant need explicit grants.
-- ============================================================

DO $$
DECLARE
  r_tenant        RECORD;
  v_head          UUID;
  v_lead_guide    UUID;
  v_guide         UUID;
  v_assistant     UUID;
BEGIN
  FOR r_tenant IN SELECT id FROM tenants LOOP

    -- ── Owner: all permissions (wildcard — already auto-covered by seed_tenant_roles)
    -- ── Admin: all except manage_tenant_settings (already auto-covered)
    -- Both use SELECT * FROM permissions, so they pick up new rows automatically.

    -- ── Head of School: add all compliance module permissions
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module IN (
        'incidents', 'medication', 'staff_compliance', 'ratios',
        'qip', 'immunisation', 'ccs', 'excursions', 'compliance',
        'lesson_tracking', 'mqap'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Lead Guide: operational compliance permissions
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.key IN (
        'create_incident', 'manage_incidents', 'view_incidents',
        'administer_medication', 'view_medication_records', 'manage_medication_plans',
        'manage_floor_signin', 'view_ratios',
        'view_qip',
        'view_immunisation',
        'manage_excursions', 'view_excursions',
        'view_complaints',
        'manage_lesson_records', 'view_lesson_records',
        'view_mqap'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Guide: day-to-day classroom permissions
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.key IN (
        'create_incident',
        'administer_medication', 'view_medication_records',
        'manage_floor_signin',
        'manage_lesson_records', 'view_lesson_records',
        'view_excursions'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Assistant: minimal floor permissions
    SELECT id INTO v_assistant FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Assistant' AND is_system = true;

    IF v_assistant IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_assistant, p.id
      FROM permissions p
      WHERE p.key IN (
        'create_incident',
        'manage_floor_signin'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;


-- ============================================================
-- UPDATE seed_tenant_roles() FOR FUTURE TENANTS
-- ============================================================
-- Re-define the trigger function so new schools provisioned after
-- this migration automatically receive compliance permissions.
-- Owner/Admin already use wildcard selects — no change needed.
-- Only Head of School, Lead Guide, Guide, and Assistant are updated.
-- ============================================================

CREATE OR REPLACE FUNCTION seed_tenant_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_role_id      UUID;
  v_admin_role_id      UUID;
  v_head_role_id       UUID;
  v_lead_guide_role_id UUID;
  v_guide_role_id      UUID;
  v_assistant_role_id  UUID;
  v_parent_role_id     UUID;
BEGIN
  -- Create system roles
  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Owner', 'Full access to all features and settings', true)
    RETURNING id INTO v_owner_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Administrator', 'Administrative access except tenant settings', true)
    RETURNING id INTO v_admin_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Head of School', 'Pedagogical and operational leadership', true)
    RETURNING id INTO v_head_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Lead Guide', 'Lead classroom guide with curriculum management', true)
    RETURNING id INTO v_lead_guide_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Guide', 'Classroom guide with observation and attendance', true)
    RETURNING id INTO v_guide_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Assistant', 'Assistant guide with limited access', true)
    RETURNING id INTO v_assistant_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Parent', 'Parent/guardian access to child portfolio', true)
    RETURNING id INTO v_parent_role_id;

  -- Owner gets ALL permissions
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_owner_role_id, p.id
  FROM permissions p;

  -- Administrator gets all except manage_tenant_settings
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_admin_role_id, p.id
  FROM permissions p
  WHERE p.key != 'manage_tenant_settings';

  -- Head of School: all pedagogy + sis + attendance + comms + all compliance modules
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_head_role_id, p.id
  FROM permissions p
  WHERE p.module IN (
    'pedagogy', 'sis', 'attendance', 'comms',
    'incidents', 'medication', 'staff_compliance', 'ratios',
    'qip', 'immunisation', 'ccs', 'excursions', 'compliance',
    'lesson_tracking', 'mqap'
  );

  -- Lead Guide: core classroom + operational compliance
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_lead_guide_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'publish_observation', 'view_all_observations',
    'manage_curriculum', 'manage_mastery', 'manage_reports',
    'view_students', 'view_medical_records',
    'manage_attendance', 'view_attendance_reports',
    'view_classes',
    'send_class_messages',
    -- Compliance
    'create_incident', 'manage_incidents', 'view_incidents',
    'administer_medication', 'view_medication_records', 'manage_medication_plans',
    'manage_floor_signin', 'view_ratios',
    'view_qip',
    'view_immunisation',
    'manage_excursions', 'view_excursions',
    'view_complaints',
    'manage_lesson_records', 'view_lesson_records',
    'view_mqap'
  );

  -- Guide: classroom essentials + floor compliance
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_guide_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'publish_observation',
    'view_students', 'view_medical_records',
    'manage_attendance',
    'view_classes',
    'manage_mastery',
    'send_class_messages',
    -- Compliance
    'create_incident',
    'administer_medication', 'view_medication_records',
    'manage_floor_signin',
    'manage_lesson_records', 'view_lesson_records',
    'view_excursions'
  );

  -- Assistant: minimal access
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_assistant_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'view_students', 'manage_attendance',
    'view_classes',
    -- Compliance
    'create_incident',
    'manage_floor_signin'
  );

  -- Parent: no explicit permissions (uses is_guardian_of() in RLS)

  RETURN NEW;
END;
$$;

-- ============================================================
-- Verification (run after applying):
-- SELECT module, count(*) FROM permissions GROUP BY module ORDER BY module;
-- SELECT count(*) FROM permissions; -- should be ~75
-- ============================================================
