-- 00086_audit_logs_ip_address_column.sql
--
-- Promotes IP address from JSONB metadata._ip to a first-class
-- column on audit_logs (Prompt 40).
--
-- Previously: metadata->>'_ip'     — slow, un-indexable
-- Now:        ip_address TEXT       — indexed, fast forensic queries
--
-- Steps:
--   1. Add ip_address TEXT column
--   2. Create index on ip_address
--   3. Backfill existing rows from metadata->>'_ip'
--
-- The logAudit() and logAuditSystem() functions in
-- src/lib/utils/audit.ts are updated separately to populate
-- ip_address directly on every new insert.
--
-- WHY keep _ip in metadata:
--   We leave _ip in the metadata JSONB for backward compatibility.
--   After a suitable migration period it can be removed with a
--   follow-up migration (00087+).

BEGIN;

-- 1. Add column
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

COMMENT ON COLUMN audit_logs.ip_address IS
  'IP address of the requester. Promoted from metadata._ip for fast forensic queries and indexing.';

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address
  ON audit_logs (ip_address)
  WHERE ip_address IS NOT NULL;

-- 3. Backfill: copy _ip out of the JSONB blob
UPDATE audit_logs
  SET ip_address = metadata->>'_ip'
  WHERE metadata->>'_ip' IS NOT NULL
    AND ip_address IS NULL;

COMMIT;
