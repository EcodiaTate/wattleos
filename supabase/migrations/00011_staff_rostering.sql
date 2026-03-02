-- ============================================================
-- WattleOS V2 — Migration 00011: Staff Rostering & Relief (Module N)
-- ============================================================
-- Complete staff rostering, shift management, leave workflow,
-- shift swaps, and relief/casual staff coverage system.
--
-- Builds on top of:
--   • staff_profiles (Module 15) — employment type, qualifications
--   • staff_compliance_records (Module C) — WWCC, First Aid, etc.
--   • pay_periods / time_entries (Module 9) — timesheet integration
--   • classes (Module 5) — room/group assignment for shifts
--
-- Tables:
--   roster_templates          — reusable weekly shift patterns
--   roster_template_shifts    — individual shift slots in templates
--   roster_weeks              — published roster for a specific week
--   shifts                    — concrete shift assignments per date
--   staff_availability        — recurring + one-off availability
--   leave_requests            — formal leave request workflow
--   shift_swap_requests       — peer-to-peer swap with mgr approval
--   shift_coverage_requests   — broadcast open shifts to relief pool
-- ============================================================


-- ============================================================
-- TABLE: roster_templates
-- ============================================================
-- Reusable weekly roster patterns (e.g., "Term 1 Standard",
-- "Vacation Care Week"). A template is a named container; the
-- actual shift patterns live in roster_template_shifts.
-- Templates can be applied to generate concrete roster_weeks.
-- ============================================================

CREATE TABLE roster_templates (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Identity
  name                            TEXT NOT NULL,
  description                     TEXT,

  -- Scope: which program/class group this template covers
  -- NULL = whole-of-service (all rooms)
  program_id                      UUID REFERENCES programs(id),

  -- Effective date range (e.g., Term 1 2026)
  effective_from                  DATE,
  effective_until                 DATE,

  -- State
  is_active                       BOOLEAN NOT NULL DEFAULT true,

  -- Meta
  created_by                      UUID NOT NULL REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_roster_templates_tenant_active
  ON roster_templates (tenant_id, is_active)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('roster_templates');

ALTER TABLE roster_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON roster_templates
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: roster_template_shifts
-- ============================================================
-- Individual shift slots inside a template. day_of_week is
-- 1=Mon through 7=Sun (ISO 8601). A template might have 40+
-- rows: 8 staff × 5 weekdays.
-- ============================================================

CREATE TABLE roster_template_shifts (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  template_id                     UUID NOT NULL REFERENCES roster_templates(id) ON DELETE CASCADE,

  -- Who
  user_id                         UUID NOT NULL REFERENCES users(id),

  -- When (recurring pattern)
  day_of_week                     INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time                      TIME NOT NULL,
  end_time                        TIME NOT NULL,
  break_minutes                   INT NOT NULL DEFAULT 30 CHECK (break_minutes >= 0),

  -- Where
  class_id                        UUID REFERENCES classes(id),

  -- Shift role context
  shift_role                      TEXT NOT NULL DEFAULT 'general'
    CHECK (shift_role IN ('lead', 'co_educator', 'general', 'float', 'admin', 'kitchen', 'maintenance')),

  -- Notes (e.g., "Opens building", "Responsible for 0-2 room setup")
  notes                           TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ,

  -- Prevent duplicate shifts for same person same day same time in same template
  CONSTRAINT uq_template_shift_person_day_time
    UNIQUE (tenant_id, template_id, user_id, day_of_week, start_time)
);

CREATE INDEX idx_roster_template_shifts_template
  ON roster_template_shifts (tenant_id, template_id)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('roster_template_shifts');

ALTER TABLE roster_template_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON roster_template_shifts
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: roster_weeks
-- ============================================================
-- A concrete roster for a specific Monday-to-Sunday week.
-- Generated from a template or created manually. Publishing
-- notifies all staff. Only one roster_week per tenant per
-- week_start_date (enforced by unique index).
-- ============================================================

CREATE TABLE roster_weeks (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- The Monday that starts this roster week
  week_start_date                 DATE NOT NULL,

  -- Source template (NULL if manually created)
  template_id                     UUID REFERENCES roster_templates(id),

  -- Status workflow: draft → published → locked
  status                          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'locked')),

  -- Publication
  published_at                    TIMESTAMPTZ,
  published_by                    UUID REFERENCES users(id),

  -- Notes (e.g., "Short week - public holiday Friday")
  notes                           TEXT,

  -- Meta
  created_by                      UUID NOT NULL REFERENCES users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

-- One roster per week per tenant
CREATE UNIQUE INDEX idx_roster_weeks_tenant_week
  ON roster_weeks (tenant_id, week_start_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_roster_weeks_tenant_status
  ON roster_weeks (tenant_id, status)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('roster_weeks');

ALTER TABLE roster_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON roster_weeks
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: shifts
-- ============================================================
-- A concrete shift for a specific person on a specific date.
-- Linked to a roster_week. This is the "ground truth" that
-- staff see in their schedule and that generates expected
-- timesheet hours.
--
-- Status tracks the actual outcome of the shift.
-- ============================================================

CREATE TABLE shifts (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  roster_week_id                  UUID NOT NULL REFERENCES roster_weeks(id) ON DELETE CASCADE,

  -- Who
  user_id                         UUID NOT NULL REFERENCES users(id),

  -- When
  date                            DATE NOT NULL,
  start_time                      TIME NOT NULL,
  end_time                        TIME NOT NULL,
  break_minutes                   INT NOT NULL DEFAULT 30 CHECK (break_minutes >= 0),

  -- Where
  class_id                        UUID REFERENCES classes(id),

  -- Role during this shift
  shift_role                      TEXT NOT NULL DEFAULT 'general'
    CHECK (shift_role IN ('lead', 'co_educator', 'general', 'float', 'admin', 'kitchen', 'maintenance')),

  -- Status: scheduled → confirmed → completed | cancelled | no_show
  status                          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),

  -- If this shift was created to cover for someone
  covers_for_user_id              UUID REFERENCES users(id),
  coverage_request_id             UUID, -- FK added after shift_coverage_requests is created

  -- Computed expected hours (end - start - break)
  expected_hours                  NUMERIC(5,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0 - break_minutes / 60.0
  ) STORED,

  -- Notes
  notes                           TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ,

  CONSTRAINT chk_shift_times CHECK (end_time > start_time)
);

-- Fast lookups: "what shifts does user X have this week?"
CREATE INDEX idx_shifts_user_date
  ON shifts (tenant_id, user_id, date)
  WHERE deleted_at IS NULL;

-- "who is working in room Y on date Z?"
CREATE INDEX idx_shifts_class_date
  ON shifts (tenant_id, class_id, date)
  WHERE deleted_at IS NULL;

-- "all shifts for this roster week"
CREATE INDEX idx_shifts_roster_week
  ON shifts (tenant_id, roster_week_id)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('shifts');

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON shifts
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: staff_availability
-- ============================================================
-- Two modes:
--   1. Recurring weekly patterns (is_recurring = true):
--      "I'm available Mon-Fri 7:30-18:00 every week"
--      day_of_week is set, specific_date is NULL.
--
--   2. One-off overrides (is_recurring = false):
--      "I'm NOT available on 2026-03-15"
--      specific_date is set, day_of_week is NULL.
--
-- Managers use this to know who can be rostered and who
-- is available for relief coverage.
-- ============================================================

CREATE TABLE staff_availability (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),
  user_id                         UUID NOT NULL REFERENCES users(id),

  -- Pattern type
  is_recurring                    BOOLEAN NOT NULL DEFAULT true,

  -- For recurring: day of week (1=Mon..7=Sun)
  day_of_week                     INT CHECK (day_of_week BETWEEN 1 AND 7),

  -- For one-off: specific date
  specific_date                   DATE,

  -- Availability window (NULL times = unavailable all day)
  is_available                    BOOLEAN NOT NULL DEFAULT true,
  available_from                  TIME,
  available_until                 TIME,

  -- Effective range for recurring patterns
  effective_from                  DATE,
  effective_until                 DATE,

  notes                           TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ,

  -- Validation: recurring needs day_of_week, one-off needs specific_date
  CONSTRAINT chk_availability_type CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL) OR
    (is_recurring = false AND specific_date IS NOT NULL)
  )
);

CREATE INDEX idx_staff_availability_user_recurring
  ON staff_availability (tenant_id, user_id, day_of_week)
  WHERE is_recurring = true AND deleted_at IS NULL;

CREATE INDEX idx_staff_availability_user_specific
  ON staff_availability (tenant_id, user_id, specific_date)
  WHERE is_recurring = false AND deleted_at IS NULL;

SELECT apply_updated_at_trigger('staff_availability');

ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON staff_availability
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: leave_requests
-- ============================================================
-- Formal leave workflow: staff request → manager reviews →
-- approve/reject. Multi-day ranges supported. Approved leave
-- auto-populates timesheet entries and marks shifts for
-- coverage.
--
-- Leave types align with TimeEntryType for integration:
--   sick_leave, annual_leave, unpaid_leave
-- Plus additional types not in timesheets:
--   long_service_leave, parental_leave, compassionate_leave,
--   professional_development
-- ============================================================

CREATE TABLE leave_requests (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- Who is requesting
  user_id                         UUID NOT NULL REFERENCES users(id),

  -- Leave type
  leave_type                      TEXT NOT NULL
    CHECK (leave_type IN (
      'sick_leave', 'annual_leave', 'unpaid_leave',
      'long_service_leave', 'parental_leave',
      'compassionate_leave', 'professional_development',
      'other'
    )),
  leave_type_other                TEXT, -- when leave_type = 'other'

  -- Date range (inclusive)
  start_date                      DATE NOT NULL,
  end_date                        DATE NOT NULL,

  -- Partial day support
  is_partial_day                  BOOLEAN NOT NULL DEFAULT false,
  partial_start_time              TIME, -- if partial, when they leave/arrive
  partial_end_time                TIME,

  -- Calculated leave hours (computed by application on create/update)
  total_leave_hours               NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Status workflow: pending → approved | rejected | cancelled | withdrawn
  status                          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),

  -- Reason / details
  reason                          TEXT,
  supporting_document_url         TEXT, -- e.g., medical certificate

  -- Approval
  reviewed_by                     UUID REFERENCES users(id),
  reviewed_at                     TIMESTAMPTZ,
  reviewer_notes                  TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ,

  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_partial_times CHECK (
    (is_partial_day = false) OR
    (partial_start_time IS NOT NULL AND partial_end_time IS NOT NULL)
  )
);

CREATE INDEX idx_leave_requests_user_dates
  ON leave_requests (tenant_id, user_id, start_date, end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_leave_requests_pending
  ON leave_requests (tenant_id, status)
  WHERE deleted_at IS NULL AND status = 'pending';

CREATE INDEX idx_leave_requests_approved_range
  ON leave_requests (tenant_id, start_date, end_date)
  WHERE deleted_at IS NULL AND status = 'approved';

SELECT apply_updated_at_trigger('leave_requests');

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON leave_requests
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: shift_swap_requests
-- ============================================================
-- Staff A offers to swap their shift with Staff B.
-- Workflow: pending_peer → peer_accepted → pending_approval
--           → approved | rejected
-- Side exits: cancelled (by requester), expired (auto after 48h)
-- ============================================================

CREATE TABLE shift_swap_requests (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- The shift being offered for swap
  offered_shift_id                UUID NOT NULL REFERENCES shifts(id),
  offered_by                      UUID NOT NULL REFERENCES users(id),

  -- The shift being requested in return (NULL = open offer to anyone)
  requested_shift_id              UUID REFERENCES shifts(id),
  requested_from                  UUID REFERENCES users(id),

  -- Status workflow
  status                          TEXT NOT NULL DEFAULT 'pending_peer'
    CHECK (status IN (
      'pending_peer',       -- waiting for the other staff to accept
      'peer_accepted',      -- other staff agreed, waiting for manager
      'pending_approval',   -- both agree, needs manager approval
      'approved',           -- manager approved, shifts swapped
      'rejected',           -- manager rejected
      'cancelled',          -- requester cancelled
      'expired'             -- auto-expired after timeout
    )),

  -- Peer response
  peer_responded_at               TIMESTAMPTZ,

  -- Manager approval
  approved_by                     UUID REFERENCES users(id),
  approved_at                     TIMESTAMPTZ,
  rejection_reason                TEXT,

  -- Reason for swap
  reason                          TEXT,

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_shift_swap_requests_status
  ON shift_swap_requests (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_shift_swap_requests_offered_by
  ON shift_swap_requests (tenant_id, offered_by)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('shift_swap_requests');

ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON shift_swap_requests
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- TABLE: shift_coverage_requests
-- ============================================================
-- When a shift needs filling (sick call, leave, emergency),
-- a coverage request is created. It can be broadcast to the
-- casual pool or offered to specific staff.
--
-- Status: open → offered → accepted → filled | unfilled | cancelled
-- ============================================================

CREATE TABLE shift_coverage_requests (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL REFERENCES tenants(id),

  -- The original shift that needs covering
  original_shift_id               UUID NOT NULL REFERENCES shifts(id),
  original_user_id                UUID NOT NULL REFERENCES users(id),

  -- Reason
  reason                          TEXT NOT NULL
    CHECK (reason IN (
      'sick_call', 'approved_leave', 'emergency',
      'no_show', 'understaffed', 'other'
    )),
  reason_detail                   TEXT,

  -- Linked leave request (if applicable)
  leave_request_id                UUID REFERENCES leave_requests(id),

  -- Status
  status                          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'offered', 'accepted', 'filled', 'unfilled', 'cancelled')),

  -- Broadcast scope
  broadcast_to_all_casuals        BOOLEAN NOT NULL DEFAULT true,
  offered_to_user_ids             UUID[] NOT NULL DEFAULT '{}',

  -- Resolution
  accepted_by                     UUID REFERENCES users(id),
  accepted_at                     TIMESTAMPTZ,
  replacement_shift_id            UUID REFERENCES shifts(id),

  -- Manager who created/resolved
  created_by                      UUID NOT NULL REFERENCES users(id),
  resolved_by                     UUID REFERENCES users(id),
  resolved_at                     TIMESTAMPTZ,

  -- Urgency
  urgency                         TEXT NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high', 'critical')),

  -- Meta
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                      TIMESTAMPTZ
);

CREATE INDEX idx_coverage_requests_open
  ON shift_coverage_requests (tenant_id, status)
  WHERE deleted_at IS NULL AND status IN ('open', 'offered');

CREATE INDEX idx_coverage_requests_date
  ON shift_coverage_requests (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- GIN index for broadcast target lookup
CREATE INDEX idx_coverage_requests_offered_to
  ON shift_coverage_requests USING GIN (offered_to_user_ids);

SELECT apply_updated_at_trigger('shift_coverage_requests');

ALTER TABLE shift_coverage_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON shift_coverage_requests
  FOR ALL USING (tenant_id = current_tenant_id());


-- ============================================================
-- Add deferred FK from shifts.coverage_request_id
-- ============================================================

ALTER TABLE shifts
  ADD CONSTRAINT fk_shifts_coverage_request
  FOREIGN KEY (coverage_request_id) REFERENCES shift_coverage_requests(id);


-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_roster',           'Manage Roster',           'rostering', 'Create, edit, publish, and lock weekly rosters and templates'),
  ('view_roster',             'View Roster',             'rostering', 'View published rosters and own shift schedule'),
  ('manage_leave',            'Manage Leave',            'rostering', 'Approve or reject leave requests from staff'),
  ('request_leave',           'Request Leave',           'rostering', 'Submit leave requests for own schedule'),
  ('request_shift_swap',      'Request Shift Swap',      'rostering', 'Request to swap shifts with another staff member'),
  ('manage_coverage',         'Manage Coverage',         'rostering', 'Create and manage shift coverage requests for relief staff'),
  ('accept_coverage',         'Accept Coverage',         'rostering', 'Accept shift coverage requests (casual/relief pool)')
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

    -- Head of School: all rostering permissions
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module = 'rostering'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Lead Guide: manage_roster + view + manage_leave + manage_coverage + request_leave + request_shift_swap
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.key IN (
        'manage_roster', 'view_roster', 'manage_leave',
        'request_leave', 'request_shift_swap', 'manage_coverage'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Guide: view + request_leave + request_shift_swap + accept_coverage
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.key IN (
        'view_roster', 'request_leave', 'request_shift_swap', 'accept_coverage'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Assistant: view_roster + request_leave + accept_coverage
    SELECT id INTO v_assistant FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Assistant' AND is_system = true;

    IF v_assistant IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_assistant, p.id
      FROM permissions p
      WHERE p.key IN ('view_roster', 'request_leave', 'accept_coverage')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;


-- ============================================================
-- UPDATE seed_tenant_roles() FOR FUTURE TENANTS
-- ============================================================
-- Re-define the trigger function so new schools provisioned
-- after this migration automatically receive rostering
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

  -- Head of School: all pedagogy + sis + attendance + comms + all compliance + rostering
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
    'rostering'
  );

  -- Lead Guide: core classroom + operational compliance + rostering management
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
    'request_leave', 'request_shift_swap', 'manage_coverage'
  );

  -- Guide: classroom essentials + floor compliance + self-service rostering
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
    'view_roster', 'request_leave', 'request_shift_swap', 'accept_coverage'
  );

  -- Assistant: minimal access + basic rostering
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
    'view_roster', 'request_leave', 'accept_coverage'
  );

  -- Parent: no explicit permissions (uses is_guardian_of() in RLS)

  RETURN NEW;
END;
$$;
