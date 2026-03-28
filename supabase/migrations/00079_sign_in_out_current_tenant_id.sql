-- ============================================================
-- Migration 00079: sign_in_out_records — replace raw JWT with current_tenant_id()
-- ============================================================
-- Security fix for Prompt 32.
--
-- sign_in_out_records (migration 00017) uses raw JWT extraction:
--
--   tenant_id = (SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::UUID)
--
-- This is inconsistent with every other table in the codebase
-- which uses the current_tenant_id() helper function.
-- Raw extraction has two drawbacks:
--   1. Inconsistency — if the helper ever changes its logic
--      (e.g. adding fail-closed NULL behaviour from migration 00070),
--      raw extraction won't benefit.
--   2. Verbosity / fragility — embedding the JWT path inline is
--      harder to maintain and easier to get wrong.
--
-- Replace the ALL policy with equivalent separate policies
-- (SELECT / INSERT / UPDATE / DELETE) each using current_tenant_id().
-- ============================================================

-- Drop the old all-in-one policy
DROP POLICY IF EXISTS "sign_in_out_tenant_isolation" ON sign_in_out_records;

-- Recreate as four explicit policies using current_tenant_id()
CREATE POLICY "sign_in_out_select"
  ON sign_in_out_records FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "sign_in_out_insert"
  ON sign_in_out_records FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "sign_in_out_update"
  ON sign_in_out_records FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "sign_in_out_delete"
  ON sign_in_out_records FOR DELETE
  USING (tenant_id = current_tenant_id());
