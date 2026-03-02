-- 00047_tuckshop_permissions_backfill.sql
--
-- Seeds the two new tuckshop permissions and grants them to existing
-- tenant roles using the same pattern as 00014_backfill_owner_admin_permissions.sql

-- ============================================================
-- 1. Seed permissions
-- ============================================================

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_tuckshop',      'Manage Tuckshop',      'tuckshop', 'Create and manage tuckshop suppliers, menu items, delivery weeks, and orders'),
  ('place_tuckshop_order', 'Place Tuckshop Order', 'tuckshop', 'Browse the tuckshop menu and place orders for children')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. Backfill existing tenants
-- ============================================================

DO $$
DECLARE
  r_tenant  RECORD;
  v_owner   UUID;
  v_admin   UUID;
  v_head    UUID;
  v_parent  UUID;
BEGIN
  FOR r_tenant IN SELECT id FROM tenants LOOP

    -- ── Owner: all permissions (already granted globally, but belt-and-suspenders) ──
    SELECT id INTO v_owner FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Owner' AND is_system = true;

    IF v_owner IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_owner, p.id
      FROM permissions p
      WHERE p.key IN ('manage_tuckshop', 'place_tuckshop_order')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Administrator: manage + place ──────────────────────────
    SELECT id INTO v_admin FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Administrator' AND is_system = true;

    IF v_admin IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_admin, p.id
      FROM permissions p
      WHERE p.key IN ('manage_tuckshop', 'place_tuckshop_order')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Head of School: manage + place ────────────────────────
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.key IN ('manage_tuckshop', 'place_tuckshop_order')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Parent: place orders only ──────────────────────────────
    SELECT id INTO v_parent FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Parent' AND is_system = true;

    IF v_parent IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_parent, p.id
      FROM permissions p
      WHERE p.key = 'place_tuckshop_order'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;
