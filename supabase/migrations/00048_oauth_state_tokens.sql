/**
 * supabase/migrations/00048_oauth_state_tokens.sql
 *
 * ============================================================
 * OAuth State Tokens Table
 * ============================================================
 * Temporary storage for CSRF protection during OAuth flows.
 * Tokens expire after 10 minutes and are deleted on use.
 */

-- Create oauth_state_tokens table for CSRF protection
CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Indices
  CONSTRAINT state_not_empty CHECK (state::text != '')
);

-- Index for fast state lookup and expiry cleanup
CREATE INDEX IF NOT EXISTS oauth_state_tokens_tenant_id_idx ON public.oauth_state_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS oauth_state_tokens_state_idx ON public.oauth_state_tokens(state);
CREATE INDEX IF NOT EXISTS oauth_state_tokens_expires_at_idx ON public.oauth_state_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can access their own tenant's state tokens
CREATE POLICY "oauth_state_tokens_access" ON public.oauth_state_tokens
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Policy: Service role (backend) can manage state tokens
CREATE POLICY "oauth_state_tokens_backend" ON public.oauth_state_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
