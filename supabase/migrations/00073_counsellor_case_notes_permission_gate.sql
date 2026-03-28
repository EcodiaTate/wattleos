-- Migration 00073: Add permission gates to counsellor_case_notes RLS policies
--
-- SECURITY FIX: The existing RLS policy on counsellor_case_notes only checks
-- tenant_id = current_tenant_id() with no permission gate. Any authenticated
-- user in the tenant can read all counsellor case notes (professional privilege
-- material) if they bypass the application layer.
--
-- This migration adds has_permission() checks so that even direct database
-- access requires the appropriate permission.
--
-- Permissions already exist from migration 00018:
--   - view_counsellor_notes (Owner, Admin)
--   - manage_counsellor_notes (Owner, Admin)
--
-- Also grants to Head of School and Lead Guide per prompt requirements.

BEGIN;

-- ============================================================
-- Drop existing overly-permissive policy
-- ============================================================

DROP POLICY IF EXISTS "case_notes_tenant" ON counsellor_case_notes;

-- ============================================================
-- Replacement policies with permission gates
-- ============================================================

-- SELECT: requires view_counsellor_notes
CREATE POLICY "case_notes_select" ON counsellor_case_notes
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_counsellor_notes')
  );

-- INSERT: requires manage_counsellor_notes
CREATE POLICY "case_notes_insert" ON counsellor_case_notes
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_counsellor_notes')
  );

-- UPDATE: requires manage_counsellor_notes
CREATE POLICY "case_notes_update" ON counsellor_case_notes
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_counsellor_notes')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_counsellor_notes')
  );

-- DELETE: requires manage_counsellor_notes (soft-delete, but block hard delete too)
CREATE POLICY "case_notes_delete" ON counsellor_case_notes
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_counsellor_notes')
  );

-- ============================================================
-- Ensure Head of School and Lead Guide also have access
-- (Owner and Admin were granted in 00018)
-- ============================================================

DO $$
DECLARE
  r RECORD;
  perm_id UUID;
BEGIN
  -- Grant view_counsellor_notes and manage_counsellor_notes to
  -- Head of School and Lead Guide roles (if they exist)
  FOR r IN
    SELECT DISTINCT tr.id AS role_id
    FROM tenant_roles tr
    WHERE tr.name IN ('Head of School', 'Lead Guide')
  LOOP
    FOR perm_id IN
      SELECT id FROM permissions
      WHERE key IN ('view_counsellor_notes', 'manage_counsellor_notes')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

COMMIT;
