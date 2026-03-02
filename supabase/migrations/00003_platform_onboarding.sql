-- ============================================================
-- WattleOS V2 — Module 3: Platform Onboarding
-- ============================================================
-- Enables the WattleOS team to provision new school tenants,
-- send owner setup links, and track platform-level billing.
--
-- Changes:
--   • users.is_platform_admin  — WattleOS staff flag
--   • tenants billing columns  — platform Stripe subscription
--   • tenant_setup_tokens      — time-limited owner setup links
-- ============================================================

-- ============================================================
-- 1. PLATFORM ADMIN FLAG ON USERS
-- ============================================================
-- WattleOS staff only. NOT a tenant-level role.
-- Set manually in Supabase dashboard or via superadmin action.
-- ============================================================

ALTER TABLE users ADD COLUMN is_platform_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_users_platform_admin ON users (is_platform_admin) WHERE is_platform_admin = true;

-- Helper function used in RLS policies below
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND is_platform_admin = true
  );
$$;

-- ============================================================
-- 2. PLATFORM BILLING COLUMNS ON TENANTS
-- ============================================================
-- Tracks the WattleOS → school subscription (distinct from the
-- school → parent billing already in invoices/payments tables).
--
-- subscription_status mirrors Stripe's status enum plus
-- 'setup_pending' for newly provisioned tenants awaiting setup.
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'setup_pending'
    CHECK (subscription_status IN (
      'setup_pending', 'trialing', 'active', 'past_due', 'canceled', 'suspended'
    )),
  ADD COLUMN stripe_platform_customer_id   TEXT,
  ADD COLUMN stripe_platform_subscription_id TEXT,
  ADD COLUMN trial_ends_at    TIMESTAMPTZ,
  ADD COLUMN activated_at     TIMESTAMPTZ;

CREATE INDEX idx_tenants_subscription_status ON tenants (subscription_status);
CREATE INDEX idx_tenants_stripe_platform_subscription ON tenants (stripe_platform_subscription_id)
  WHERE stripe_platform_subscription_id IS NOT NULL;

-- ============================================================
-- 3. TABLE: tenant_setup_tokens
-- ============================================================
-- Single-use, time-limited token sent to a school's primary
-- contact after a demo. They click the link, sign in with
-- Google, and become the Owner of their tenant.
--
-- WHY separate from parent_invitations: this creates an Owner
-- (full access, including tenant settings), not a Parent.
-- The semantics and downstream effects are completely different.
-- ============================================================

CREATE TABLE tenant_setup_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who the link was sent to. Validated on acceptance — they must
  -- sign in with exactly this email address.
  email         TEXT NOT NULL,

  -- Cryptographically random 32-byte hex token. Travels as a URL param.
  token         TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Token expires after 72 hours. Platform admin can regenerate if needed.
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + interval '72 hours',

  -- Set on acceptance. NULL means the token has not been used yet.
  used_at       TIMESTAMPTZ,
  used_by       UUID REFERENCES users(id),

  -- Audit
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_setup_tokens_tenant    ON tenant_setup_tokens (tenant_id);
CREATE INDEX idx_setup_tokens_token     ON tenant_setup_tokens (token);
CREATE INDEX idx_setup_tokens_email     ON tenant_setup_tokens (email);
CREATE INDEX idx_setup_tokens_unused    ON tenant_setup_tokens (tenant_id) WHERE used_at IS NULL;

ALTER TABLE tenant_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage setup tokens. Everything else is admin-client only.
CREATE POLICY "Platform admins can manage setup tokens" ON tenant_setup_tokens
  FOR ALL
  USING (is_platform_admin());
