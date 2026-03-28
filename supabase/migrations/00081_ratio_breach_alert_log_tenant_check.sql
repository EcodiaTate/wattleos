-- ============================================================
-- Migration 00081: ratio_breach_alert_log — add explicit tenant_id check
-- ============================================================
-- Security fix for Prompt 34.
--
-- ratio_breach_alert_log (migration 00053) gates SELECT via
-- has_permission() only:
--
--   USING (
--     has_permission(auth.uid(), tenant_id, 'view_ratios')
--     OR has_permission(auth.uid(), tenant_id, 'manage_floor_signin')
--   )
--
-- The has_permission() function takes (user_id, tenant_id, key) and
-- checks that the user has the permission *for that tenant_id*.
-- Technically this already scopes to the row's tenant, but only
-- indirectly — if a user somehow has 'view_ratios' on a different
-- tenant_id, they would see rows from that tenant too.
--
-- Adding tenant_id = current_tenant_id() makes the isolation
-- explicit and deterministic regardless of how has_permission()
-- is implemented.
-- ============================================================

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "ratio_breach_alert_log_tenant_select" ON ratio_breach_alert_log;

-- Recreate with explicit tenant_id guard alongside permission check
CREATE POLICY "ratio_breach_alert_log_tenant_select"
  ON ratio_breach_alert_log FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission(auth.uid(), tenant_id, 'view_ratios')
      OR has_permission(auth.uid(), tenant_id, 'manage_floor_signin')
    )
  );

-- Inserts remain service_role only — no change needed.
