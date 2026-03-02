-- 00036_montessori_accreditation.sql
-- ============================================================
-- AMI / AMS / MSAA Accreditation Checklist
-- ============================================================
-- Montessori schools may seek accreditation from one or more
-- international/national Montessori bodies:
--   • AMI  — Association Montessori Internationale
--   • AMS  — American Montessori Society
--   • MSAA — Montessori Schools Association of Australia
--
-- This module is distinct from QIP (regulatory, Reg 55) and
-- MQ:AP (Montessori Australia voluntary). It provides:
--   1. Global seed criteria per body (tenant_id NULL = shared)
--   2. Accreditation cycles per tenant (one active per body)
--   3. Per-criterion self-assessments with strengths / gaps
--   4. Evidence linking (documents, links, observations, photos)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUM: Accreditation body
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE montessori_accreditation_body AS ENUM ('ami', 'ams', 'msaa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- ENUM: Self-assessment rating per criterion
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE accreditation_rating AS ENUM (
    'not_started',
    'not_met',
    'partially_met',
    'met',
    'exceeds'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- ENUM: Accreditation cycle lifecycle
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE accreditation_cycle_status AS ENUM (
    'draft',
    'self_study',
    'submitted',
    'under_review',
    'accredited',
    'conditional',
    'lapsed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- ENUM: Evidence type attached to an assessment
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE accreditation_evidence_type AS ENUM (
    'document',
    'link',
    'observation',
    'photo',
    'note'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_criteria
-- Global seed rows (tenant_id IS NULL) define the shared
-- checklist per body. Tenants can add custom criteria rows.
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_criteria (
  id               UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID                       REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
  body_code        montessori_accreditation_body NOT NULL,
  domain_name      TEXT                       NOT NULL,   -- e.g. "The Child"
  domain_order     INT                        NOT NULL DEFAULT 0,
  criterion_code   TEXT                       NOT NULL,   -- e.g. "AMI-1.1"
  criterion_title  TEXT                       NOT NULL,
  description      TEXT,
  guidance         TEXT,
  is_custom        BOOLEAN                    NOT NULL DEFAULT false,
  is_active        BOOLEAN                    NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ                NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ                NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX accreditation_criteria_code_unique
  ON accreditation_criteria (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), body_code, criterion_code);

ALTER TABLE accreditation_criteria ENABLE ROW LEVEL SECURITY;
-- Global criteria (tenant_id IS NULL) are readable by any authenticated user.
-- Tenant-custom criteria are readable only by that tenant.
CREATE POLICY "accreditation_criteria_read"
  ON accreditation_criteria FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
  );
CREATE POLICY "accreditation_criteria_write"
  ON accreditation_criteria FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE INDEX ON accreditation_criteria (body_code, domain_order, is_active);
CREATE INDEX ON accreditation_criteria (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TRIGGER update_accreditation_criteria_updated_at
  BEFORE UPDATE ON accreditation_criteria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_cycles
-- One row per active pursuit of accreditation from a given body.
-- Partial unique index enforces max one active cycle per body.
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_cycles (
  id                       UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID                        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  body_code                montessori_accreditation_body NOT NULL,
  cycle_label              TEXT                        NOT NULL,  -- e.g. "AMI 2025–2028"
  status                   accreditation_cycle_status  NOT NULL DEFAULT 'draft',
  self_study_start         DATE,
  self_study_end           DATE,
  submission_date          DATE,
  decision_date            DATE,
  decision_notes           TEXT,
  accreditation_valid_from DATE,
  accreditation_valid_to   DATE,
  lead_staff_id            UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                    TEXT,
  created_by               UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

-- One active cycle per body per tenant (draft through under_review)
CREATE UNIQUE INDEX accreditation_cycles_one_active
  ON accreditation_cycles (tenant_id, body_code)
  WHERE status IN ('draft','self_study','submitted','under_review')
    AND deleted_at IS NULL;

ALTER TABLE accreditation_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_cycles_tenant_isolation" ON accreditation_cycles
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX ON accreditation_cycles (tenant_id);
CREATE INDEX ON accreditation_cycles (tenant_id, body_code, status) WHERE deleted_at IS NULL;

CREATE TRIGGER update_accreditation_cycles_updated_at
  BEFORE UPDATE ON accreditation_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_assessments
-- One row per (cycle × criterion). Upserted as the school
-- works through the checklist.
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_assessments (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID                 NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id          UUID                 NOT NULL REFERENCES accreditation_cycles(id) ON DELETE CASCADE,
  criterion_id      UUID                 NOT NULL REFERENCES accreditation_criteria(id) ON DELETE CASCADE,
  rating            accreditation_rating NOT NULL DEFAULT 'not_started',
  self_assessment   TEXT,                -- narrative self-assessment
  strengths         TEXT,                -- what the school does well
  areas_for_growth  TEXT,                -- gaps identified
  action_required   TEXT,                -- planned improvement actions
  target_date       DATE,
  assessed_by       UUID                 REFERENCES auth.users(id) ON DELETE SET NULL,
  assessed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX accreditation_assessments_unique
  ON accreditation_assessments (cycle_id, criterion_id);

ALTER TABLE accreditation_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_assessments_tenant_isolation" ON accreditation_assessments
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX ON accreditation_assessments (tenant_id, cycle_id);
CREATE INDEX ON accreditation_assessments (cycle_id, rating);

CREATE TRIGGER update_accreditation_assessments_updated_at
  BEFORE UPDATE ON accreditation_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- TABLE: accreditation_evidence
-- Evidence items attached to a specific assessment.
-- ────────────────────────────────────────────────────────────
CREATE TABLE accreditation_evidence (
  id              UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assessment_id   UUID                         NOT NULL REFERENCES accreditation_assessments(id) ON DELETE CASCADE,
  evidence_type   accreditation_evidence_type  NOT NULL,
  title           TEXT                         NOT NULL,
  description     TEXT,
  file_url        TEXT,
  external_url    TEXT,
  observation_id  UUID                         REFERENCES observations(id) ON DELETE SET NULL,
  uploaded_by     UUID                         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ                  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ                  NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE accreditation_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accreditation_evidence_tenant_isolation" ON accreditation_evidence
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX ON accreditation_evidence (tenant_id, assessment_id) WHERE deleted_at IS NULL;
CREATE INDEX ON accreditation_evidence (observation_id) WHERE observation_id IS NOT NULL;

CREATE TRIGGER update_accreditation_evidence_updated_at
  BEFORE UPDATE ON accreditation_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- PERMISSIONS
-- ────────────────────────────────────────────────────────────
INSERT INTO permissions (key, description) VALUES
  ('view_accreditation',   'View Montessori accreditation checklists and cycles'),
  ('manage_accreditation', 'Create and manage Montessori accreditation cycles and assessments')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- BACKFILL: grant to Owner, Admin, Head of School for all
-- existing tenants (new tenants get it via seed_tenant_roles trigger).
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  perm_view   UUID;
  perm_manage UUID;
BEGIN
  SELECT id INTO perm_view   FROM permissions WHERE key = 'view_accreditation';
  SELECT id INTO perm_manage FROM permissions WHERE key = 'manage_accreditation';

  FOR r IN
    SELECT tr.id AS role_id
    FROM   tenant_roles tr
    JOIN   roles        ro ON ro.id = tr.role_id
    WHERE  ro.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    INSERT INTO role_permissions (tenant_role_id, permission_id)
    VALUES (r.role_id, perm_view)
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (tenant_role_id, permission_id)
    VALUES (r.role_id, perm_manage)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- SEED: Global criteria for all three bodies
-- AMI domains: The Child, The Environment, The Adult,
--              The Community, The School Administration
-- AMS domains: Program, Physical Environment, Professional
--              Community, Administration
-- MSAA domains: Philosophy, Environment, Teaching Practice,
--               Child Development, Community
-- ────────────────────────────────────────────────────────────
INSERT INTO accreditation_criteria
  (id, tenant_id, body_code, domain_name, domain_order, criterion_code, criterion_title, description, guidance)
VALUES
  -- ── AMI: The Child ──────────────────────────────────────
  (gen_random_uuid(), NULL, 'ami', 'The Child', 1, 'AMI-C1.1',
   'Freedom of movement and choice',
   'Children are free to move around the environment and choose their own work.',
   'Observe whether movement is constrained or guided; count child-initiated vs teacher-directed transitions.'),
  (gen_random_uuid(), NULL, 'ami', 'The Child', 1, 'AMI-C1.2',
   'Uninterrupted work cycle',
   'A minimum three-hour work cycle is protected daily with no whole-group interruptions.',
   'Review timetable; interview guides about non-negotiable periods.'),
  (gen_random_uuid(), NULL, 'ami', 'The Child', 1, 'AMI-C1.3',
   'Child self-correction and error control',
   'Materials are designed and presented to allow children to identify and correct their own errors.',
   'Observe whether adults intervene immediately or allow the child opportunity to self-correct.'),
  (gen_random_uuid(), NULL, 'ami', 'The Child', 1, 'AMI-C1.4',
   'Concentration and normalization',
   'The environment supports deep, sustained concentration leading to normalization.',
   'Review normalization observation logs; note frequency of interrupted cycles.'),

  -- ── AMI: The Environment ────────────────────────────────
  (gen_random_uuid(), NULL, 'ami', 'The Environment', 2, 'AMI-E2.1',
   'Prepared environment design',
   'The physical environment is prepared according to AMI standards: child-sized, beautiful, ordered, and complete.',
   'Walk the environment with the checklist; photograph each area.'),
  (gen_random_uuid(), NULL, 'ami', 'The Environment', 2, 'AMI-E2.2',
   'Completeness and accessibility of materials',
   'All required AMI materials are present, in good condition, and accessible to children at the correct level.',
   'Audit materials inventory against AMI approved list; note missing or damaged items.'),
  (gen_random_uuid(), NULL, 'ami', 'The Environment', 2, 'AMI-E2.3',
   'Isolation of difficulty',
   'Each material isolates a single quality or concept to support focused learning.',
   'Review newly introduced materials; confirm each isolates one difficulty.'),
  (gen_random_uuid(), NULL, 'ami', 'The Environment', 2, 'AMI-E2.4',
   'Mixed-age grouping',
   'Children are grouped across a three-year age span as per the Montessori developmental planes.',
   'Verify enrolment data; confirm rationale for any single-age groupings.'),

  -- ── AMI: The Adult ──────────────────────────────────────
  (gen_random_uuid(), NULL, 'ami', 'The Adult', 3, 'AMI-A3.1',
   'AMI-recognised teacher training',
   'All lead guides hold a current AMI Diploma at the appropriate level.',
   'Collect copies of all AMI Diplomas; verify dates and levels match the programme delivered.'),
  (gen_random_uuid(), NULL, 'ami', 'The Adult', 3, 'AMI-A3.2',
   'Observation practice',
   'Guides maintain a regular systematic observation practice for each child.',
   'Review observation records; look for frequency, depth, and use of observations in planning.'),
  (gen_random_uuid(), NULL, 'ami', 'The Adult', 3, 'AMI-A3.3',
   'Lesson delivery fidelity',
   'Three-period lessons and material presentations are delivered with fidelity to AMI methodology.',
   'Observe live lessons; compare to AMI training album descriptions.'),
  (gen_random_uuid(), NULL, 'ami', 'The Adult', 3, 'AMI-A3.4',
   'Non-interference and observation before intervention',
   'Guides observe before intervening; avoid unnecessary interruptions to child work.',
   'Use a tally counter across a work cycle to track adult-initiated interruptions.'),

  -- ── AMI: The Community ──────────────────────────────────
  (gen_random_uuid(), NULL, 'ami', 'The Community', 4, 'AMI-CO4.1',
   'Parent education programme',
   'The school offers systematic parent education about Montessori philosophy and practice.',
   'Provide programme schedule; evidence of attendance and content.'),
  (gen_random_uuid(), NULL, 'ami', 'The Community', 4, 'AMI-CO4.2',
   'Community of practice among staff',
   'Staff collaborate regularly to reflect on practice, share observations, and align with AMI standards.',
   'Provide meeting minutes, professional learning records, and collaborative planning evidence.'),

  -- ── AMI: School Administration ──────────────────────────
  (gen_random_uuid(), NULL, 'ami', 'School Administration', 5, 'AMI-SA5.1',
   'Governance alignment with Montessori philosophy',
   'Governance structures and leadership decisions are aligned with Montessori principles.',
   'Review school charter, policies, and leadership meeting records.'),
  (gen_random_uuid(), NULL, 'ami', 'School Administration', 5, 'AMI-SA5.2',
   'Fidelity of programme to AMI standards over time',
   'The school demonstrates consistent adherence to AMI standards across multiple cycles.',
   'Review prior accreditation reports; note areas of sustained strength and improvement.'),

  -- ── AMS: Program ────────────────────────────────────────
  (gen_random_uuid(), NULL, 'ams', 'Program', 1, 'AMS-P1.1',
   'Curriculum alignment with Montessori principles',
   'The curriculum is grounded in Montessori philosophy and developmentally appropriate practice.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Program', 1, 'AMS-P1.2',
   'Individualized learning plans',
   'Each child has an individualized learning plan based on observation and assessment.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Program', 1, 'AMS-P1.3',
   'Use of authentic Montessori materials',
   'The classroom uses authentic, approved Montessori materials in good condition.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Program', 1, 'AMS-P1.4',
   'Mixed-age classrooms across developmental planes',
   'Classrooms serve three-year age bands aligned to Montessori developmental planes.',
   NULL),

  -- ── AMS: Physical Environment ───────────────────────────
  (gen_random_uuid(), NULL, 'ams', 'Physical Environment', 2, 'AMS-PE2.1',
   'Child-centred classroom setup',
   'Furniture, materials, and spaces are scaled and arranged for independent child use.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Physical Environment', 2, 'AMS-PE2.2',
   'Safety, cleanliness, and aesthetic quality',
   'The environment is safe, clean, orderly, and aesthetically inviting.',
   NULL),

  -- ── AMS: Professional Community ─────────────────────────
  (gen_random_uuid(), NULL, 'ams', 'Professional Community', 3, 'AMS-PC3.1',
   'AMS-credentialed teachers',
   'Lead teachers hold current AMS credentials at the appropriate level.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Professional Community', 3, 'AMS-PC3.2',
   'Ongoing professional development',
   'Teachers participate in ongoing Montessori professional development.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Professional Community', 3, 'AMS-PC3.3',
   'Collaborative reflection and peer learning',
   'Staff engage in collaborative reflection and peer learning practices.',
   NULL),

  -- ── AMS: Administration ─────────────────────────────────
  (gen_random_uuid(), NULL, 'ams', 'Administration', 4, 'AMS-AD4.1',
   'Admissions aligned with Montessori values',
   'Admissions practices are aligned with Montessori philosophy and non-discriminatory.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Administration', 4, 'AMS-AD4.2',
   'Financial sustainability and transparency',
   'The school demonstrates financial sustainability and transparent governance.',
   NULL),
  (gen_random_uuid(), NULL, 'ams', 'Administration', 4, 'AMS-AD4.3',
   'Parent and community communication',
   'The school maintains regular, meaningful communication with families and the community.',
   NULL),

  -- ── MSAA: Philosophy ────────────────────────────────────
  (gen_random_uuid(), NULL, 'msaa', 'Philosophy', 1, 'MSAA-PH1.1',
   'Documented Montessori philosophy statement',
   'The school has a current, published Montessori philosophy statement embedded in practice.',
   'Philosophy statement should be visible in enrolment materials, website, and staff induction.'),
  (gen_random_uuid(), NULL, 'msaa', 'Philosophy', 1, 'MSAA-PH1.2',
   'Philosophy embedded in all policies',
   'School policies reflect Montessori philosophy including behaviour, curriculum, and assessment.',
   'Audit policy register against philosophy statement for alignment.'),

  -- ── MSAA: Environment ───────────────────────────────────
  (gen_random_uuid(), NULL, 'msaa', 'Environment', 2, 'MSAA-EN2.1',
   'Prepared environment standards',
   'Each classroom is prepared to MSAA standards: ordered, complete, beautiful, and child-centred.',
   NULL),
  (gen_random_uuid(), NULL, 'msaa', 'Environment', 2, 'MSAA-EN2.2',
   'Outdoor prepared environment',
   'The outdoor environment is also prepared in alignment with Montessori principles.',
   NULL),

  -- ── MSAA: Teaching Practice ─────────────────────────────
  (gen_random_uuid(), NULL, 'msaa', 'Teaching Practice', 3, 'MSAA-TP3.1',
   'Montessori-trained teaching staff',
   'All lead educators hold a recognised Montessori qualification for their age group.',
   'Collect qualification evidence; verify level alignment to programme.'),
  (gen_random_uuid(), NULL, 'msaa', 'Teaching Practice', 3, 'MSAA-TP3.2',
   'Observation-driven planning',
   'Lesson planning is driven by systematic child observation.',
   NULL),
  (gen_random_uuid(), NULL, 'msaa', 'Teaching Practice', 3, 'MSAA-TP3.3',
   'Fidelity to three-hour work cycle',
   'The school protects and honours the three-hour uninterrupted work cycle.',
   NULL),

  -- ── MSAA: Child Development ─────────────────────────────
  (gen_random_uuid(), NULL, 'msaa', 'Child Development', 4, 'MSAA-CD4.1',
   'Developmental plane groupings',
   'Children are enrolled in mixed-age groups spanning the full Montessori developmental plane.',
   NULL),
  (gen_random_uuid(), NULL, 'msaa', 'Child Development', 4, 'MSAA-CD4.2',
   'Transition support and documentation',
   'Transitions between planes are supported with documented observations and handover planning.',
   NULL),

  -- ── MSAA: Community ─────────────────────────────────────
  (gen_random_uuid(), NULL, 'msaa', 'Community', 5, 'MSAA-CM5.1',
   'Parent education and engagement',
   'The school provides structured Montessori parent education and fosters family engagement.',
   NULL),
  (gen_random_uuid(), NULL, 'msaa', 'Community', 5, 'MSAA-CM5.2',
   'Connection to wider Montessori community',
   'The school participates in the broader Australian Montessori community (MSAA events, networks).',
   NULL)
ON CONFLICT DO NOTHING;
