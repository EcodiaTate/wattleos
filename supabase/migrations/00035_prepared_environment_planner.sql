-- 00035_prepared_environment_planner.sql
-- ============================================================
-- Prepared Environment Planner (Montessori)
-- ============================================================
-- Captures shelf layout plans (slot → material assignments)
-- and material rotation schedules (seasonal/thematic changes).
-- Two core tables:
--   environment_plans   — named, versioned layouts per location
--   plan_shelf_slots    — material → slot assignments per plan
--   rotation_schedules  — planned rotation events per location
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUM: plan status lifecycle
-- ────────────────────────────────────────────────────────────
CREATE TYPE environment_plan_status AS ENUM (
  'draft',     -- being designed, not yet live
  'active',    -- currently in use for this shelf location
  'archived'   -- superseded by a newer plan
);

-- ────────────────────────────────────────────────────────────
-- ENUM: rotation schedule status
-- ────────────────────────────────────────────────────────────
CREATE TYPE rotation_schedule_status AS ENUM (
  'upcoming',   -- scheduled for future
  'in_progress',-- currently active rotation period
  'completed',  -- rotation done
  'cancelled'   -- not carried out
);

-- ────────────────────────────────────────────────────────────
-- ENUM: rotation theme type
-- ────────────────────────────────────────────────────────────
CREATE TYPE rotation_theme_type AS ENUM (
  'seasonal',
  'thematic',
  'developmental',
  'custom'
);

-- ────────────────────────────────────────────────────────────
-- TABLE: environment_plans
-- One plan represents one layout configuration for one shelf
-- location. Only one plan per location can be 'active'.
-- ────────────────────────────────────────────────────────────
CREATE TABLE environment_plans (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id  UUID        REFERENCES material_shelf_locations(id) ON DELETE SET NULL,
  name         TEXT        NOT NULL,
  description  TEXT,
  status       environment_plan_status NOT NULL DEFAULT 'draft',
  theme        TEXT,                     -- e.g. "Autumn 2025", "Ocean Creatures"
  effective_from DATE,
  effective_to   DATE,
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- Only one active plan per tenant + location
CREATE UNIQUE INDEX environment_plans_single_active
  ON environment_plans (tenant_id, location_id)
  WHERE status = 'active' AND deleted_at IS NULL AND location_id IS NOT NULL;

ALTER TABLE environment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "environment_plans_tenant_isolation" ON environment_plans
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX ON environment_plans (tenant_id);
CREATE INDEX ON environment_plans (tenant_id, location_id);
CREATE INDEX ON environment_plans (tenant_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER update_environment_plans_updated_at
  BEFORE UPDATE ON environment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- TABLE: plan_shelf_slots
-- Individual shelf slot → material assignments within a plan.
-- slot_label: free-text "A1", "Top shelf left", etc.
-- ────────────────────────────────────────────────────────────
CREATE TABLE plan_shelf_slots (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id         UUID  NOT NULL REFERENCES environment_plans(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES material_inventory_items(id) ON DELETE SET NULL,
  slot_label      TEXT  NOT NULL,      -- display label, e.g. "Row A Slot 2"
  sort_order      INT   NOT NULL DEFAULT 0,
  area            TEXT,                -- montessori area override (if different from item)
  age_range_notes TEXT,               -- who this slot is intended for
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce slot_label uniqueness per plan
CREATE UNIQUE INDEX plan_shelf_slots_label_unique
  ON plan_shelf_slots (plan_id, slot_label);

ALTER TABLE plan_shelf_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_shelf_slots_tenant_isolation" ON plan_shelf_slots
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX ON plan_shelf_slots (tenant_id);
CREATE INDEX ON plan_shelf_slots (plan_id);

CREATE TRIGGER update_plan_shelf_slots_updated_at
  BEFORE UPDATE ON plan_shelf_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- TABLE: rotation_schedules
-- Planned material rotation events. Links to a plan and logs
-- what materials were changed and why.
-- ────────────────────────────────────────────────────────────
CREATE TABLE rotation_schedules (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id     UUID  REFERENCES material_shelf_locations(id) ON DELETE SET NULL,
  plan_id         UUID  REFERENCES environment_plans(id) ON DELETE SET NULL,
  title           TEXT  NOT NULL,
  theme_type      rotation_theme_type NOT NULL DEFAULT 'seasonal',
  theme_label     TEXT,                -- e.g. "Autumn Term", "Spiders & Webs"
  scheduled_date  DATE  NOT NULL,
  completed_at    TIMESTAMPTZ,
  status          rotation_schedule_status NOT NULL DEFAULT 'upcoming',
  rationale       TEXT,               -- pedagogical reason for the rotation
  materials_added   TEXT,             -- free-text summary of what went on
  materials_removed TEXT,             -- free-text summary of what came off
  outcome_notes   TEXT,               -- post-rotation reflection
  created_by      UUID  REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by    UUID  REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE rotation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotation_schedules_tenant_isolation" ON rotation_schedules
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE INDEX ON rotation_schedules (tenant_id);
CREATE INDEX ON rotation_schedules (tenant_id, location_id);
CREATE INDEX ON rotation_schedules (tenant_id, scheduled_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON rotation_schedules (tenant_id, status) WHERE deleted_at IS NULL;

CREATE TRIGGER update_rotation_schedules_updated_at
  BEFORE UPDATE ON rotation_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- Backfill: grant new permissions to existing Owner/Admin/HoS
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT tenant_id, id AS role_id
    FROM roles
    WHERE name IN ('Owner', 'Administrator', 'Head of School')
  LOOP
    INSERT INTO permissions (name) VALUES
      ('view_environment_planner'),
      ('manage_environment_planner')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO role_permissions (role_id, permission)
    SELECT r.role_id, unnest(ARRAY[
      'view_environment_planner',
      'manage_environment_planner'
    ])
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Guides get view only
  FOR r IN
    SELECT DISTINCT tenant_id, id AS role_id
    FROM roles
    WHERE name IN ('Guide', 'Lead Guide', 'Assistant Guide')
  LOOP
    INSERT INTO role_permissions (role_id, permission)
    VALUES (r.role_id, 'view_environment_planner')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
