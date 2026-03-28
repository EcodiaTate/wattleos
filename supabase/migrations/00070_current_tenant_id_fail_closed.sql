-- ============================================================
-- 00070_current_tenant_id_fail_closed.sql
-- Replace fail-open current_tenant_id() with fail-closed version.
--
-- Previously returned '00000000-0000-0000-0000-000000000000'
-- when tenant_id was absent from the JWT. Any RLS policy using
-- tenant_id = current_tenant_id() would match rows with the
-- all-zeros UUID. Now returns NULL, which matches no rows.
-- ============================================================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$;
