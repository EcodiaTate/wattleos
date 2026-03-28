-- ============================================================
-- Migration 00078: SMS Gateway — Explicit tenant_id RLS guard
-- ============================================================
-- Security fix for Prompt 31.
--
-- sms_gateway_config and sms_messages (migration 00030) gate
-- access via has_permission() checks, but no policy includes
-- an explicit tenant_id = current_tenant_id() predicate.
--
-- Gap: if has_permission() ever has a bug or the permission
-- data is misconfigured, there is no second layer of tenant
-- isolation. Adding the explicit tenant check makes both tables
-- defence-in-depth compliant.
--
-- sms_gateway_config uses tenant_id as PK so the predicate is
-- a simple equality check. sms_messages has tenant_id as a
-- regular column.
-- ============================================================

-- ── sms_gateway_config ───────────────────────────────────────

-- Drop all existing policies
DROP POLICY IF EXISTS "sms_config_tenant_select" ON sms_gateway_config;
DROP POLICY IF EXISTS "sms_config_tenant_update" ON sms_gateway_config;
DROP POLICY IF EXISTS "sms_config_tenant_insert" ON sms_gateway_config;

-- Recreate with explicit tenant_id guard AND permission check
CREATE POLICY "sms_config_tenant_select"
  ON sms_gateway_config FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_sms_gateway')
  );

CREATE POLICY "sms_config_tenant_update"
  ON sms_gateway_config FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_sms_gateway')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_sms_gateway')
  );

CREATE POLICY "sms_config_tenant_insert"
  ON sms_gateway_config FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_sms_gateway')
  );

-- ── sms_messages ─────────────────────────────────────────────

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "sms_messages_tenant_select" ON sms_messages;

-- Recreate with explicit tenant_id guard AND permission check
CREATE POLICY "sms_messages_tenant_select"
  ON sms_messages FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission(auth.uid(), tenant_id, 'view_sms_gateway')
      OR has_permission(auth.uid(), tenant_id, 'manage_sms_gateway')
    )
  );

-- Inserts remain service_role only (no authenticated INSERT policy).
-- No change needed there.
