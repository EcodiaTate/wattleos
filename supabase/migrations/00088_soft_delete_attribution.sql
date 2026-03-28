-- supabase/migrations/00088_soft_delete_attribution.sql
--
-- ============================================================
-- WattleOS V2 - Soft-Delete Attribution (Prompt 47)
-- ============================================================
-- Adds deleted_by and deletion_reason to all critical tables
-- that use soft-delete. Previously, soft-deletes set deleted_at
-- but recorded no WHO or WHY — a forensic gap for PRODA audits,
-- child protection reviews, and staff departure investigations.
--
-- Tables covered:
--   students, enrollments, incidents, medical_conditions,
--   individual_learning_plans (plus medical sub-tables)
--
-- WHY nullable: Both columns are NULL when deleted_at IS NULL
-- (active records). Only populated on soft-delete.
--
-- WHY TEXT for deletion_reason (not FK): Reasons are free-form
-- narrative, not a codified enum. "Child transferred to state
-- school" is more useful than "TRANSFER".
-- ============================================================

-- ── students ────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── enrollments ─────────────────────────────────────────────
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── incidents ────────────────────────────────────────────────
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── medical_conditions ───────────────────────────────────────
ALTER TABLE medical_conditions
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── individual_learning_plans ────────────────────────────────
ALTER TABLE individual_learning_plans
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── medical_management_plans ─────────────────────────────────
-- (child table of medical_conditions — same pattern)
ALTER TABLE medical_management_plans
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── medication_authorisations ────────────────────────────────
ALTER TABLE medication_authorisations
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Comments
COMMENT ON COLUMN students.deleted_by IS
  'User who performed the soft-delete. NULL when record is active.';
COMMENT ON COLUMN students.deletion_reason IS
  'Free-form reason for soft-delete (e.g. "Child enrolled at new school", "Duplicate record"). NULL when active.';

COMMENT ON COLUMN enrollments.deleted_by IS
  'User who withdrew or removed this enrollment. NULL when active.';
COMMENT ON COLUMN enrollments.deletion_reason IS
  'Reason for enrollment withdrawal or removal.';

COMMENT ON COLUMN incidents.deleted_by IS
  'User who deleted this incident record. NULL when active.';
COMMENT ON COLUMN incidents.deletion_reason IS
  'Reason for deleting this incident (e.g. "Duplicate entry", "Created in error").';

COMMENT ON COLUMN medical_conditions.deleted_by IS
  'User who deleted this medical condition. NULL when active.';
COMMENT ON COLUMN medical_conditions.deletion_reason IS
  'Reason for archiving/deleting this medical condition.';

COMMENT ON COLUMN individual_learning_plans.deleted_by IS
  'User who deleted this ILP. NULL when active.';
COMMENT ON COLUMN individual_learning_plans.deletion_reason IS
  'Reason for deleting this ILP.';
