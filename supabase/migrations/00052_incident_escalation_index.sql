-- Migration: 00052_incident_escalation_index
--
-- Adds a partial index to support the hourly NQA escalation cron job.
-- The cron queries: serious incidents where regulator_notified_at IS NULL,
-- deleted_at IS NULL, status != 'closed', and created_at < now() - 24h.
--
-- Without an index this scans the full incidents table per cron run.
-- The partial index filters to only the rows the cron cares about,
-- keeping it fast even as the incidents table grows.

CREATE INDEX IF NOT EXISTS idx_incidents_nqa_escalation
  ON incidents (tenant_id, created_at)
  WHERE
    is_serious_incident = true
    AND regulator_notified_at IS NULL
    AND deleted_at IS NULL
    AND status != 'closed';
