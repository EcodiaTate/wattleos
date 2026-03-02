-- ============================================================
-- WattleOS V2 — Migration 00013: Daily Care Log (Module O)
-- ============================================================
-- Mandatory daily care records for children under preschool age.
-- Nappy changes, sleep/rest times (with SIDS-compliant position
-- checks), meals/bottles, sunscreen application, and general
-- wellbeing notes.
--
-- Regulatory basis:
--   • National Regulation 162 — Health, hygiene and safe food
--     practices — daily care records
--   • SIDS and Kids safe-sleeping guidelines — sleep position
--     checks every 10 minutes (infants) / 15 minutes (toddlers)
--   • Records retained: enrolment duration + 3 years
--
-- Tables:
--   daily_care_logs          — one row per child per day
--   daily_care_entries       — individual activity records
--   daily_care_sleep_checks  — immutable sleep position checks
-- ============================================================


-- ============================================================
-- TABLE: daily_care_logs
-- ============================================================
-- The daily anchor — one row per child per day. Groups all
-- individual care entries. Status tracks whether the log has
-- been shared with the child's parent/guardian.
--
-- Workflow: in_progress → shared
-- ============================================================

CREATE TABLE daily_care_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),

  -- Subject child
  student_id        UUID NOT NULL REFERENCES students(id),

  -- The day this log covers
  log_date          DATE NOT NULL,

  -- Sharing workflow
  status            TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'shared')),
  shared_at         TIMESTAMPTZ,
  shared_by         UUID REFERENCES users(id),

  -- End-of-day summary note from educator
  general_notes     TEXT,

  -- Meta
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- One log per child per day (active only)
CREATE UNIQUE INDEX idx_daily_care_logs_student_date
  ON daily_care_logs (tenant_id, student_id, log_date)
  WHERE deleted_at IS NULL;

-- Dashboard date queries
CREATE INDEX idx_daily_care_logs_tenant_date
  ON daily_care_logs (tenant_id, log_date);

SELECT apply_updated_at_trigger('daily_care_logs');

ALTER TABLE daily_care_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON daily_care_logs
  FOR ALL USING (tenant_id = current_tenant_id());

-- Parents can see shared logs for their children
CREATE POLICY "Guardian read shared logs" ON daily_care_logs
  FOR SELECT USING (
    status = 'shared'
    AND is_guardian_of(student_id)
  );


-- ============================================================
-- TABLE: daily_care_entries
-- ============================================================
-- Individual activity records within a daily log. Each entry
-- represents one care event: a nappy change, a meal, a bottle
-- feeding, sleep start/end, sunscreen application, or a
-- general wellbeing note.
--
-- Uses a single table with type-specific nullable columns
-- rather than per-type tables. This keeps queries simple and
-- the timeline view is just one SELECT with ORDER BY.
-- ============================================================

CREATE TABLE daily_care_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),

  -- Parent log (cascades on delete for consistency)
  log_id                UUID NOT NULL REFERENCES daily_care_logs(id) ON DELETE CASCADE,

  -- Denormalized for direct student queries without join
  student_id            UUID NOT NULL REFERENCES students(id),

  -- Activity type discriminator
  entry_type            TEXT NOT NULL
    CHECK (entry_type IN (
      'nappy_change', 'meal', 'bottle', 'sleep_start',
      'sleep_end', 'sunscreen', 'wellbeing_note'
    )),

  -- When this event actually happened (not when it was recorded)
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by           UUID NOT NULL REFERENCES users(id),

  -- ── Nappy change fields ────────────────────────────────
  nappy_type            TEXT
    CHECK (nappy_type IS NULL OR nappy_type IN ('wet', 'soiled', 'dry')),
  nappy_cream_applied   BOOLEAN,

  -- ── Meal fields ────────────────────────────────────────
  meal_type             TEXT
    CHECK (meal_type IS NULL OR meal_type IN (
      'breakfast', 'morning_tea', 'lunch', 'afternoon_tea', 'late_snack'
    )),
  food_offered          TEXT,
  food_consumed         TEXT
    CHECK (food_consumed IS NULL OR food_consumed IN (
      'all', 'most', 'some', 'little', 'none'
    )),

  -- ── Bottle fields ──────────────────────────────────────
  bottle_type           TEXT
    CHECK (bottle_type IS NULL OR bottle_type IN (
      'breast_milk', 'formula', 'water', 'other'
    )),
  bottle_amount_ml      INTEGER
    CHECK (bottle_amount_ml IS NULL OR bottle_amount_ml >= 0),

  -- ── Sleep fields (sleep_start) ─────────────────────────
  sleep_position        TEXT
    CHECK (sleep_position IS NULL OR sleep_position IN ('back', 'side', 'front')),
  sleep_manner          TEXT
    CHECK (sleep_manner IS NULL OR sleep_manner IN (
      'self_settled', 'patted', 'rocked', 'held', 'fed_to_sleep'
    )),

  -- ── Sunscreen fields ──────────────────────────────────
  sunscreen_spf         INTEGER
    CHECK (sunscreen_spf IS NULL OR sunscreen_spf > 0),
  sunscreen_reapply_due TIMESTAMPTZ,

  -- ── Wellbeing note fields ─────────────────────────────
  wellbeing_mood        TEXT
    CHECK (wellbeing_mood IS NULL OR wellbeing_mood IN (
      'happy', 'settled', 'unsettled', 'tired', 'unwell'
    )),
  wellbeing_temperature DECIMAL(4,1)
    CHECK (wellbeing_temperature IS NULL
      OR (wellbeing_temperature >= 34.0 AND wellbeing_temperature <= 42.0)),

  -- Free-text notes for any entry type
  notes                 TEXT,

  -- Meta
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

-- Join to parent log
CREATE INDEX idx_daily_care_entries_log
  ON daily_care_entries (log_id)
  WHERE deleted_at IS NULL;

-- Timeline queries per student
CREATE INDEX idx_daily_care_entries_student_time
  ON daily_care_entries (tenant_id, student_id, recorded_at)
  WHERE deleted_at IS NULL;

-- Type filtering
CREATE INDEX idx_daily_care_entries_type
  ON daily_care_entries (tenant_id, entry_type)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('daily_care_entries');

ALTER TABLE daily_care_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON daily_care_entries
  FOR ALL USING (tenant_id = current_tenant_id());

-- Parents can see entries on shared logs
CREATE POLICY "Guardian read shared entries" ON daily_care_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_care_logs l
      WHERE l.id = daily_care_entries.log_id
        AND l.status = 'shared'
        AND is_guardian_of(l.student_id)
    )
  );


-- ============================================================
-- TABLE: daily_care_sleep_checks
-- ============================================================
-- SIDS-compliant position checks during sleep periods.
-- Linked to a sleep_start entry. Immutable: no soft-delete,
-- no updated_at — these are compliance evidence.
--
-- Check frequency:
--   • Under 12 months: every 10 minutes
--   • 12 months to preschool: every 15 minutes
-- ============================================================

CREATE TABLE daily_care_sleep_checks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),

  -- The sleep_start entry this check belongs to
  entry_id              UUID NOT NULL REFERENCES daily_care_entries(id) ON DELETE CASCADE,

  -- Check details
  checked_at            TIMESTAMPTZ NOT NULL,
  checked_by            UUID NOT NULL REFERENCES users(id),
  position              TEXT NOT NULL
    CHECK (position IN ('back', 'side', 'front')),
  breathing_normal      BOOLEAN NOT NULL DEFAULT true,
  skin_colour_normal    BOOLEAN NOT NULL DEFAULT true,
  notes                 TEXT
);

-- Sleep check timeline
CREATE INDEX idx_daily_care_sleep_checks_entry
  ON daily_care_sleep_checks (entry_id, checked_at);

ALTER TABLE daily_care_sleep_checks ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (INSERT + SELECT only — no UPDATE/DELETE)
CREATE POLICY "Tenant read" ON daily_care_sleep_checks
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "Tenant insert" ON daily_care_sleep_checks
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- Parents can see sleep checks on shared logs
CREATE POLICY "Guardian read shared sleep checks" ON daily_care_sleep_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_care_entries e
      JOIN daily_care_logs l ON l.id = e.log_id
      WHERE e.id = daily_care_sleep_checks.entry_id
        AND l.status = 'shared'
        AND is_guardian_of(l.student_id)
    )
  );


-- ============================================================
-- PERMISSIONS
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_daily_care_logs', 'Manage Daily Care Logs', 'daily_care', 'Record and edit daily care entries (nappy, sleep, meals, sunscreen)'),
  ('view_daily_care_logs',   'View Daily Care Logs',   'daily_care', 'View daily care log records (read-only)')
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

    -- Head of School: all daily care permissions
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module = 'daily_care'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Lead Guide: manage + view
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.module = 'daily_care'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Guide: manage + view (guides do the actual care recording)
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.module = 'daily_care'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Assistant: manage + view (assistants do nappy changes, feeds, etc.)
    SELECT id INTO v_assistant FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Assistant' AND is_system = true;

    IF v_assistant IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_assistant, p.id
      FROM permissions p
      WHERE p.module = 'daily_care'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;


-- ============================================================
-- UPDATE seed_tenant_roles() FOR FUTURE TENANTS
-- ============================================================
-- IMPORTANT: This trigger only fires on INSERT INTO tenants.
-- When adding new permissions in a future migration, you MUST
-- also add a DO $$ backfill block that grants them to Owner,
-- Administrator, and other system roles for ALL EXISTING tenants.
-- Owner and Admin do NOT "auto-pick up" new rows — the wildcard
-- SELECT * is a point-in-time snapshot at tenant creation.
-- See migration 00014 for the remediation of this mistake.
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

  -- Head of School: all pedagogy + sis + attendance + comms + all compliance + rostering + learning plans + daily care
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
    'learning_plans',
    'daily_care'
  );

  -- Lead Guide: core classroom + operational compliance + rostering + learning plans + daily care
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
    'manage_ilp', 'view_ilp',
    -- Daily Care
    'manage_daily_care_logs', 'view_daily_care_logs'
  );

  -- Guide: classroom essentials + floor compliance + self-service rostering + learning plans + daily care
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
    'manage_ilp', 'view_ilp',
    -- Daily Care
    'manage_daily_care_logs', 'view_daily_care_logs'
  );

  -- Assistant: minimal access + basic rostering + view learning plans + daily care (assistants do hands-on care)
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
    'view_ilp',
    -- Daily Care (assistants do nappy changes, feeds, sleep checks)
    'manage_daily_care_logs', 'view_daily_care_logs'
  );

  -- Parent: no explicit permissions (uses is_guardian_of() in RLS)

  RETURN NEW;
END;
$$;
