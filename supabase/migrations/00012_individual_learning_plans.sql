-- ============================================================
-- WattleOS V2 — Migration 00012: Individual Learning Plans (Module Q)
-- ============================================================
-- Formal learning plans for children with additional needs.
-- Goals, strategies, review cycles, allied health integration,
-- evidence linking, and transition-to-school statements.
--
-- Regulatory basis:
--   • NQS QA1 (Educational Program), QA5 (Relationships),
--     QA6 (Collaborative Partnerships)
--   • Disability Discrimination Act 1992
--   • Inclusion Support Programme (ISP)
--   • EYLF v2.0 — Transition to School Statements
--   • National Regulations 73–76
--
-- Tables:
--   individual_learning_plans    — plan document per child
--   ilp_goals                    — SMART goals within a plan
--   ilp_strategies               — teaching strategies per goal
--   ilp_reviews                  — scheduled review records
--   ilp_collaborators            — allied health + family team
--   ilp_evidence                 — linked evidence items
--   transition_statements        — transition-to-school docs
-- ============================================================


-- ============================================================
-- TABLE: individual_learning_plans
-- ============================================================
-- The core plan document for a child with additional needs.
-- One active plan per child at a time (enforced in app layer).
-- Status lifecycle: draft → active → in_review → completed → archived
-- ============================================================

CREATE TABLE individual_learning_plans (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Subject child
  student_id                      UUID NOT NULL REFERENCES students(id),

  -- Plan metadata
  plan_title                      TEXT NOT NULL,
  plan_status                     TEXT NOT NULL DEFAULT 'draft'
    CHECK (plan_status IN ('draft', 'active', 'in_review', 'completed', 'archived')),

  -- Support context (array for multi-need children)
  support_categories              TEXT[] NOT NULL DEFAULT '{}',

  -- Funding
  funding_source                  TEXT
    CHECK (funding_source IS NULL OR funding_source IN (
      'inclusion_support_programme', 'ndis', 'state_disability',
      'school_funded', 'none', 'other'
    )),
  funding_reference               TEXT,

  -- Key dates
  start_date                      DATE NOT NULL,
  review_due_date                 DATE,
  next_review_date                DATE,
  end_date                        DATE,

  -- Context narrative
  child_strengths                 TEXT,
  child_interests                 TEXT,
  background_information          TEXT,
  family_goals                    TEXT,

  -- Parent/guardian consent
  parent_consent_given            BOOLEAN NOT NULL DEFAULT false,
  parent_consent_date             DATE,
  parent_consent_by               TEXT,

  -- Meta
  created_by                      UUID NOT NULL REFERENCES users(id),
  updated_by                      UUID REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_ilp_tenant_student
  ON individual_learning_plans (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ilp_tenant_status
  ON individual_learning_plans (tenant_id, plan_status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_ilp_review_due
  ON individual_learning_plans (tenant_id, review_due_date)
  WHERE deleted_at IS NULL AND plan_status IN ('active', 'in_review');

CREATE INDEX idx_ilp_support_categories
  ON individual_learning_plans USING GIN (support_categories)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('individual_learning_plans');

ALTER TABLE individual_learning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON individual_learning_plans
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON individual_learning_plans
  FOR SELECT USING (is_guardian_of(student_id));


-- ============================================================
-- TABLE: ilp_goals
-- ============================================================
-- SMART goals within a plan. Each goal targets a developmental
-- domain and optionally maps to EYLF outcomes.
-- Status: not_started → in_progress → achieved | modified | discontinued
-- ============================================================

CREATE TABLE ilp_goals (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  plan_id                         UUID NOT NULL REFERENCES individual_learning_plans(id) ON DELETE CASCADE,

  -- Goal content
  goal_title                      TEXT NOT NULL,
  goal_description                TEXT,
  developmental_domain            TEXT NOT NULL
    CHECK (developmental_domain IN (
      'communication', 'social_emotional', 'cognitive', 'physical',
      'self_help', 'play', 'behaviour', 'sensory', 'fine_motor',
      'gross_motor', 'literacy', 'numeracy', 'other'
    )),
  eylf_outcome_ids                TEXT[] NOT NULL DEFAULT '{}',

  -- Status
  goal_status                     TEXT NOT NULL DEFAULT 'not_started'
    CHECK (goal_status IN ('not_started', 'in_progress', 'achieved', 'modified', 'discontinued')),

  -- Priority
  priority                        TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),

  -- Target & progress
  target_date                     DATE,
  baseline_notes                  TEXT,
  success_criteria                TEXT,

  -- Ordering
  sort_order                      INT NOT NULL DEFAULT 0,

  -- Meta
  created_by                      UUID NOT NULL REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_ilp_goals_plan
  ON ilp_goals (tenant_id, plan_id)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('ilp_goals');

ALTER TABLE ilp_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ilp_goals
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON ilp_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM individual_learning_plans p
      WHERE p.id = ilp_goals.plan_id
        AND is_guardian_of(p.student_id)
    )
  );


-- ============================================================
-- TABLE: ilp_strategies
-- ============================================================
-- Teaching strategies and adjustments linked to a goal.
-- Each strategy describes HOW the goal will be worked towards.
-- ============================================================

CREATE TABLE ilp_strategies (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  goal_id                         UUID NOT NULL REFERENCES ilp_goals(id) ON DELETE CASCADE,

  -- Strategy content
  strategy_description            TEXT NOT NULL,
  strategy_type                   TEXT NOT NULL DEFAULT 'environmental'
    CHECK (strategy_type IN (
      'environmental', 'instructional', 'behavioural', 'therapeutic',
      'assistive_technology', 'social', 'communication', 'sensory', 'other'
    )),

  -- Who implements
  responsible_role                TEXT,
  responsible_user_id             UUID REFERENCES users(id),

  -- Frequency
  implementation_frequency        TEXT,

  -- State
  is_active                       BOOLEAN NOT NULL DEFAULT true,

  -- Ordering
  sort_order                      INT NOT NULL DEFAULT 0,

  -- Meta
  created_by                      UUID NOT NULL REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_ilp_strategies_goal
  ON ilp_strategies (tenant_id, goal_id)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('ilp_strategies');

ALTER TABLE ilp_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ilp_strategies
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON ilp_strategies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ilp_goals g
      JOIN individual_learning_plans p ON p.id = g.plan_id
      WHERE g.id = ilp_strategies.goal_id
        AND is_guardian_of(p.student_id)
    )
  );


-- ============================================================
-- TABLE: ilp_reviews
-- ============================================================
-- Formal review records. Each review captures overall progress
-- and per-goal progress snapshots. ISP requires at minimum
-- quarterly reviews.
-- ============================================================

CREATE TABLE ilp_reviews (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  plan_id                         UUID NOT NULL REFERENCES individual_learning_plans(id) ON DELETE CASCADE,

  -- Review metadata
  review_type                     TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (review_type IN ('scheduled', 'interim', 'transition', 'annual', 'parent_requested')),
  review_date                     DATE NOT NULL,

  -- Attendees
  attendees                       TEXT[] NOT NULL DEFAULT '{}',
  parent_attended                 BOOLEAN NOT NULL DEFAULT false,

  -- Content
  overall_progress                TEXT NOT NULL DEFAULT 'progressing'
    CHECK (overall_progress IN (
      'significant_progress', 'progressing', 'minimal_progress',
      'regression', 'maintaining'
    )),
  summary_notes                   TEXT,
  family_feedback                 TEXT,
  next_steps                      TEXT,

  -- Per-goal snapshots
  -- Shape: [{ "goal_id": UUID, "progress_rating": string, "notes": string }]
  goal_updates                    JSONB NOT NULL DEFAULT '[]',

  -- Updated dates pushed to plan
  new_review_due_date             DATE,

  -- Meta
  conducted_by                    UUID NOT NULL REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ilp_reviews_plan
  ON ilp_reviews (tenant_id, plan_id);

SELECT apply_updated_at_trigger('ilp_reviews');

ALTER TABLE ilp_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ilp_reviews
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON ilp_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM individual_learning_plans p
      WHERE p.id = ilp_reviews.plan_id
        AND is_guardian_of(p.student_id)
    )
  );


-- ============================================================
-- TABLE: ilp_collaborators
-- ============================================================
-- Allied health professionals, family members, and internal
-- staff involved in a child's plan. External professionals
-- use text fields; internal users have an optional FK.
-- ============================================================

CREATE TABLE ilp_collaborators (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  plan_id                         UUID NOT NULL REFERENCES individual_learning_plans(id) ON DELETE CASCADE,

  -- Identity (text for external professionals)
  collaborator_name               TEXT NOT NULL,
  collaborator_role               TEXT NOT NULL
    CHECK (collaborator_role IN (
      'speech_pathologist', 'occupational_therapist', 'physiotherapist',
      'psychologist', 'behavioural_therapist', 'paediatrician',
      'special_educator', 'social_worker', 'parent', 'guardian',
      'lead_educator', 'coordinator', 'other'
    )),
  organisation                    TEXT,
  email                           TEXT,
  phone                           TEXT,

  -- Internal user link (if staff or parent in system)
  user_id                         UUID REFERENCES users(id),

  -- State
  is_active                       BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ilp_collaborators_plan
  ON ilp_collaborators (tenant_id, plan_id);

SELECT apply_updated_at_trigger('ilp_collaborators');

ALTER TABLE ilp_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ilp_collaborators
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON ilp_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM individual_learning_plans p
      WHERE p.id = ilp_collaborators.plan_id
        AND is_guardian_of(p.student_id)
    )
  );


-- ============================================================
-- TABLE: ilp_evidence
-- ============================================================
-- Evidence items linked to a plan, goal, or review. Can be
-- a reference to an existing observation, an uploaded file,
-- or an allied health report.
-- ============================================================

CREATE TABLE ilp_evidence (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Linked to plan, optionally to goal or review
  plan_id                         UUID NOT NULL REFERENCES individual_learning_plans(id) ON DELETE CASCADE,
  goal_id                         UUID REFERENCES ilp_goals(id) ON DELETE SET NULL,
  review_id                       UUID REFERENCES ilp_reviews(id) ON DELETE SET NULL,

  -- Evidence type
  evidence_type                   TEXT NOT NULL
    CHECK (evidence_type IN (
      'observation', 'photo', 'document', 'assessment_result',
      'allied_health_report', 'work_sample', 'video', 'other'
    )),

  -- Link to existing observation (if type = 'observation')
  observation_id                  UUID REFERENCES observations(id) ON DELETE SET NULL,

  -- File-based evidence
  title                           TEXT NOT NULL,
  description                     TEXT,
  file_url                        TEXT,
  file_name                       TEXT,

  -- Meta
  attached_by                     UUID NOT NULL REFERENCES users(id),
  attached_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ilp_evidence_plan
  ON ilp_evidence (tenant_id, plan_id);

CREATE INDEX idx_ilp_evidence_goal
  ON ilp_evidence (tenant_id, goal_id)
  WHERE goal_id IS NOT NULL;

ALTER TABLE ilp_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON ilp_evidence
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON ilp_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM individual_learning_plans p
      WHERE p.id = ilp_evidence.plan_id
        AND is_guardian_of(p.student_id)
    )
  );


-- ============================================================
-- TABLE: transition_statements
-- ============================================================
-- Transition-to-school statements required under EYLF v2.0
-- and NQS QA6.2 for ALL children in their year before school.
-- Separate from ILP because non-ILP children also need one.
-- Unique per (tenant, student, year).
--
-- Status: draft → in_progress → ready_for_family
--         → shared_with_school → completed
-- ============================================================

CREATE TABLE transition_statements (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  student_id                      UUID NOT NULL REFERENCES students(id),

  -- Optional link to existing ILP
  plan_id                         UUID REFERENCES individual_learning_plans(id) ON DELETE SET NULL,

  -- Content
  statement_year                  INT NOT NULL,
  transition_status               TEXT NOT NULL DEFAULT 'draft'
    CHECK (transition_status IN (
      'draft', 'in_progress', 'ready_for_family',
      'shared_with_school', 'completed'
    )),

  -- EYLF outcome area summaries
  identity_summary                TEXT,
  community_summary               TEXT,
  wellbeing_summary               TEXT,
  learning_summary                TEXT,
  communication_summary           TEXT,

  -- Additional context
  strengths_summary               TEXT,
  interests_summary               TEXT,
  approaches_to_learning          TEXT,
  additional_needs_summary        TEXT,
  family_input                    TEXT,
  educator_recommendations        TEXT,
  receiving_school_name           TEXT,
  receiving_school_contact        TEXT,

  -- Sharing workflow
  shared_with_family_at           TIMESTAMPTZ,
  shared_with_school_at           TIMESTAMPTZ,
  family_approved                 BOOLEAN NOT NULL DEFAULT false,
  family_approved_at              TIMESTAMPTZ,

  -- Meta
  created_by                      UUID NOT NULL REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_transition_statement_student_year
  ON transition_statements (tenant_id, student_id, statement_year)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('transition_statements');

ALTER TABLE transition_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON transition_statements
  FOR ALL USING (tenant_id = current_tenant_id());

CREATE POLICY "Guardian read access" ON transition_statements
  FOR SELECT USING (is_guardian_of(student_id));


-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_ilp',                    'Manage Learning Plans',           'learning_plans', 'Create, edit, and archive Individual Learning Plans'),
  ('view_ilp',                      'View Learning Plans',             'learning_plans', 'View ILPs, goals, strategies, and reviews (read-only)'),
  ('manage_transition_statements',  'Manage Transition Statements',    'learning_plans', 'Create and share transition-to-school statements')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- BACKFILL ROLE PERMISSIONS FOR EXISTING TENANTS
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

    -- Owner + Admin: auto-covered (wildcard selects pick up new rows)

    -- Head of School: all learning plan permissions
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module = 'learning_plans'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Lead Guide: manage + view ILP (not transition statements by default)
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.key IN ('manage_ilp', 'view_ilp')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Guide: manage + view ILP
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.key IN ('manage_ilp', 'view_ilp')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Assistant: view only
    SELECT id INTO v_assistant FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Assistant' AND is_system = true;

    IF v_assistant IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_assistant, p.id
      FROM permissions p
      WHERE p.key = 'view_ilp'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;


-- ============================================================
-- UPDATE seed_tenant_roles() FOR FUTURE TENANTS
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

  -- Head of School: all pedagogy + sis + attendance + comms + all compliance + rostering + learning plans
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_head_role_id, p.id
  FROM permissions p
  WHERE p.module IN (
    'pedagogy', 'sis', 'attendance', 'comms',
    'incidents', 'medication', 'staff_compliance', 'ratios',
    'qip', 'immunisation', 'ccs', 'excursions', 'compliance',
    'lesson_tracking', 'mqap',
    'emergency_drills',
    'emergency_coordination',
    'rostering',
    'learning_plans'
  );

  -- Lead Guide: core classroom + operational compliance + rostering + learning plans
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
    'view_mqap',
    -- Emergency Drills
    'manage_emergency_drills', 'view_emergency_drills',
    -- Emergency Coordination
    'coordinate_emergency', 'view_emergency_coordination',
    -- Rostering
    'manage_roster', 'view_roster', 'manage_leave',
    'request_leave', 'request_shift_swap', 'manage_coverage',
    -- Learning Plans
    'manage_ilp', 'view_ilp'
  );

  -- Guide: classroom essentials + floor compliance + self-service rostering + learning plans
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
    'view_excursions',
    -- Emergency Drills
    'view_emergency_drills',
    -- Emergency Coordination
    'coordinate_emergency', 'view_emergency_coordination',
    -- Rostering
    'view_roster', 'request_leave', 'request_shift_swap', 'accept_coverage',
    -- Learning Plans
    'manage_ilp', 'view_ilp'
  );

  -- Assistant: minimal access + basic rostering + view learning plans
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_assistant_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'view_students', 'manage_attendance',
    'view_classes',
    -- Compliance
    'create_incident',
    'manage_floor_signin',
    -- Emergency Coordination
    'view_emergency_coordination',
    -- Rostering
    'view_roster', 'request_leave', 'accept_coverage',
    -- Learning Plans
    'view_ilp'
  );

  -- Parent: no explicit permissions (uses is_guardian_of() in RLS)

  RETURN NEW;
END;
$$;
