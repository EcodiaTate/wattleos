-- Migration 00072: Fix notification_delivery_log and notification_topic_prefs cross-tenant leak
--
-- SECURITY FIX: Both tables have SELECT policies scoped to user_id = auth.uid()
-- only — no tenant scoping. A multi-tenant user sees delivery logs and
-- notification preferences from ALL their tenants when they should only
-- see the current tenant's data.
--
-- Also fixes notification_dispatches which uses a subquery on tenant_members
-- instead of current_tenant_id().

BEGIN;

-- ============================================================
-- notification_dispatches — replace tenant_members subquery
-- ============================================================

DROP POLICY IF EXISTS "Tenant members can view dispatches" ON notification_dispatches;
CREATE POLICY "Tenant members can view dispatches"
  ON notification_dispatches
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Service role policy is fine — leave it

-- ============================================================
-- notification_delivery_log — add tenant scoping
-- ============================================================

DROP POLICY IF EXISTS "Users see own delivery rows" ON notification_delivery_log;
CREATE POLICY "Users see own delivery rows"
  ON notification_delivery_log
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- Service role policy is fine — leave it

-- ============================================================
-- notification_topic_prefs — add tenant scoping
-- ============================================================

DROP POLICY IF EXISTS "Users manage own topic prefs" ON notification_topic_prefs;
CREATE POLICY "Users manage own topic prefs"
  ON notification_topic_prefs
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

COMMIT;
