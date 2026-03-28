-- 00085_audit_logs_retention.sql
--
-- Implements the data retention policy for audit_logs (Prompt 39).
--
-- Changes:
--   1. retain_until DATE  — absolute deletion date (created_at + 7 years)
--   2. archived_at TIMESTAMPTZ — set by the audit-archive cron when the
--      row is exported to cold storage
--
-- Indexes added for the two cron queries:
--   - archive cron: WHERE created_at < now() - 2yr AND archived_at IS NULL
--   - purge cron:   WHERE archived_at IS NOT NULL AND retain_until < now()
--
-- ST4S minimum: 7 years.
-- Privacy Act: don't keep longer than necessary → purge after retain_until.

BEGIN;

-- 1. retain_until: populated by default for new rows; backfilled below
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS retain_until DATE
    GENERATED ALWAYS AS ((created_at::date + INTERVAL '7 years')::date) STORED;

-- 2. archived_at: nullable; set when exported to cold storage
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3. Index for archive cron
--    Filters: rows older than 2 years that haven't been archived yet
CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_candidates
  ON audit_logs (tenant_id, created_at)
  WHERE archived_at IS NULL;

-- 4. Index for purge cron
--    Filters: archived rows past their retention window
CREATE INDEX IF NOT EXISTS idx_audit_logs_purge_candidates
  ON audit_logs (retain_until)
  WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN audit_logs.retain_until IS
  'Absolute deletion date: created_at + 7 years. Rows should not be hard-deleted before this date.';
COMMENT ON COLUMN audit_logs.archived_at IS
  'Set by the audit-archive cron when the row is exported to cold storage (audit-archive bucket).';

COMMIT;
