-- ============================================================
-- WattleOS V2 — Migration 00046: Tuckshop Ordering System
-- ============================================================
-- Tables:
--   tuckshop_suppliers       — vendor / supplier records
--   tuckshop_menu_items      — menu with price, category, available days
--   tuckshop_delivery_weeks  — weekly order cycles per supplier
--   tuckshop_orders          — per-student orders (draft→submitted→ready→collected)
--   tuckshop_order_items     — line items per order
-- ============================================================

-- ---- Suppliers -----------------------------------------------
CREATE TABLE tuckshop_suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  notes           TEXT,
  delivery_days   TEXT[] NOT NULL DEFAULT '{}',   -- e.g. ['monday','wednesday']
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tuckshop_suppliers_tenant_idx ON tuckshop_suppliers(tenant_id);

-- ---- Menu Items ----------------------------------------------
CREATE TABLE tuckshop_menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES tuckshop_suppliers(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,   -- e.g. 'hot_food', 'snack', 'drink', 'other'
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  available_days  TEXT[] NOT NULL DEFAULT '{}',  -- ['monday','tuesday',...]
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tuckshop_menu_items_tenant_idx ON tuckshop_menu_items(tenant_id);
CREATE INDEX tuckshop_menu_items_supplier_idx ON tuckshop_menu_items(supplier_id);

-- ---- Delivery Weeks ------------------------------------------
CREATE TYPE tuckshop_delivery_status AS ENUM (
  'open',       -- accepting orders
  'ordered',    -- coordinator has sent order to supplier
  'received',   -- goods received
  'finalized'   -- week closed, reports done
);

CREATE TABLE tuckshop_delivery_weeks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES tuckshop_suppliers(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  status          tuckshop_delivery_status NOT NULL DEFAULT 'open',
  notes           TEXT,
  ordered_at      TIMESTAMPTZ,
  ordered_by      UUID REFERENCES auth.users(id),
  received_at     TIMESTAMPTZ,
  finalized_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tuckshop_delivery_weeks_dates_check CHECK (week_end >= week_start)
);

CREATE INDEX tuckshop_delivery_weeks_tenant_idx ON tuckshop_delivery_weeks(tenant_id);
CREATE INDEX tuckshop_delivery_weeks_supplier_idx ON tuckshop_delivery_weeks(supplier_id);
CREATE INDEX tuckshop_delivery_weeks_week_idx ON tuckshop_delivery_weeks(week_start);

-- ---- Orders --------------------------------------------------
CREATE TYPE tuckshop_order_status AS ENUM (
  'draft',
  'submitted',
  'ready',
  'collected',
  'cancelled'
);

CREATE TABLE tuckshop_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  delivery_week_id      UUID REFERENCES tuckshop_delivery_weeks(id) ON DELETE SET NULL,
  order_date            DATE NOT NULL,
  status                tuckshop_order_status NOT NULL DEFAULT 'draft',
  total_price_cents     INTEGER NOT NULL DEFAULT 0 CHECK (total_price_cents >= 0),
  placed_by_user_id     UUID REFERENCES auth.users(id),
  notes                 TEXT,
  submitted_at          TIMESTAMPTZ,
  collected_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tuckshop_orders_tenant_idx ON tuckshop_orders(tenant_id);
CREATE INDEX tuckshop_orders_student_idx ON tuckshop_orders(student_id);
CREATE INDEX tuckshop_orders_delivery_week_idx ON tuckshop_orders(delivery_week_id);
CREATE INDEX tuckshop_orders_date_idx ON tuckshop_orders(order_date);
CREATE INDEX tuckshop_orders_status_idx ON tuckshop_orders(status);

-- ---- Order Items ---------------------------------------------
CREATE TABLE tuckshop_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES tuckshop_orders(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES tuckshop_menu_items(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tuckshop_order_items_order_idx ON tuckshop_order_items(order_id);
CREATE INDEX tuckshop_order_items_menu_item_idx ON tuckshop_order_items(menu_item_id);

-- ---- RLS -----------------------------------------------------
ALTER TABLE tuckshop_suppliers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_menu_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_delivery_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuckshop_order_items    ENABLE ROW LEVEL SECURITY;

-- Helpers reuse the pattern from other modules: service-role bypass via SECURITY DEFINER
-- (app layer enforces tenant_id filtering — matching pattern across WattleOS)

-- ---- Updated-at triggers ------------------------------------
CREATE OR REPLACE FUNCTION update_tuckshop_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER tuckshop_suppliers_updated_at
  BEFORE UPDATE ON tuckshop_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_tuckshop_updated_at();

CREATE TRIGGER tuckshop_menu_items_updated_at
  BEFORE UPDATE ON tuckshop_menu_items
  FOR EACH ROW EXECUTE FUNCTION update_tuckshop_updated_at();

CREATE TRIGGER tuckshop_delivery_weeks_updated_at
  BEFORE UPDATE ON tuckshop_delivery_weeks
  FOR EACH ROW EXECUTE FUNCTION update_tuckshop_updated_at();

CREATE TRIGGER tuckshop_orders_updated_at
  BEFORE UPDATE ON tuckshop_orders
  FOR EACH ROW EXECUTE FUNCTION update_tuckshop_updated_at();
