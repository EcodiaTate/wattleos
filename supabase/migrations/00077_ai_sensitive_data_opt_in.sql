-- ST4S compliance: sensitive AI tools (medical, custody, wellbeing, ILP) are
-- OFF by default and only enabled via explicit per-tenant opt-in.
ALTER TABLE tenants
  ADD COLUMN ai_sensitive_data_enabled BOOLEAN NOT NULL DEFAULT false;
