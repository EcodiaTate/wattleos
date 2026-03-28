-- Migration 00074: Add RLS policies to all tuckshop tables
--
-- SECURITY FIX: All 5 tuckshop tables have RLS enabled but ZERO policies
-- defined. This means all access is denied (including via anon key).
-- Only service_role can currently access these tables.
--
-- Also adds tenant_id column to tuckshop_order_items (which lacks it)
-- and backfills from parent tuckshop_orders.

BEGIN;

-- ============================================================
-- Step 1: Add tenant_id to tuckshop_order_items
-- ============================================================

ALTER TABLE tuckshop_order_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill tenant_id from parent tuckshop_orders
UPDATE tuckshop_order_items oi
SET tenant_id = o.tenant_id
FROM tuckshop_orders o
WHERE oi.order_id = o.id
  AND oi.tenant_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE tuckshop_order_items
  ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for RLS performance
CREATE INDEX IF NOT EXISTS tuckshop_order_items_tenant_idx
  ON tuckshop_order_items(tenant_id);

-- ============================================================
-- Step 2: tuckshop_suppliers — admin-managed, tenant-scoped
-- ============================================================

CREATE POLICY "tuckshop_suppliers_select" ON tuckshop_suppliers
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_suppliers_insert" ON tuckshop_suppliers
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_suppliers_update" ON tuckshop_suppliers
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_suppliers_delete" ON tuckshop_suppliers
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- Step 3: tuckshop_menu_items — readable by all tenant users,
-- writable by staff with manage_tuckshop
-- ============================================================

CREATE POLICY "tuckshop_menu_items_select" ON tuckshop_menu_items
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_menu_items_insert" ON tuckshop_menu_items
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_menu_items_update" ON tuckshop_menu_items
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_menu_items_delete" ON tuckshop_menu_items
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- Step 4: tuckshop_delivery_weeks — admin-managed
-- ============================================================

CREATE POLICY "tuckshop_delivery_weeks_select" ON tuckshop_delivery_weeks
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_delivery_weeks_insert" ON tuckshop_delivery_weeks
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_delivery_weeks_update" ON tuckshop_delivery_weeks
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY "tuckshop_delivery_weeks_delete" ON tuckshop_delivery_weeks
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- Step 5: tuckshop_orders — staff can see all tenant orders,
-- parents can see their own children's orders via placed_by_user_id
-- ============================================================

CREATE POLICY "tuckshop_orders_select" ON tuckshop_orders
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      -- Staff with tuckshop permission see all tenant orders
      has_permission('manage_tuckshop')
      -- Parents see orders they placed
      OR placed_by_user_id = auth.uid()
    )
  );

CREATE POLICY "tuckshop_orders_insert" ON tuckshop_orders
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_tuckshop')
      OR has_permission('place_tuckshop_order')
    )
  );

CREATE POLICY "tuckshop_orders_update" ON tuckshop_orders
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_tuckshop')
      -- Parents can update their own draft orders
      OR (placed_by_user_id = auth.uid() AND status = 'draft')
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
  );

CREATE POLICY "tuckshop_orders_delete" ON tuckshop_orders
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_tuckshop')
  );

-- ============================================================
-- Step 6: tuckshop_order_items — follows parent order access
-- ============================================================

CREATE POLICY "tuckshop_order_items_select" ON tuckshop_order_items
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_tuckshop')
      -- Parent can see items in their own orders
      OR order_id IN (
        SELECT id FROM tuckshop_orders
        WHERE placed_by_user_id = auth.uid()
          AND tenant_id = current_tenant_id()
      )
    )
  );

CREATE POLICY "tuckshop_order_items_insert" ON tuckshop_order_items
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_tuckshop')
      OR has_permission('place_tuckshop_order')
    )
  );

CREATE POLICY "tuckshop_order_items_update" ON tuckshop_order_items
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_tuckshop')
      OR order_id IN (
        SELECT id FROM tuckshop_orders
        WHERE placed_by_user_id = auth.uid()
          AND tenant_id = current_tenant_id()
          AND status = 'draft'
      )
    )
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
  );

CREATE POLICY "tuckshop_order_items_delete" ON tuckshop_order_items
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_tuckshop')
      OR order_id IN (
        SELECT id FROM tuckshop_orders
        WHERE placed_by_user_id = auth.uid()
          AND tenant_id = current_tenant_id()
          AND status = 'draft'
      )
    )
  );

COMMIT;
