-- supabase/migrations/00025_material_shelf_inventory.sql
--
-- ============================================================
-- Material / Shelf Inventory
-- ============================================================
-- Montessori environments rely on carefully curated, meticulously
-- maintained physical materials. This module tracks:
--
--   material_shelf_locations  — rooms/environments (Practical Life,
--                               Sensorial Room, etc.)
--   material_inventory_items  — physical instances of curriculum
--                               materials: condition, location, status
--
-- The "date introduced to each child" view is derived live
-- from lesson_records (first presentation_date per student+material)
-- to avoid denormalisation — no extra table required.
--
-- Condition workflow:
--   excellent → good → fair → damaged → (repaired → good) | (retired)
--
-- Status workflow:
--   on_order → available
--   available → in_use → available
--   available | in_use → being_repaired → available
--   any → retired
-- ============================================================

-- ============================================================
-- 1. material_shelf_locations
-- ============================================================
-- Physical rooms or areas in the school that house materials.
-- e.g., "3–6 Practical Life Shelf", "6–9 Mathematics Room"
-- ============================================================

CREATE TABLE IF NOT EXISTS material_shelf_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description  TEXT,
  -- Free-text room type hint for grouping in the UI:
  -- e.g. 'practical_life', 'sensorial', 'language', 'mathematics', 'cultural', 'other'
  room_type    TEXT CHECK (room_type IN (
    'practical_life', 'sensorial', 'language', 'mathematics', 'cultural', 'other'
  )),
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT material_shelf_locations_name_unique
    UNIQUE NULLS NOT DISTINCT (tenant_id, name, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_material_shelf_locations_tenant
  ON material_shelf_locations(tenant_id, sort_order)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('material_shelf_locations');
ALTER TABLE material_shelf_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on material_shelf_locations"
  ON material_shelf_locations FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- 2. material_inventory_items
-- ============================================================
-- A physical instance of a curriculum material.
-- One MontessoriMaterial (curriculum blueprint) may have
-- zero or more inventory items (physical copies/sets).
-- ============================================================

CREATE TYPE material_condition AS ENUM (
  'excellent',  -- pristine, no wear
  'good',       -- minor wear, fully functional
  'fair',       -- visible wear but still usable
  'damaged'     -- missing pieces or unusable, requires action
);

CREATE TYPE material_inventory_status AS ENUM (
  'available',       -- on shelf, ready to use
  'in_use',          -- currently taken out by a student
  'being_repaired',  -- with maintenance, temporarily unavailable
  'on_order',        -- ordered but not yet received
  'retired'          -- removed from service
);

CREATE TABLE IF NOT EXISTS material_inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  material_id         UUID NOT NULL REFERENCES montessori_materials(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES material_shelf_locations(id) ON DELETE SET NULL,

  -- Physical state
  condition           material_condition NOT NULL DEFAULT 'good',
  status              material_inventory_status NOT NULL DEFAULT 'available',

  -- Quantity (number of pieces in this set/item)
  quantity            SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Precise shelf position within the location (free text)
  -- e.g. "Row 2, Position 4", "Top shelf left"
  shelf_position      TEXT,

  -- Provenance & maintenance
  date_acquired       DATE,
  last_inspected_at   DATE,
  serial_number       TEXT,          -- manufacturer or school reference
  photo_url           TEXT,          -- optional material photo

  -- History notes (condition change, repair notes, etc.)
  notes               TEXT,

  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_material_inventory_tenant
  ON material_inventory_items(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_inventory_material
  ON material_inventory_items(material_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_inventory_location
  ON material_inventory_items(location_id)
  WHERE location_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_inventory_status
  ON material_inventory_items(tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_inventory_condition
  ON material_inventory_items(tenant_id, condition)
  WHERE deleted_at IS NULL;

-- For "overdue inspection" queries (last_inspected_at is NULL or old)
CREATE INDEX IF NOT EXISTS idx_material_inventory_inspected
  ON material_inventory_items(tenant_id, last_inspected_at)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('material_inventory_items');
ALTER TABLE material_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation on material_inventory_items"
  ON material_inventory_items FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- 3. Permissions
-- ============================================================

INSERT INTO permissions (key, description, module_group) VALUES
  (
    'view_material_inventory',
    'View material inventory items and shelf locations',
    'material_inventory'
  ),
  (
    'manage_material_inventory',
    'Create, update, inspect, and retire material inventory items',
    'material_inventory'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. Backfill permissions + seed default shelf locations
-- ============================================================

DO $$
DECLARE
  t         RECORD;
  owner_id  UUID;
  admin_id  UUID;
  hos_id    UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP

    -- Grant permissions to standard admin roles
    SELECT id INTO owner_id FROM roles WHERE tenant_id = t.id AND name = 'Owner'         LIMIT 1;
    SELECT id INTO admin_id FROM roles WHERE tenant_id = t.id AND name = 'Admin'          LIMIT 1;
    SELECT id INTO hos_id   FROM roles WHERE tenant_id = t.id AND name = 'Head of School' LIMIT 1;

    IF owner_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES
        (owner_id, 'view_material_inventory'),
        (owner_id, 'manage_material_inventory')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
    END IF;

    IF admin_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES
        (admin_id, 'view_material_inventory'),
        (admin_id, 'manage_material_inventory')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
    END IF;

    -- Head of School gets view + manage (they supervise prepared environment)
    IF hos_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES
        (hos_id, 'view_material_inventory'),
        (hos_id, 'manage_material_inventory')
      ON CONFLICT (role_id, permission_key) DO NOTHING;
    END IF;

    -- Seed default shelf locations for this tenant
    INSERT INTO material_shelf_locations
      (tenant_id, name, room_type, description, sort_order)
    VALUES
      (t.id, 'Practical Life Shelf',     'practical_life', '3–6 Practical Life area materials', 1),
      (t.id, 'Sensorial Shelf',          'sensorial',      '3–6 Sensorial materials',            2),
      (t.id, 'Language Shelf',           'language',       '3–6 Language and literacy materials',3),
      (t.id, 'Mathematics Shelf',        'mathematics',    '3–6 Mathematics materials',          4),
      (t.id, 'Cultural Shelf',           'cultural',       '3–6 Cultural studies materials',     5),
      (t.id, 'Elementary Materials',     'other',          '6–12 programme materials',           6),
      (t.id, 'Storage / Not on Shelf',   'other',          'Materials in storage, not displayed', 7)
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;
