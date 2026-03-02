-- ============================================================
-- WattleOS V2 — Migration 00007: Emergency Drill Tracking (Module L)
-- ============================================================
-- Regulation 97 — Emergency and evacuation procedures
-- NQS Quality Area 2.2 — Safety
--
-- Services must:
--   • Have written emergency/evacuation procedures
--   • Practise procedures regularly (monthly recommended)
--   • Record drill details, outcomes, and corrective actions
--   • Make records available during A&R visits
--
-- Tables:
--   emergency_drills              — master record per drill
--   emergency_drill_participants  — per-child headcount verification
-- ============================================================


-- ============================================================
-- TABLE: emergency_drills
-- ============================================================

CREATE TABLE emergency_drills (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Type & scenario
  drill_type                      TEXT NOT NULL
    CHECK (drill_type IN ('fire_evacuation', 'lockdown', 'shelter_in_place', 'medical_emergency', 'other')),
  drill_type_other                TEXT,
  scenario_description            TEXT,

  -- Status workflow: scheduled → in_progress → completed (or cancelled)
  status                          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

  -- Scheduling
  scheduled_date                  DATE NOT NULL,
  scheduled_time                  TIME,

  -- Execution timing
  actual_start_at                 TIMESTAMPTZ,
  actual_end_at                   TIMESTAMPTZ,
  evacuation_time_seconds         INT,

  -- Location
  assembly_point                  TEXT,
  location_notes                  TEXT,

  -- Participation scope
  is_whole_of_service             BOOLEAN NOT NULL DEFAULT false,
  participating_class_ids         UUID[] NOT NULL DEFAULT '{}',
  staff_participant_ids           UUID[] NOT NULL DEFAULT '{}',

  -- Post-drill debrief (inline — always 1:1 with drill)
  effectiveness_rating            TEXT
    CHECK (effectiveness_rating IN ('poor', 'fair', 'good', 'excellent')),
  issues_observed                 TEXT,
  corrective_actions              TEXT,
  follow_up_required              BOOLEAN NOT NULL DEFAULT false,
  follow_up_notes                 TEXT,
  follow_up_completed_at          TIMESTAMPTZ,
  debrief_conducted_by            UUID REFERENCES users(id),
  debrief_notes                   TEXT,

  -- Meta
  notes                           TEXT,
  initiated_by                    UUID REFERENCES users(id),
  created_by                      UUID REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_emergency_drills_tenant_date
  ON emergency_drills (tenant_id, scheduled_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_emergency_drills_tenant_type
  ON emergency_drills (tenant_id, drill_type)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_emergency_drills_tenant_status
  ON emergency_drills (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_emergency_drills_class_ids
  ON emergency_drills USING GIN (participating_class_ids);

CREATE INDEX idx_emergency_drills_staff_ids
  ON emergency_drills USING GIN (staff_participant_ids);

SELECT apply_updated_at_trigger('emergency_drills');

ALTER TABLE emergency_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_drills
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: emergency_drill_participants
-- ============================================================

CREATE TABLE emergency_drill_participants (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  drill_id                        UUID NOT NULL REFERENCES emergency_drills(id) ON DELETE CASCADE,
  student_id                      UUID NOT NULL REFERENCES students(id),

  -- Headcount verification
  accounted_for                   BOOLEAN NOT NULL DEFAULT false,
  accounted_at                    TIMESTAMPTZ,
  assembly_time_seconds           INT,

  -- Response notes
  response_notes                  TEXT,
  needed_assistance               BOOLEAN NOT NULL DEFAULT false,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, drill_id, student_id)
);

-- Indexes
CREATE INDEX idx_drill_participants_drill
  ON emergency_drill_participants (tenant_id, drill_id);

CREATE INDEX idx_drill_participants_student
  ON emergency_drill_participants (tenant_id, student_id);

ALTER TABLE emergency_drill_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_drill_participants
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_emergency_drills', 'Manage Emergency Drills', 'emergency_drills', 'Create, edit, execute, and debrief emergency drills'),
  ('view_emergency_drills',   'View Emergency Drills',   'emergency_drills', 'View emergency drill records, compliance dashboard, and history')
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
BEGIN
  FOR r_tenant IN SELECT id FROM tenants LOOP

    -- Owner + Admin: auto-covered (wildcard selects pick up new rows)

    -- Head of School: both manage + view
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module = 'emergency_drills'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Lead Guide: both manage + view
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.key IN ('manage_emergency_drills', 'view_emergency_drills')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Guide: view only
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.key = 'view_emergency_drills'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Assistant: no emergency drill permissions

  END LOOP;
END;
$$;


-- ============================================================
-- UPDATE seed_tenant_roles() FOR FUTURE TENANTS
-- ============================================================
-- Re-define the trigger function so new schools provisioned after
-- this migration automatically receive emergency drill permissions.
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
    'lesson_tracking', 'mqap',
    'emergency_drills'
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
    'view_mqap',
    -- Emergency Drills
    'manage_emergency_drills', 'view_emergency_drills'
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
    'view_excursions',
    -- Emergency Drills
    'view_emergency_drills'
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
