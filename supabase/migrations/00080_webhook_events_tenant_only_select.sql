-- ============================================================
-- Migration 00080: webhook_events — remove OR tenant_id IS NULL from SELECT
-- ============================================================
-- Security fix for Prompt 33.
--
-- webhook_events (migration 00056) has this SELECT policy:
--
--   USING (
--     tenant_id = current_tenant_id()
--     OR tenant_id IS NULL   ← exposes platform-wide events to any tenant user
--   )
--
-- The comment in 00056 says "platform-level events visible to
-- super-admins" but there is no super-admin check — ANY
-- authenticated user whose tenant resolves via current_tenant_id()
-- also sees every NULL-tenant (platform-wide) event. This means
-- a school admin at Tenant A can read raw Stripe webhook payloads
-- that may contain billing data for Tenant B (before tenant_id
-- was resolved during processing).
--
-- Fix:
--   • Normal tenant users see only their own tenant's events.
--   • Platform-level events (tenant_id IS NULL) are restricted to
--     service_role, which bypasses RLS anyway. No extra policy
--     is needed for that path.
-- ============================================================

-- Drop the existing wide SELECT policy
DROP POLICY IF EXISTS "Admins can view webhook events for their tenant" ON webhook_events;

-- Recreate scoped to tenant only — no OR NULL escape hatch
CREATE POLICY "webhook_events_tenant_select"
  ON webhook_events FOR SELECT
  USING (tenant_id = current_tenant_id());

-- INSERT/UPDATE remain service_role only (no authenticated policy).
-- GRANT SELECT on webhook_events TO authenticated already exists from 00056.
