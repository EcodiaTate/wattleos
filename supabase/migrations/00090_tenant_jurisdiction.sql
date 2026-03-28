-- supabase/migrations/00090_tenant_jurisdiction.sql
--
-- ============================================================
-- WattleOS V2 - Tenant Jurisdiction / State (Prompt 50)
-- ============================================================
-- Adds a `state` column to tenants to track which Australian
-- state or territory the school operates in.
--
-- WHY: Certain reporting fields are state-specific. The religion
-- field is required for QLD independent schools (ISQ reporting)
-- but is not collected by schools in other states. Collecting
-- religion data unnecessarily violates APP 3.2 (minimum
-- necessary collection).
--
-- Using TEXT with a CHECK constraint rather than a FK to a
-- states table — there are only 8 Australian states/territories
-- and they never change.
--
-- 'OTHER' covers international schools or edge cases.
-- NULL means not yet configured (treated as non-QLD in UI).
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS state TEXT
    CHECK (state IN ('ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA', 'OTHER'));

COMMENT ON COLUMN tenants.state IS
  'Australian state/territory for jurisdiction-specific reporting (e.g. ISQ for QLD). NULL = not configured.';

-- Also extend UpdateTenantGeneralInput shape by allowing this
-- column to be updated via the existing updateTenantGeneralSettings
-- server action — handled in tenant-settings.ts.
