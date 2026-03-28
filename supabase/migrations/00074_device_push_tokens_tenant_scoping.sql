-- ============================================================
-- Migration 00074: Fix device_push_tokens tenant scoping
-- ============================================================
-- device_push_tokens (migration 00006) has an RLS policy
-- scoped to auth.uid() only - no tenant_id check. In a
-- multi-tenant scenario, push tokens from all tenants are
-- accessible to the user.
--
-- The table already has a tenant_id column, so we just need
-- to update the RLS policy to include tenant scoping.
-- ============================================================

-- Drop the existing user-only policy
DROP POLICY IF EXISTS "Users manage own push tokens" ON device_push_tokens;

-- Replace with tenant + user scoped policies
CREATE POLICY device_push_tokens_select ON device_push_tokens
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY device_push_tokens_insert ON device_push_tokens
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY device_push_tokens_update ON device_push_tokens
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

CREATE POLICY device_push_tokens_delete ON device_push_tokens
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );
