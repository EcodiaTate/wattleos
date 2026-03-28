-- Migration: Add outcome field to audit_logs
-- Security: All logged events were assumed successful. Failed operations
-- that throw before logAudit() runs are silently unrecorded.
-- This adds an outcome column for forensic completeness.

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS outcome TEXT
  DEFAULT 'success'
  CHECK (outcome IN ('success', 'failure', 'partial'));

-- Index for filtering by outcome (useful for incident investigation)
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome
  ON audit_logs (tenant_id, outcome, created_at DESC)
  WHERE outcome != 'success';
