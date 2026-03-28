-- supabase/migrations/00087_tenant_offboarding.sql
--
-- ============================================================
-- WattleOS V2 - Tenant Offboarding Automation (Prompt 46)
-- ============================================================
-- Adds structured offboarding lifecycle to the tenants table.
--
-- Phases (matches legal page promise of 120-day deletion window):
--   active        → normal operation
--   grace_period  → 0–30 days post-termination, full access, cancellable
--   read_only     → 30–60 days, data readable, mutations blocked
--   export_window → 60–90 days, automated data export generated
--   pending_purge → 90–120 days, queued for deletion
--   purged        → post-120 days, all data cascade-deleted
--
-- WHY a separate phase column instead of just terminated_at:
-- The middleware and server actions need to know the current
-- phase without computing it from dates every request.
-- Phase transitions are driven by the cron job.
-- ============================================================

-- ── Add offboarding columns to tenants ──────────────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offboard_phase TEXT
    CHECK (offboard_phase IN (
      'active', 'grace_period', 'read_only',
      'export_window', 'pending_purge', 'purged'
    ))
    NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS offboard_initiated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS offboard_cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offboard_cancelled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_export_path TEXT,         -- Storage path of tenant export archive
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMPTZ;         -- Set when purge completes

-- Index for the cron job — only processes non-active, non-purged tenants
CREATE INDEX IF NOT EXISTS idx_tenants_offboard_phase
  ON tenants (offboard_phase)
  WHERE offboard_phase NOT IN ('active', 'purged');

COMMENT ON COLUMN tenants.offboard_phase IS
  'Lifecycle phase: active → grace_period → read_only → export_window → pending_purge → purged. Driven by cron job.';
COMMENT ON COLUMN tenants.terminated_at IS
  'Timestamp when offboarding was initiated (subscription terminated).';
COMMENT ON COLUMN tenants.data_export_path IS
  'Supabase Storage path for the full tenant data export archive.';
