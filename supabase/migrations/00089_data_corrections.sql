-- supabase/migrations/00089_data_corrections.sql
--
-- ============================================================
-- WattleOS V2 - Data Correction Workflow APP 13 (Prompt 48)
-- ============================================================
-- APP 13 (Australian Privacy Principles) requires that
-- organisations provide a mechanism for individuals to request
-- correction of personal information within 30 days.
--
-- This table implements a formal amendment trail for critical
-- student fields. Rather than allowing direct edits to names,
-- DOBs, and medical condition names, changes are routed through
-- an approval workflow that captures:
--   - The original value (encrypted at rest)
--   - The proposed new value (encrypted at rest)
--   - Who requested the change and why
--   - Who approved or rejected the change
--   - When each step occurred
--
-- WHY approval workflow for critical fields:
-- Direct edits to a student's name or DOB could mask identity
-- (e.g. renaming a child subject to a protection order).
-- Requiring approval ensures a second human reviews the change.
--
-- CRITICAL FIELDS requiring workflow:
--   students: first_name, last_name, dob, medicare_number, crn
--   medical_conditions: condition_name, severity, details
--
-- Non-critical fields (demographics, address, notes) can still
-- be edited directly — those changes appear in audit_logs.
-- ============================================================

CREATE TABLE IF NOT EXISTS data_corrections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What is being corrected
  entity_type     TEXT NOT NULL,  -- 'student', 'medical_condition', etc.
  entity_id       UUID NOT NULL,
  field_name      TEXT NOT NULL,  -- 'first_name', 'dob', etc.

  -- Values (encrypted by application layer using encryptField())
  old_value       TEXT,           -- Encrypted original value
  new_value       TEXT NOT NULL,  -- Encrypted proposed value

  -- Request
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason          TEXT NOT NULL,  -- Mandatory: why is this change needed?

  -- Approval
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,           -- Optional reviewer comment

  -- Applied
  applied_at      TIMESTAMPTZ,    -- When the approved change was written to DB

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_data_corrections_tenant
  ON data_corrections (tenant_id);

CREATE INDEX IF NOT EXISTS idx_data_corrections_entity
  ON data_corrections (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_data_corrections_pending
  ON data_corrections (tenant_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_data_corrections_requested_by
  ON data_corrections (requested_by);

-- ── Updated_at trigger ────────────────────────────────────────
CREATE TRIGGER data_corrections_updated_at
  BEFORE UPDATE ON data_corrections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE data_corrections ENABLE ROW LEVEL SECURITY;

-- Tenant members can view corrections for their tenant
CREATE POLICY "data_corrections_select"
  ON data_corrections FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Any tenant member can submit a correction request
CREATE POLICY "data_corrections_insert"
  ON data_corrections FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND requested_by = auth.uid()
  );

-- Only users with manage_students permission can approve/reject
-- (enforced at the application layer via requirePermission —
-- RLS here just prevents direct UPDATE from non-reviewers)
CREATE POLICY "data_corrections_update"
  ON data_corrections FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), 'manage_students')
  );

-- Service role bypass for system operations
CREATE POLICY "data_corrections_service_role"
  ON data_corrections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON TABLE data_corrections IS
  'APP 13 data correction workflow. Records requests to amend personal information with full approval trail.';
COMMENT ON COLUMN data_corrections.old_value IS
  'Application-encrypted original field value. Decrypt with decryptField() in server actions.';
COMMENT ON COLUMN data_corrections.new_value IS
  'Application-encrypted proposed replacement value. Decrypt with decryptField().';
COMMENT ON COLUMN data_corrections.reason IS
  'Mandatory explanation of why this correction is needed (e.g. "Name misspelled on enrollment form").';
