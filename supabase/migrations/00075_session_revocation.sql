-- ============================================================
-- Migration 00075: Server-side session revocation
-- ============================================================
-- signOutAction() clears cookies but does not invalidate the
-- token server-side. A stolen JWT remains valid until natural
-- expiry. This adds a signed_out_at column so the middleware
-- can reject JWTs issued before logout.
--
-- Also adds a session_revocations table for admin force-logout.
-- ============================================================

-- Add signed_out_at to tenant_users for per-tenant session tracking
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS signed_out_at TIMESTAMPTZ;

-- Index for fast lookup during middleware JWT validation
CREATE INDEX IF NOT EXISTS idx_tenant_users_signout
  ON tenant_users (user_id, tenant_id, signed_out_at)
  WHERE signed_out_at IS NOT NULL;

-- ── Session revocations table for admin force-logout ────────
-- WHY separate table: tenant_users.signed_out_at tracks normal
-- logout. This table provides an audit trail of forced logouts
-- with the admin who initiated it and the reason.
CREATE TABLE session_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  revoked_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_revocations_target
  ON session_revocations (target_user_id, revoked_at DESC);

ALTER TABLE session_revocations ENABLE ROW LEVEL SECURITY;

-- Only admins with manage_users can view/create revocations
CREATE POLICY session_revocations_select ON session_revocations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_users')
  );

CREATE POLICY session_revocations_insert ON session_revocations
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_users')
  );

-- Service role bypass for the force-logout API
CREATE POLICY session_revocations_service ON session_revocations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
