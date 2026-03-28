-- 00084_ai_disable_sensitive_tools.sql
--
-- Adds ai_disable_sensitive_tools to the tenants table.
--
-- Two-flag AI consent model (Prompt 38):
--
--   ai_sensitive_data_enabled (BOOL, added in 00077, default false)
--     Tenant owner/admin enables this to permit Ask Wattle to call
--     medical, custody, emergency, and student data tools.
--     Requires explicit consent acknowledgment in the UI.
--
--   ai_disable_sensitive_tools (BOOL, default false)
--     Hard kill-switch. When TRUE, sensitive tools are stripped from
--     the OpenAI tool set entirely, regardless of the opt-in flag.
--     Useful when a tenant wants to temporarily disable AI data
--     access without revoking consent (e.g. during an audit).
--
-- The route.ts checks:
--   sensitiveToolsEnabled = ai_sensitive_data_enabled
--                           AND NOT ai_disable_sensitive_tools

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ai_disable_sensitive_tools BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.ai_disable_sensitive_tools IS
  'Hard kill-switch: when true, sensitive AI tools (medical, custody, emergency) are removed from Ask Wattle tool set entirely, overriding ai_sensitive_data_enabled.';
