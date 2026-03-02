-- 00033_work_cycle_integrity.sql
-- ============================================================
-- Work Cycle Integrity Tracking — Montessori 3-hour work cycle
-- ============================================================
-- The uninterrupted 3-hour work cycle is foundational to
-- Montessori pedagogy. Interruptions (external: PA announcements,
-- specialist pull-outs; internal: staff interruptions, peer
-- disruptions) break concentration and prevent normalization.
--
-- This module lets guides log interruptions per session, view
-- frequency trends per class, and flag classes where interruptions
-- are systematically above a configurable threshold.
-- ============================================================

-- ── ENUM: Interruption source ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE work_cycle_interruption_source AS ENUM (
    'pa_announcement',
    'specialist_pullout',
    'fire_drill',
    'visitor',
    'admin_request',
    'peer_disruption',
    'staff_interruption',
    'technology',
    'noise_external',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ENUM: Interruption severity ────────────────────────────
DO $$ BEGIN
  CREATE TYPE work_cycle_interruption_severity AS ENUM (
    'minor',    -- brief, class recovers quickly (<5 min)
    'moderate', -- noticeable disruption, recovery takes time
    'severe'    -- work cycle effectively ended
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Table: work_cycle_sessions
-- One row per observed work cycle (typically one per day).
-- Records the planned vs actual duration and overall quality.
-- ============================================================

CREATE TABLE IF NOT EXISTS work_cycle_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id              UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_date          DATE NOT NULL,
  planned_start_time    TIME NOT NULL,
  planned_end_time      TIME NOT NULL,
  actual_start_time     TIME,
  actual_end_time       TIME,
  -- Longest uninterrupted stretch in minutes (computed on save)
  longest_uninterrupted_minutes INT,
  -- Overall quality rating 1–5 (guide's holistic judgement)
  quality_rating        SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
  -- Was the cycle sustained without early termination?
  completed_full_cycle  BOOLEAN NOT NULL DEFAULT false,
  general_notes         TEXT,
  recorded_by           UUID NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT wcs_planned_order CHECK (planned_end_time > planned_start_time)
);

CREATE INDEX IF NOT EXISTS idx_wcs_tenant_class_date
  ON work_cycle_sessions (tenant_id, class_id, session_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wcs_tenant_date
  ON work_cycle_sessions (tenant_id, session_date DESC)
  WHERE deleted_at IS NULL;

-- ============================================================
-- Table: work_cycle_interruptions
-- One row per interruption within a session.
-- ============================================================

CREATE TABLE IF NOT EXISTS work_cycle_interruptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id     UUID NOT NULL REFERENCES work_cycle_sessions(id) ON DELETE CASCADE,
  occurred_at    TIME NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes >= 0),
  source         work_cycle_interruption_source NOT NULL,
  severity       work_cycle_interruption_severity NOT NULL,
  description    TEXT,
  -- Was this interruption preventable? Drives flagging logic.
  preventable    BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wci_session
  ON work_cycle_interruptions (session_id);

CREATE INDEX IF NOT EXISTS idx_wci_tenant_source
  ON work_cycle_interruptions (tenant_id, source);

-- ============================================================
-- Permissions
-- ============================================================
-- Reuses lesson record permissions — work cycle is Montessori
-- pedagogy domain, same audience as three-period lessons.

INSERT INTO permissions (key, label, module, description)
VALUES
  ('view_work_cycles',   'View Work Cycle Sessions',   'work_cycle_integrity', 'View work cycle sessions and interruption logs'),
  ('manage_work_cycles', 'Manage Work Cycle Sessions', 'work_cycle_integrity', 'Record and edit work cycle sessions and interruptions')
ON CONFLICT (key) DO NOTHING;

-- ── Grant to existing tenants ──────────────────────────────
DO $$
DECLARE
  r RECORD;
  owner_role_id  UUID;
  admin_role_id  UUID;
  guide_role_id  UUID;
BEGIN
  FOR r IN SELECT id FROM tenants WHERE is_active = true LOOP
    SELECT id INTO owner_role_id FROM roles WHERE tenant_id = r.id AND name = 'Owner' LIMIT 1;
    SELECT id INTO admin_role_id FROM roles WHERE tenant_id = r.id AND name = 'Administrator' LIMIT 1;
    SELECT id INTO guide_role_id FROM roles WHERE tenant_id = r.id AND name = 'Guide' LIMIT 1;

    IF owner_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES
        (owner_role_id, 'view_work_cycles'),
        (owner_role_id, 'manage_work_cycles')
      ON CONFLICT DO NOTHING;
    END IF;

    IF admin_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES
        (admin_role_id, 'view_work_cycles'),
        (admin_role_id, 'manage_work_cycles')
      ON CONFLICT DO NOTHING;
    END IF;

    IF guide_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES
        (guide_role_id, 'view_work_cycles'),
        (guide_role_id, 'manage_work_cycles')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE work_cycle_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_cycle_interruptions ENABLE ROW LEVEL SECURITY;

-- Sessions: tenant isolation + permission check
CREATE POLICY "work_cycle_sessions_select"
  ON work_cycle_sessions FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'view_work_cycles')
  );

CREATE POLICY "work_cycle_sessions_insert"
  ON work_cycle_sessions FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_work_cycles')
  );

CREATE POLICY "work_cycle_sessions_update"
  ON work_cycle_sessions FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_work_cycles')
  );

CREATE POLICY "work_cycle_sessions_delete"
  ON work_cycle_sessions FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_work_cycles')
  );

-- Interruptions: inherit via session join
CREATE POLICY "work_cycle_interruptions_select"
  ON work_cycle_interruptions FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'view_work_cycles')
  );

CREATE POLICY "work_cycle_interruptions_insert"
  ON work_cycle_interruptions FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_work_cycles')
  );

CREATE POLICY "work_cycle_interruptions_update"
  ON work_cycle_interruptions FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_work_cycles')
  );

CREATE POLICY "work_cycle_interruptions_delete"
  ON work_cycle_interruptions FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_work_cycles')
  );

-- ── updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE TRIGGER work_cycle_sessions_updated_at
  BEFORE UPDATE ON work_cycle_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
