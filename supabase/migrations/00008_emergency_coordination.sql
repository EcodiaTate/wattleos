-- ============================================================
-- WattleOS V2 — Migration 00008: Live Emergency Coordination (Module M)
-- ============================================================
-- Real-time emergency coordination system for lockdowns, fire
-- evacuations, shelter-in-place, and medical emergencies.
--
-- Extends Module L (drill tracking) with live coordination:
--   • One-tap emergency activation with instant staff alerts
--   • Zone-by-zone warden status reporting
--   • Class-by-class student accountability (live roll call)
--   • Staff check-in and role assignment
--   • Append-only event timeline
--   • All-clear declaration and post-event reporting
--
-- Tables:
--   emergency_zones                 — pre-configured zones/assembly points
--   emergency_events                — active/historical emergency events
--   emergency_event_zones           — per-zone status during an event
--   emergency_student_accountability — per-student headcount during event
--   emergency_staff_accountability  — per-staff check-in during event
--   emergency_event_log             — append-only event timeline
-- ============================================================


-- ============================================================
-- TABLE: emergency_zones
-- ============================================================
-- Pre-configured zones and assembly points with warden
-- assignments. These are set up in advance so that when an
-- emergency is activated, zone rows are auto-seeded.
-- ============================================================

CREATE TABLE emergency_zones (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Zone details
  name                            TEXT NOT NULL,
  description                     TEXT,
  zone_type                       TEXT NOT NULL
    CHECK (zone_type IN ('indoor', 'outdoor', 'assembly_point')),
  location_details                TEXT,

  -- Warden assignments (default — actual warden during event stored in emergency_event_zones)
  primary_warden_id               UUID REFERENCES users(id),
  backup_warden_ids               UUID[] NOT NULL DEFAULT '{}',

  -- Capacity
  capacity                        INT,

  -- Ordering & state
  sort_order                      INT NOT NULL DEFAULT 0,
  is_active                       BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_emergency_zones_tenant_sort
  ON emergency_zones (tenant_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_emergency_zones_tenant_active
  ON emergency_zones (tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_emergency_zones_backup_wardens
  ON emergency_zones USING GIN (backup_warden_ids);

SELECT apply_updated_at_trigger('emergency_zones');

ALTER TABLE emergency_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_zones
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: emergency_events
-- ============================================================
-- The core event record. Tracks status from activation through
-- all-clear to resolution. Only ONE event can be active per
-- tenant at a time (enforced via partial unique index).
-- ============================================================

CREATE TABLE emergency_events (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Type (reuses drill types for consistency)
  event_type                      TEXT NOT NULL
    CHECK (event_type IN ('fire_evacuation', 'lockdown', 'shelter_in_place', 'medical_emergency', 'other')),
  event_type_other                TEXT,

  -- Severity
  severity                        TEXT NOT NULL DEFAULT 'high'
    CHECK (severity IN ('critical', 'high', 'medium')),

  -- Status workflow: activated → responding → all_clear → resolved (side exit: cancelled)
  status                          TEXT NOT NULL DEFAULT 'activated'
    CHECK (status IN ('activated', 'responding', 'all_clear', 'resolved', 'cancelled')),

  -- Activation
  activated_by                    UUID NOT NULL REFERENCES users(id),
  activated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- All clear
  all_clear_by                    UUID REFERENCES users(id),
  all_clear_at                    TIMESTAMPTZ,

  -- Resolution
  resolved_at                     TIMESTAMPTZ,
  resolved_by                     UUID REFERENCES users(id),

  -- Cancellation
  cancelled_at                    TIMESTAMPTZ,
  cancelled_by                    UUID REFERENCES users(id),

  -- Details
  location_description            TEXT,
  instructions                    TEXT,
  assembly_point                  TEXT,
  notes                           TEXT,

  -- Link to scheduled drill (if this event is a drill execution)
  linked_drill_id                 UUID REFERENCES emergency_drills(id),

  -- Expected headcounts (set on activation)
  total_students_expected         INT NOT NULL DEFAULT 0,
  total_staff_expected            INT NOT NULL DEFAULT 0,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_emergency_events_tenant_status
  ON emergency_events (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_emergency_events_tenant_activated
  ON emergency_events (tenant_id, activated_at DESC)
  WHERE deleted_at IS NULL;

-- CRITICAL: Only one active emergency per tenant at a time.
-- Prevents accidental double-activations and simplifies queries.
CREATE UNIQUE INDEX idx_emergency_events_one_active
  ON emergency_events (tenant_id)
  WHERE status IN ('activated', 'responding') AND deleted_at IS NULL;

SELECT apply_updated_at_trigger('emergency_events');

ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_events
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: emergency_event_zones
-- ============================================================
-- Per-zone status during an active event. Seeded from
-- emergency_zones when an event is activated. Wardens report
-- zone status (clear, needs assistance, blocked).
-- ============================================================

CREATE TABLE emergency_event_zones (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  event_id                        UUID NOT NULL REFERENCES emergency_events(id) ON DELETE CASCADE,
  zone_id                         UUID NOT NULL REFERENCES emergency_zones(id),

  -- Warden assigned during this event (copied from zone default, can be changed)
  warden_id                       UUID REFERENCES users(id),

  -- Zone status during event
  status                          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'evacuating', 'clear', 'needs_assistance', 'blocked')),
  reported_at                     TIMESTAMPTZ,
  notes                           TEXT,
  headcount_reported              INT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, event_id, zone_id)
);

-- Indexes
CREATE INDEX idx_emergency_event_zones_event
  ON emergency_event_zones (tenant_id, event_id);

SELECT apply_updated_at_trigger('emergency_event_zones');

ALTER TABLE emergency_event_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_event_zones
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: emergency_student_accountability
-- ============================================================
-- Per-student accountability during an event. Seeded from
-- active enrollments on activation. Staff perform roll call
-- by marking students as accounted for.
-- ============================================================

CREATE TABLE emergency_student_accountability (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  event_id                        UUID NOT NULL REFERENCES emergency_events(id) ON DELETE CASCADE,
  student_id                      UUID NOT NULL REFERENCES students(id),

  -- Class for grouping (from enrollment at time of activation)
  class_id                        UUID REFERENCES classes(id),

  -- Zone where student was found (optional)
  zone_id                         UUID REFERENCES emergency_zones(id),

  -- Accountability
  accounted_for                   BOOLEAN NOT NULL DEFAULT false,
  accounted_by                    UUID REFERENCES users(id),
  accounted_at                    TIMESTAMPTZ,
  method                          TEXT
    CHECK (method IN ('visual', 'roll_call', 'parent_collected', 'absent_prior')),
  notes                           TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, event_id, student_id)
);

-- Indexes: fast "who's unaccounted" + class-by-class roll call
CREATE INDEX idx_emergency_student_acct_event_status
  ON emergency_student_accountability (tenant_id, event_id, accounted_for);

CREATE INDEX idx_emergency_student_acct_event_class
  ON emergency_student_accountability (tenant_id, event_id, class_id);

SELECT apply_updated_at_trigger('emergency_student_accountability');

ALTER TABLE emergency_student_accountability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_student_accountability
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: emergency_staff_accountability
-- ============================================================
-- Per-staff check-in during an event. Seeded from active
-- tenant members on activation. Staff can self-check-in or
-- coordinators can mark them.
-- ============================================================

CREATE TABLE emergency_staff_accountability (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  event_id                        UUID NOT NULL REFERENCES emergency_events(id) ON DELETE CASCADE,
  user_id                         UUID NOT NULL REFERENCES users(id),

  -- Zone where staff member is (optional)
  zone_id                         UUID REFERENCES emergency_zones(id),

  -- Accountability
  accounted_for                   BOOLEAN NOT NULL DEFAULT false,
  accounted_at                    TIMESTAMPTZ,

  -- Role during event
  role_during_event               TEXT
    CHECK (role_during_event IN ('warden', 'first_aid', 'coordinator', 'evacuator', 'general')),

  -- Status
  status                          TEXT NOT NULL DEFAULT 'responding'
    CHECK (status IN ('responding', 'at_assembly', 'assisting', 'off_site')),

  notes                           TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, event_id, user_id)
);

-- Indexes
CREATE INDEX idx_emergency_staff_acct_event_status
  ON emergency_staff_accountability (tenant_id, event_id, accounted_for);

SELECT apply_updated_at_trigger('emergency_staff_accountability');

ALTER TABLE emergency_staff_accountability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_staff_accountability
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: emergency_event_log
-- ============================================================
-- Append-only timeline of all actions during an event.
-- No updated_at or deleted_at — immutable audit trail.
-- ============================================================

CREATE TABLE emergency_event_log (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  event_id                        UUID NOT NULL REFERENCES emergency_events(id) ON DELETE CASCADE,
  user_id                         UUID REFERENCES users(id),

  -- Action type
  action                          TEXT NOT NULL
    CHECK (action IN (
      'event_activated', 'event_status_changed', 'zone_cleared',
      'zone_needs_assistance', 'student_accounted', 'staff_accounted',
      'all_clear_declared', 'event_resolved', 'event_cancelled',
      'announcement_sent', 'note_added', 'warden_assigned',
      'bulk_students_accounted'
    )),

  -- Human-readable message
  message                         TEXT NOT NULL,

  -- Structured metadata
  metadata                        JSONB DEFAULT '{}',

  -- Immutable timestamp
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_emergency_event_log_event_time
  ON emergency_event_log (tenant_id, event_id, created_at DESC);

ALTER TABLE emergency_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON emergency_event_log
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  ('activate_emergency',           'Activate Emergency',           'emergency_coordination', 'Activate, deactivate, and resolve live emergency events'),
  ('coordinate_emergency',         'Coordinate Emergency',         'emergency_coordination', 'Act as warden, perform roll calls, and report zone status during emergencies'),
  ('view_emergency_coordination',  'View Emergency Coordination',  'emergency_coordination', 'View the live coordination panel and emergency event history')
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

    -- Head of School: all 3 permissions
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module = 'emergency_coordination'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Lead Guide: coordinate + view
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.key IN ('coordinate_emergency', 'view_emergency_coordination')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Guide: coordinate + view (guides must be able to do roll calls)
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.key IN ('coordinate_emergency', 'view_emergency_coordination')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Assistant: view only
    SELECT id INTO v_assistant FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Assistant' AND is_system = true;

    IF v_assistant IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_assistant, p.id
      FROM permissions p
      WHERE p.key = 'view_emergency_coordination'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;


-- ============================================================
-- UPDATE seed_tenant_roles() FOR FUTURE TENANTS
-- ============================================================
-- Re-define the trigger function so new schools provisioned after
-- this migration automatically receive emergency coordination
-- permissions. Owner/Admin already use wildcard selects.
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
    'emergency_drills',
    'emergency_coordination'
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
    'manage_emergency_drills', 'view_emergency_drills',
    -- Emergency Coordination
    'coordinate_emergency', 'view_emergency_coordination'
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
    'view_emergency_drills',
    -- Emergency Coordination
    'coordinate_emergency', 'view_emergency_coordination'
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
    'manage_floor_signin',
    -- Emergency Coordination
    'view_emergency_coordination'
  );

  -- Parent: no explicit permissions (uses is_guardian_of() in RLS)

  RETURN NEW;
END;
$$;
