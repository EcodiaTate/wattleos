-- ============================================================
-- Migration 00076: MFA enrollment support
-- ============================================================
-- Adds tenant-level MFA enforcement settings, backup codes
-- table, and the manage_mfa_policy permission.
--
-- Supabase handles TOTP factor storage natively via
-- auth.mfa_factors / auth.mfa_challenges. This migration
-- adds the WattleOS-specific layers on top.
-- ============================================================

-- ── Tenant-level MFA settings ───────────────────────────────
-- WHY on tenants table: MFA policy is a school-wide decision.
-- The admin configures which roles require MFA, and the system
-- enforces it during the post-login flow.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS require_mfa_for_roles TEXT[] NOT NULL DEFAULT ARRAY['Owner', 'Administrator'];

-- ── MFA backup codes ────────────────────────────────────────
-- WHY separate table: Supabase TOTP doesn't provide backup codes.
-- Users need a recovery path if they lose their authenticator.
-- Codes are stored as bcrypt hashes so they can't be read back.
CREATE TABLE mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_backup_codes_user
  ON mfa_backup_codes (user_id)
  WHERE used_at IS NULL;

ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own backup codes
CREATE POLICY mfa_backup_codes_select ON mfa_backup_codes
  FOR SELECT USING (user_id = auth.uid());

-- Only service role can insert/update (server-side generation)
CREATE POLICY mfa_backup_codes_service ON mfa_backup_codes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Permission: manage_mfa_policy ───────────────────────────
INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_mfa_policy', 'Manage MFA Policy', 'admin',
   'Configure which roles require multi-factor authentication')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner and Administrator roles
DO $$
DECLARE
  r RECORD;
  perm_id UUID;
BEGIN
  SELECT id INTO perm_id FROM permissions WHERE key = 'manage_mfa_policy';
  IF perm_id IS NOT NULL THEN
    FOR r IN
      SELECT DISTINCT rp.role_id
      FROM roles
      JOIN role_permissions rp ON rp.role_id = roles.id
      WHERE roles.name IN ('Owner', 'Administrator')
      GROUP BY rp.role_id
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, tenant_id)
      SELECT r.role_id, perm_id, tu.tenant_id
      FROM tenant_users tu
      WHERE tu.role_id = r.role_id
      GROUP BY tu.tenant_id
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
