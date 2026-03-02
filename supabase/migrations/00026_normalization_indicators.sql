-- 00026_normalization_indicators.sql
-- ============================================================
-- Normalization Indicators — Montessori developmental tracking
-- ============================================================
-- "Normalization" in Montessori pedagogy is the observable state
-- where children develop concentration, independence, order,
-- coordination, and social harmony through purposeful work.
--
-- This module provides structured periodic observations of these
-- five indicators, with trend tracking and goal-setting to
-- support educators in guiding each child's development.
-- ============================================================

-- ── ENUM: Work cycle engagement depth ──────────────────────
DO $$ BEGIN
  CREATE TYPE work_cycle_engagement AS ENUM (
    'deep',
    'moderate',
    'surface',
    'disengaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ENUM: Self-direction level ─────────────────────────────
DO $$ BEGIN
  CREATE TYPE self_direction_level AS ENUM (
    'fully_self_directed',
    'minimal_guidance',
    'frequent_guidance',
    'constant_support'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ENUM: Normalization indicator names ────────────────────
DO $$ BEGIN
  CREATE TYPE normalization_indicator AS ENUM (
    'concentration',
    'independence',
    'order',
    'coordination',
    'social_harmony'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ENUM: Normalization goal status ────────────────────────
DO $$ BEGIN
  CREATE TYPE normalization_goal_status AS ENUM (
    'active',
    'achieved',
    'deferred',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Table: normalization_observations
-- ============================================================
-- Periodic structured observations of the five normalization
-- indicators. Each row is one observation session for one child.
-- Ratings use a 1–5 Likert scale (1 = rarely, 5 = consistently).
-- ============================================================

CREATE TABLE IF NOT EXISTS normalization_observations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  observer_id     UUID NOT NULL REFERENCES auth.users(id),
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Five normalization indicators (1–5 scale)
  concentration_rating    SMALLINT NOT NULL CHECK (concentration_rating BETWEEN 1 AND 5),
  concentration_duration_minutes SMALLINT CHECK (concentration_duration_minutes >= 0),
  concentration_notes     TEXT,

  independence_rating     SMALLINT NOT NULL CHECK (independence_rating BETWEEN 1 AND 5),
  independence_notes      TEXT,

  order_rating            SMALLINT NOT NULL CHECK (order_rating BETWEEN 1 AND 5),
  order_notes             TEXT,

  coordination_rating     SMALLINT NOT NULL CHECK (coordination_rating BETWEEN 1 AND 5),
  coordination_notes      TEXT,

  social_harmony_rating   SMALLINT NOT NULL CHECK (social_harmony_rating BETWEEN 1 AND 5),
  social_harmony_notes    TEXT,

  -- Aggregate observations
  work_cycle_engagement   work_cycle_engagement NOT NULL DEFAULT 'moderate',
  self_direction          self_direction_level NOT NULL DEFAULT 'minimal_guidance',
  joyful_engagement       BOOLEAN NOT NULL DEFAULT false,
  overall_notes           TEXT,

  -- Environment context
  class_id                UUID REFERENCES classes(id),

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_norm_obs_tenant
  ON normalization_observations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_norm_obs_student
  ON normalization_observations(student_id, observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_norm_obs_observer
  ON normalization_observations(observer_id);
CREATE INDEX IF NOT EXISTS idx_norm_obs_class
  ON normalization_observations(class_id)
  WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_norm_obs_deleted
  ON normalization_observations(tenant_id)
  WHERE deleted_at IS NULL;

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE normalization_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "normalization_observations_tenant_isolation"
  ON normalization_observations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ── Updated-at trigger ─────────────────────────────────────
CREATE TRIGGER set_normalization_observations_updated_at
  BEFORE UPDATE ON normalization_observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Table: normalization_goals
-- ============================================================
-- Per-student goals set by educators for specific indicators.
-- Tracks target rating, strategy, and progress toward
-- normalization milestones.
-- ============================================================

CREATE TABLE IF NOT EXISTS normalization_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  indicator       normalization_indicator NOT NULL,

  current_rating  SMALLINT NOT NULL CHECK (current_rating BETWEEN 1 AND 5),
  target_rating   SMALLINT NOT NULL CHECK (target_rating BETWEEN 1 AND 5),
  target_date     DATE,

  strategy        TEXT NOT NULL,
  progress_notes  TEXT,
  status          normalization_goal_status NOT NULL DEFAULT 'active',

  created_by      UUID NOT NULL REFERENCES auth.users(id),
  achieved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Target must be higher than current
  CONSTRAINT target_above_current CHECK (target_rating >= current_rating)
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_norm_goals_tenant
  ON normalization_goals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_norm_goals_student
  ON normalization_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_norm_goals_active
  ON normalization_goals(tenant_id, student_id)
  WHERE status = 'active' AND deleted_at IS NULL;

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE normalization_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "normalization_goals_tenant_isolation"
  ON normalization_goals
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ── Updated-at trigger ─────────────────────────────────────
CREATE TRIGGER set_normalization_goals_updated_at
  BEFORE UPDATE ON normalization_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Permissions
-- ============================================================

INSERT INTO permissions (key, label, description) VALUES
  ('view_normalization', 'View Normalization', 'View normalization observation data and goals'),
  ('manage_normalization', 'Manage Normalization', 'Record normalization observations and manage goals')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner, Admin, Head of School, Lead Educator for all existing tenants
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rp.role_id, p.id AS perm_id
    FROM roles
    JOIN role_permissions rp ON rp.role_id = roles.id
    JOIN permissions p ON p.key IN ('view_normalization', 'manage_normalization')
    WHERE roles.name IN ('Owner', 'Admin', 'Head of School', 'Lead Educator')
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp2
      WHERE rp2.role_id = rp.role_id AND rp2.permission_id = p.id
    )
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (r.role_id, r.perm_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Also grant view to Educator role
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT roles.id AS role_id, p.id AS perm_id
    FROM roles
    JOIN permissions p ON p.key = 'view_normalization'
    WHERE roles.name = 'Educator'
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = roles.id AND rp.permission_id = p.id
    )
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (r.role_id, r.perm_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
