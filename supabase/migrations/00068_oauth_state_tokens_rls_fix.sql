-- ============================================================
-- 00068_oauth_state_tokens_rls_fix.sql
-- Fix wide-open ALL policy on oauth_state_tokens.
-- The existing "oauth_state_tokens_backend" policy uses
-- USING(true) WITH CHECK(true) with no role restriction,
-- allowing any authenticated user to read/write any tenant's
-- OAuth CSRF tokens — a session hijack vector.
-- ============================================================

-- Drop the wide-open ALL policy
DROP POLICY IF EXISTS "oauth_state_tokens_backend" ON public.oauth_state_tokens;

-- Drop the existing SELECT policy (replacing with tighter scoping below)
DROP POLICY IF EXISTS "oauth_state_tokens_access" ON public.oauth_state_tokens;

-- ────────────────────────────────────────────────────────────
-- Service-role only: these tokens are managed server-side
-- ────────────────────────────────────────────────────────────

CREATE POLICY "oauth_state_tokens_service_role"
  ON public.oauth_state_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- Allow the creating user to read their own token (SELECT only)
-- scoped to user_id via tenant membership + unexpired tokens
-- ────────────────────────────────────────────────────────────

CREATE POLICY "oauth_state_tokens_user_select"
  ON public.oauth_state_tokens
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND expires_at > now()
  );
