-- 00036_accreditation_checklist.sql
-- ============================================================
-- AMI / AMS / MSAA Accreditation Checklist
-- ============================================================
-- Montessori-body accreditation self-assessment. Distinct from
-- QIP (ACECQA regulatory) and MQ:AP (quality improvement).
--
-- Three accrediting bodies supported:
--   AMI  — Association Montessori Internationale
--   AMS  — American Montessori Society
--   MSAA — Montessori Schools Association of Australia
--
-- Tables:
--   accreditation_bodies     — seeded: AMI, AMS, MSAA
--   accreditation_criteria   — criteria per body (tenant-copyable
--                              from seed or custom-created)
--   accreditation_cycles     — one per body per cycle period
--   accreditation_assessments— criterion-level status per cycle
--   accreditation_evidence   — file/link evidence attached to assessments
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUM: accrediting body identifier
-- ────────────────────────────────────────────────────────────
CREATE TYPE accreditation_body_code AS ENUM (
  'ami',    -- Association Montessori Internationale
  'ams',    -- American Montessori Society
  'msaa'    -- Montessori Schools Association of Australia
);

-- ────────────────────────────────────────────────────────────
-- ENUM: criterion rating (analogous to QIP but Montessori-specific)
-- ────────────────────────────────────────────────────────────
CREATE TYPE accreditation_rating AS ENUM (
  'not_started',   -- not yet self-assessed
  'not_met',       -- evidence absent or insufficient
  'partially_met', -- in progress / partial compliance
  'met',           -- fully compliant
  'exceeds'        -- exemplary practice / exceeds standard
);

-- ────────────────────────────────────────────────────────────
-- ENUM: cycle status
-- ────────────────────────────────────────────────────────────
CREATE TYPE accreditation_cycle_status AS ENUM (
  'draft',       -- being set up
  'self_study',  -- active self-assessment phase
  'submitted',   -- submitted to body for review
  'under_review',-- assessors reviewing
  'accredited',  -- accreditation granted
  'conditional', -- accredited with conditions
  'lapsed'       -- not renewed in time
);

-- ────────────────────────────────────────────────────────────
-- ENUM: evidence type
-- ────────────────────────────────────────────────────────────
CREATE TYPE accreditation_evidence_type AS ENUM (
  'document',    -- uploaded PDF / Word doc
  'link',        -- external URL
  'observation', -- link to WattleOS observation record
  'photo',       -- photo file
  'note'         -- free-text note only
);

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_criteria
-- Master list of criteria per body. Seeded globally below.
-- Tenants can also add custom criteria (is_custom = true).
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_criteria (
  id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                    REFERENCES tenants(id) ON DELETE CASCADE,
  -- NULL tenant_id = global seed row (not directly editable by tenants)
  body_code       accreditation_body_code NOT NULL,
  domain_name     TEXT                    NOT NULL,   -- e.g. "Curriculum", "Environment"
  domain_order    SMALLINT                NOT NULL DEFAULT 0,
  criterion_code  TEXT                    NOT NULL,   -- e.g. "AMI-C1", "AMS-E3"
  criterion_title TEXT                    NOT NULL,
  description     TEXT,
  guidance        TEXT,                               -- what evidence is expected
  is_custom       BOOLEAN                 NOT NULL DEFAULT false,
  is_active       BOOLEAN                 NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ             NOT NULL DEFAULT now()
);

CREATE INDEX ON accreditation_criteria (body_code, domain_order);
CREATE INDEX ON accreditation_criteria (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TRIGGER update_accreditation_criteria_updated_at
  BEFORE UPDATE ON accreditation_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: tenants see global rows + their own custom rows
ALTER TABLE accreditation_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_criteria_access" ON accreditation_criteria
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_cycles
-- One accreditation cycle per tenant per body.
-- A tenant can have multiple cycles (e.g. 2022, 2025) but
-- only one per body should be 'active' at a time.
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_cycles (
  id              UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  body_code       accreditation_body_code     NOT NULL,
  cycle_label     TEXT                        NOT NULL, -- e.g. "2025 AMI Self-Study"
  status          accreditation_cycle_status  NOT NULL DEFAULT 'draft',
  self_study_start DATE,
  self_study_end   DATE,
  submission_date  DATE,
  decision_date    DATE,
  decision_notes   TEXT,
  accreditation_valid_from DATE,
  accreditation_valid_to   DATE,
  lead_staff_id    UUID                       REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_by       UUID                       REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ                NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ                NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX ON accreditation_cycles (tenant_id, body_code);
CREATE INDEX ON accreditation_cycles (tenant_id, status);

CREATE TRIGGER update_accreditation_cycles_updated_at
  BEFORE UPDATE ON accreditation_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE accreditation_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_cycles_tenant_isolation" ON accreditation_cycles
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_assessments
-- One row per (cycle × criterion). Holds the rating + notes.
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_assessments (
  id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id        UUID                    NOT NULL REFERENCES accreditation_cycles(id) ON DELETE CASCADE,
  criterion_id    UUID                    NOT NULL REFERENCES accreditation_criteria(id) ON DELETE CASCADE,
  rating          accreditation_rating    NOT NULL DEFAULT 'not_started',
  self_assessment TEXT,                   -- narrative justification
  strengths       TEXT,
  areas_for_growth TEXT,
  action_required  TEXT,
  target_date      DATE,
  assessed_by      UUID                   REFERENCES auth.users(id) ON DELETE SET NULL,
  assessed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ            NOT NULL DEFAULT now(),

  UNIQUE (cycle_id, criterion_id)
);

CREATE INDEX ON accreditation_assessments (tenant_id, cycle_id);
CREATE INDEX ON accreditation_assessments (tenant_id, rating);

CREATE TRIGGER update_accreditation_assessments_updated_at
  BEFORE UPDATE ON accreditation_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE accreditation_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_assessments_tenant_isolation" ON accreditation_assessments
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_evidence
-- Evidence items attached to an assessment (files, links, notes).
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_evidence (
  id              UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assessment_id   UUID                          NOT NULL REFERENCES accreditation_assessments(id) ON DELETE CASCADE,
  evidence_type   accreditation_evidence_type   NOT NULL DEFAULT 'note',
  title           TEXT                          NOT NULL,
  description     TEXT,
  file_url        TEXT,          -- storage URL for document/photo
  external_url    TEXT,          -- external link
  observation_id  UUID,          -- optional link to observations table
  uploaded_by     UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX ON accreditation_evidence (tenant_id, assessment_id);

CREATE TRIGGER update_accreditation_evidence_updated_at
  BEFORE UPDATE ON accreditation_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE accreditation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_evidence_tenant_isolation" ON accreditation_evidence
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ============================================================
-- SEED: AMI criteria (abridged representative set)
-- Covers the 6 core AMI self-study domains
-- ============================================================
INSERT INTO accreditation_criteria
  (tenant_id, body_code, domain_name, domain_order, criterion_code, criterion_title, description, guidance)
VALUES
  -- Domain 1: Philosophy & Approach
  (NULL,'ami','Philosophy & Approach',1,'AMI-P1','Montessori Philosophy — Documented Programme',
   'The programme is based on authentic Montessori philosophy and documented in writing.',
   'Provide written programme philosophy, mission statement, and alignment to AMI training standards.'),
  (NULL,'ami','Philosophy & Approach',1,'AMI-P2','Child-Centred Learning Environment',
   'The environment and daily schedule support uninterrupted three-hour work cycles.',
   'Schedule documentation showing 3-hour work period. Observation records demonstrating self-directed work.'),
  (NULL,'ami','Philosophy & Approach',1,'AMI-P3','Respect for the Child',
   'Staff demonstrate consistent respect for child autonomy, dignity, and pace of development.',
   'Observation records, staff meeting notes, professional development logs.'),

  -- Domain 2: Curriculum & Materials
  (NULL,'ami','Curriculum & Materials',2,'AMI-C1','Complete Montessori Materials — 3–6',
   'The primary environment contains a complete, authentic set of Montessori materials.',
   'Shelf inventory records with condition status. Audit against AMI material list.'),
  (NULL,'ami','Curriculum & Materials',2,'AMI-C2','Complete Montessori Materials — 6–12',
   'The elementary environment contains a complete, authentic set of Montessori materials.',
   'Shelf inventory records with condition status.'),
  (NULL,'ami','Curriculum & Materials',2,'AMI-C3','Three-Period Lesson Records',
   'Systematic records of three-period lesson stages are maintained for each child.',
   'Lesson record exports showing Introduction, Association, and Recall stage progression.'),
  (NULL,'ami','Curriculum & Materials',2,'AMI-C4','Sensitive Period Identification',
   'Staff observe and document sensitive periods for each child and respond with appropriate materials.',
   'Sensitive period logs, material presentation records linked to sensitive periods.'),
  (NULL,'ami','Curriculum & Materials',2,'AMI-C5','Cosmic Education Integration',
   'Cosmic education and the five great lessons are integrated into the 6–12 programme.',
   'Lesson planning records, observation notes referencing cosmic connections.'),

  -- Domain 3: Prepared Environment
  (NULL,'ami','Prepared Environment',3,'AMI-E1','Physical Environment — Order and Beauty',
   'The environment is beautiful, orderly, child-scaled, and inviting.',
   'Photographic evidence, environment planner/shelf layout plans.'),
  (NULL,'ami','Prepared Environment',3,'AMI-E2','Outdoor Environment',
   'An outdoor environment is provided that offers nature-based, purposeful activity.',
   'Photos, outdoor programme records, risk assessments.'),
  (NULL,'ami','Prepared Environment',3,'AMI-E3','Material Rotation & Presentation',
   'Materials are regularly rotated in response to child observation and developmental stage.',
   'Rotation schedule records, shelf plan revision history.'),

  -- Domain 4: Staff Qualifications & Professional Development
  (NULL,'ami','Staff & Professional Development',4,'AMI-S1','AMI-Credentialled Lead Guide',
   'The lead guide holds a current AMI credential for the age group.',
   'Copy of AMI credential(s), renewal status.'),
  (NULL,'ami','Staff & Professional Development',4,'AMI-S2','Ongoing Professional Development',
   'All staff participate in ongoing Montessori professional development.',
   'Staff compliance records showing PD attendance. Certificates uploaded.'),
  (NULL,'ami','Staff & Professional Development',4,'AMI-S3','Child Protection Training',
   'All staff have completed mandated child protection / mandatory reporting training.',
   'Staff compliance records — mandatory reporting certificate.'),
  (NULL,'ami','Staff & Professional Development',4,'AMI-S4','Staff-to-Child Ratio Compliance',
   'Staff-to-child ratios meet or exceed AMI recommendations at all times.',
   'Ratio monitoring logs. Regulatory compliance evidence.'),

  -- Domain 5: Observation & Documentation
  (NULL,'ami','Observation & Documentation',5,'AMI-O1','Systematic Child Observation',
   'Staff maintain systematic, dated observations of each child across all areas.',
   'Observation records demonstrating breadth across curriculum areas.'),
  (NULL,'ami','Observation & Documentation',5,'AMI-O2','Progress Reports to Families',
   'Families receive regular, personalised progress reports.',
   'Report samples (redacted). Distribution records.'),
  (NULL,'ami','Observation & Documentation',5,'AMI-O3','EYLF / NQF Framework Alignment',
   'Observations and planning demonstrate alignment with EYLF/NQF as required by regulation.',
   'Observation tags, QIP evidence, cross-mapping records.'),

  -- Domain 6: Community & Family Engagement
  (NULL,'ami','Community & Family Engagement',6,'AMI-F1','Parent Orientation Programme',
   'Families receive a Montessori orientation before or on enrolment.',
   'Orientation session records, parent communication logs.'),
  (NULL,'ami','Community & Family Engagement',6,'AMI-F2','Regular Family Communication',
   'Regular scheduled communication mechanisms exist (newsletters, events, conferences).',
   'Newsletter/announcement records. Interview scheduling records. Event RSVP evidence.'),

  -- ── AMS Criteria ──────────────────────────────────────────
  -- Domain 1: Programme Identity
  (NULL,'ams','Programme Identity',1,'AMS-I1','AMS Membership',
   'The school holds current AMS institutional membership.',
   'AMS membership certificate or confirmation letter.'),
  (NULL,'ams','Programme Identity',1,'AMS-I2','Mission & Philosophy Statement',
   'A written mission statement reflects authentic Montessori philosophy.',
   'Current mission statement document. Board approval minutes.'),

  -- Domain 2: Qualified Staff
  (NULL,'ams','Qualified Staff',2,'AMS-S1','Lead Teacher AMS/MACTE Credential',
   'Lead teachers hold an AMS or MACTE-recognised credential for the level taught.',
   'Credential copies on file. Renewal tracking.'),
  (NULL,'ams','Qualified Staff',2,'AMS-S2','Annual Professional Development',
   'All Montessori staff complete a minimum of 15 hours PD annually.',
   'Staff compliance PD records. Hours tallied per staff member.'),
  (NULL,'ams','Qualified Staff',2,'AMS-S3','Support Staff Orientation',
   'Non-credentialled support staff receive documented Montessori orientation.',
   'Orientation programme records. Staff signatures.'),

  -- Domain 3: Learning Environment
  (NULL,'ams','Learning Environment',3,'AMS-E1','Uninterrupted Work Period',
   'A minimum three-hour uninterrupted work cycle is provided each day.',
   'Schedule documentation. Work cycle integrity logs.'),
  (NULL,'ams','Learning Environment',3,'AMS-E2','Complete and Authentic Materials',
   'The environment contains a complete and authentic set of Montessori materials.',
   'Material inventory records with condition and status.'),
  (NULL,'ams','Learning Environment',3,'AMS-E3','Multi-Age Grouping',
   'Children are grouped in the authentic three-year age span.',
   'Class enrolment data showing age range.'),

  -- Domain 4: Child Progress & Assessment
  (NULL,'ams','Child Progress & Assessment',4,'AMS-A1','Individual Progress Records',
   'Comprehensive records of each child''s progress are maintained.',
   'Lesson records, observation records, mastery tracking exports.'),
  (NULL,'ams','Child Progress & Assessment',4,'AMS-A2','Family Conferences',
   'Parent-teacher conferences are held at least twice per year.',
   'Interview scheduling records. Conference notes.'),

  -- ── MSAA Criteria ─────────────────────────────────────────
  -- Domain 1: Philosophy
  (NULL,'msaa','Philosophy & Pedagogy',1,'MSAA-P1','Authentic Montessori Approach',
   'The school''s programme is grounded in authentic Montessori pedagogy.',
   'Written philosophy. Alignment documentation.'),
  (NULL,'msaa','Philosophy & Pedagogy',1,'MSAA-P2','Three-Hour Work Cycle Observed',
   'The three-hour morning work cycle is protected and uninterrupted.',
   'Schedule records. Work cycle integrity log.'),

  -- Domain 2: Environment & Materials
  (NULL,'msaa','Environment & Materials',2,'MSAA-E1','Environment Meets MSAA Standards',
   'Indoor and outdoor environments reflect the MSAA prepared environment guidelines.',
   'Environment planner records. Photos.'),
  (NULL,'msaa','Environment & Materials',2,'MSAA-E2','Materials — Complete and in Good Condition',
   'All Montessori materials are present, complete, and in good condition.',
   'Inventory records. Condition audits.'),

  -- Domain 3: Staff
  (NULL,'msaa','Staff Qualifications',3,'MSAA-S1','Montessori-Qualified Lead Educator',
   'Lead educators hold a recognised Montessori qualification.',
   'Qualification certificates on file.'),
  (NULL,'msaa','Staff Qualifications',3,'MSAA-S2','Regulatory Compliance Certificates',
   'All staff hold current Working With Children Checks and mandatory reporting certificates.',
   'Staff compliance records. WWCC numbers + expiry dates.'),

  -- Domain 4: Governance & Administration
  (NULL,'msaa','Governance & Administration',4,'MSAA-G1','Policies Current and Accessible',
   'All mandatory policies are current, reviewed within required timeframes, and accessible to families.',
   'Policy register. Reg 168 compliance checklist.'),
  (NULL,'msaa','Governance & Administration',4,'MSAA-G2','Child Safety Governance',
   'The school has a documented Child Safety Policy and code of conduct.',
   'Child safety policy. Staff acknowledgement records.'),

  -- Domain 5: Community
  (NULL,'msaa','Community & Families',5,'MSAA-F1','Family Education Programme',
   'The school provides ongoing education for families about the Montessori approach.',
   'Newsletter records. Parent event records. Montessori literacy hub content.'),
  (NULL,'msaa','Community & Families',5,'MSAA-F2','Complaints Process',
   'A documented and accessible complaints process is in place.',
   'Complaint register. Policy reference.');

-- ============================================================
-- PERMISSIONS
-- These are added in the permissions migration block below,
-- but the DB rows are inserted here for completeness.
-- New permissions are inserted into the permissions table
-- and then backfilled to existing Owner/Admin roles.
-- ============================================================

-- Insert new permissions
INSERT INTO permissions (key, label, description, module)
VALUES
  ('view_accreditation',   'View Accreditation',   'View accreditation cycles, criteria, and assessments',  'accreditation'),
  ('manage_accreditation', 'Manage Accreditation',  'Create and update accreditation cycles and assessments', 'accreditation')
ON CONFLICT (key) DO NOTHING;

-- Backfill to existing Owner, Admin, HoS roles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rp.role_id
    FROM role_permissions rp
    JOIN roles ro ON ro.id = rp.role_id
    WHERE ro.name IN ('Owner','Admin','Head of School')
    GROUP BY rp.role_id
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'view_accreditation'),
      (r.role_id, 'manage_accreditation')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Also give Guide / Lead Educator view access
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rp.role_id
    FROM role_permissions rp
    JOIN roles ro ON ro.id = rp.role_id
    WHERE ro.name IN ('Guide','Lead Educator','Educator')
    GROUP BY rp.role_id
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES (r.role_id, 'view_accreditation')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
