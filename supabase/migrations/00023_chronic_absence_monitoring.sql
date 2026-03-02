-- supabase/migrations/00021_chronic_absence_monitoring.sql
--
-- ============================================================
-- Chronic Absence Monitoring
-- ============================================================
-- Schools are required under state education legislation to
-- monitor and respond to persistent non-attendance. This
-- module provides:
--
--   absence_monitoring_config   — per-tenant threshold settings
--   absence_monitoring_flags    — flagged students under review
--   absence_follow_up_log       — intervention contact records
--
-- The actual attendance rate is always calculated live from
-- `attendance_records` (no denormalisation) so there's a single
-- source of truth. Flags are the human layer — the decision
-- to formally monitor a student — not a computed cache.
-- ============================================================

-- ============================================================
-- 1. absence_monitoring_config
-- ============================================================
-- One row per tenant. Created on first access. Holds the
-- percentage thresholds used to colour-code students and
-- the rolling window (in school days) over which the rate
-- is calculated.
-- ============================================================

CREATE TABLE IF NOT EXISTS absence_monitoring_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Threshold percentages (attendance rate, 0–100)
  -- good:    >= at_risk_threshold
  -- at_risk: >= chronic_threshold and < at_risk_threshold
  -- chronic: >= severe_threshold and < chronic_threshold
  -- severe:  < severe_threshold
  at_risk_threshold        SMALLINT NOT NULL DEFAULT 85 CHECK (at_risk_threshold BETWEEN 50 AND 99),
  chronic_threshold        SMALLINT NOT NULL DEFAULT 80 CHECK (chronic_threshold BETWEEN 50 AND 98),
  severe_threshold         SMALLINT NOT NULL DEFAULT 70 CHECK (severe_threshold BETWEEN 10 AND 97),

  -- Rolling window in calendar days (not school days, for simplicity)
  -- Default 90 days (~1 term). Min 14, max 365.
  rolling_window_days      SMALLINT NOT NULL DEFAULT 90 CHECK (rolling_window_days BETWEEN 14 AND 365),

  -- Which statuses count as "absent" for rate calculation
  -- absent + late always count. half_day counts as 0.5.
  count_late_as_absent     BOOLEAN NOT NULL DEFAULT false,
  count_half_day_as_absent BOOLEAN NOT NULL DEFAULT false,

  -- Auto-flag when rate drops below chronic_threshold (creates a system flag)
  auto_flag_enabled        BOOLEAN NOT NULL DEFAULT true,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT absence_monitoring_config_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT thresholds_ordered CHECK (severe_threshold < chronic_threshold AND chronic_threshold < at_risk_threshold)
);

-- ============================================================
-- 2. absence_monitoring_flags
-- ============================================================
-- A flag is a deliberate human decision (or auto-trigger) to
-- place a student under formal monitoring. One active flag
-- per student at a time (enforced via partial unique index).
-- ============================================================

CREATE TYPE absence_flag_status AS ENUM (
  'active',     -- Currently being monitored
  'resolved',   -- Attendance improved / concern addressed
  'dismissed'   -- False positive / data issue
);

CREATE TYPE absence_flag_source AS ENUM (
  'manual',   -- Staff created it
  'auto'      -- System created it when rate crossed threshold
);

CREATE TABLE IF NOT EXISTS absence_monitoring_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  status          absence_flag_status NOT NULL DEFAULT 'active',
  source          absence_flag_source NOT NULL DEFAULT 'manual',

  -- Rate at point of flagging (stored for historical comparison)
  rate_at_flag    NUMERIC(5,2),          -- e.g. 72.50 = 72.5%

  -- Staff notes attached at flag creation or update
  notes           TEXT,

  -- Resolution details
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Only one *active* flag per student per tenant
CREATE UNIQUE INDEX absence_monitoring_flags_one_active
  ON absence_monitoring_flags (tenant_id, student_id)
  WHERE status = 'active';

-- Fast lookups
CREATE INDEX absence_monitoring_flags_tenant_status
  ON absence_monitoring_flags (tenant_id, status, created_at DESC);

CREATE INDEX absence_monitoring_flags_student
  ON absence_monitoring_flags (student_id, created_at DESC);

-- ============================================================
-- 3. absence_follow_up_log
-- ============================================================
-- Each contact or intervention attempt is logged here.
-- Attached to a flag so the full history is recoverable
-- even after a flag is resolved.
-- ============================================================

CREATE TYPE follow_up_method AS ENUM (
  'phone_call',
  'sms',
  'email',
  'in_person',
  'letter',
  'welfare_check',
  'referral',
  'other'
);

CREATE TYPE follow_up_outcome AS ENUM (
  'contacted',
  'no_answer',
  'message_left',
  'referred',
  'resolved',
  'escalated',
  'other'
);

CREATE TABLE IF NOT EXISTS absence_follow_up_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  flag_id       UUID NOT NULL REFERENCES absence_monitoring_flags(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  contact_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  method        follow_up_method NOT NULL,
  outcome       follow_up_outcome NOT NULL,
  contact_name  TEXT,              -- Who was contacted (parent name, welfare officer, etc.)
  notes         TEXT,
  next_follow_up DATE,             -- Optional: when to follow up again

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX absence_follow_up_log_flag
  ON absence_follow_up_log (flag_id, contact_date DESC);

CREATE INDEX absence_follow_up_log_student
  ON absence_follow_up_log (student_id, contact_date DESC);

-- ============================================================
-- 4. Permissions
-- ============================================================

INSERT INTO permissions (key, description) VALUES
  ('view_chronic_absence',   'View chronic absence dashboard, student rates, and flags'),
  ('manage_chronic_absence', 'Create/update flags, log follow-ups, and configure thresholds')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner, Admin, Head of School by default
-- (Guides can view; only admin roles manage)

DO $$
DECLARE
  t RECORD;
  role_id UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    -- Owner
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Owner' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_chronic_absence'), (role_id, 'manage_chronic_absence')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Admin
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_chronic_absence'), (role_id, 'manage_chronic_absence')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Head of School
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Head of School' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_chronic_absence'), (role_id, 'manage_chronic_absence')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Guide (view only)
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Guide' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_chronic_absence')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE absence_monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_monitoring_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_follow_up_log ENABLE ROW LEVEL SECURITY;

-- Config: readable by anyone with view permission, writable by manage
CREATE POLICY "absence_monitoring_config_select"
  ON absence_monitoring_config FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_chronic_absence')
  );

CREATE POLICY "absence_monitoring_config_upsert"
  ON absence_monitoring_config FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_chronic_absence')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_chronic_absence')
  );

-- Flags: same pattern
CREATE POLICY "absence_monitoring_flags_select"
  ON absence_monitoring_flags FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_chronic_absence')
  );

CREATE POLICY "absence_monitoring_flags_insert"
  ON absence_monitoring_flags FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_chronic_absence')
  );

CREATE POLICY "absence_monitoring_flags_update"
  ON absence_monitoring_flags FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_chronic_absence')
  );

-- Follow-up log: view + manage
CREATE POLICY "absence_follow_up_log_select"
  ON absence_follow_up_log FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_chronic_absence')
  );

CREATE POLICY "absence_follow_up_log_insert"
  ON absence_follow_up_log FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_chronic_absence')
  );

-- ============================================================
-- 6. updated_at trigger for config
-- ============================================================

CREATE OR REPLACE FUNCTION update_absence_monitoring_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER absence_monitoring_config_updated_at
  BEFORE UPDATE ON absence_monitoring_config
  FOR EACH ROW EXECUTE FUNCTION update_absence_monitoring_config_updated_at();

CREATE OR REPLACE FUNCTION update_absence_monitoring_flags_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER absence_monitoring_flags_updated_at
  BEFORE UPDATE ON absence_monitoring_flags
  FOR EACH ROW EXECUTE FUNCTION update_absence_monitoring_flags_updated_at();
