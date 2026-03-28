-- Migration: Auth failed login tracking table
-- Security: Track failed login attempts for brute-force detection and lockout.
-- The table is service_role-only (no user access) since entries are created
-- by the auth webhook handler, not by end users.

CREATE TABLE IF NOT EXISTS auth_failed_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Index for lockout threshold queries (email + time window)
CREATE INDEX idx_auth_failed_logins_email_time
  ON auth_failed_logins (email, attempted_at DESC);

-- Index for IP-based anomaly detection
CREATE INDEX idx_auth_failed_logins_ip_time
  ON auth_failed_logins (ip_address, attempted_at DESC);

-- Enable RLS and restrict to service_role only
ALTER TABLE auth_failed_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON auth_failed_logins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: remove entries older than 90 days (no retention requirement)
-- This can be called from a cron job
CREATE OR REPLACE FUNCTION cleanup_old_failed_logins()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth_failed_logins
  WHERE attempted_at < now() - INTERVAL '90 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION cleanup_old_failed_logins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_failed_logins() TO service_role;
