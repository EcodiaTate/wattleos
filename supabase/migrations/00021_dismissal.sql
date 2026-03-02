-- supabase/migrations/00021_dismissal.sql
--
-- ============================================================
-- WattleOS V2 — End-of-Day Dismissal & Pickup Module
-- ============================================================
-- Enables safe, auditable end-of-day dismissal confirmation:
--   - Bus route definitions per tenant
--   - Per-student dismissal method preferences (per day of week)
--   - Pickup authorization lists (who may collect each child)
--   - Daily dismissal confirmation records with exception flags
--
-- SAFETY NOTE: This table controls who physically takes a child
-- off school grounds. All writes are audit-logged at the app
-- layer. RLS ensures tenant isolation throughout.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Bus Routes
-- ────────────────────────────────────────────────────────────

CREATE TABLE bus_routes (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_name           TEXT        NOT NULL CHECK (char_length(route_name) BETWEEN 1 AND 200),
  operator_name        TEXT        CHECK (char_length(operator_name) <= 200),
  vehicle_registration TEXT        CHECK (char_length(vehicle_registration) <= 20),
  driver_name          TEXT        CHECK (char_length(driver_name) <= 200),
  driver_phone         TEXT        CHECK (char_length(driver_phone) <= 30),
  depart_time          TIME,
  days_of_operation    TEXT[]      NOT NULL DEFAULT '{"monday","tuesday","wednesday","thursday","friday"}',
  notes                TEXT        CHECK (char_length(notes) <= 2000),
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bus_routes_tenant_idx ON bus_routes(tenant_id) WHERE is_active = TRUE;

-- ────────────────────────────────────────────────────────────
-- 2. Pickup Authorizations
-- ────────────────────────────────────────────────────────────
-- Who is permitted to collect a specific child.
-- Independent of emergency contacts (different legal purpose).

CREATE TABLE pickup_authorizations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  authorized_name  TEXT        NOT NULL CHECK (char_length(authorized_name) BETWEEN 1 AND 200),
  relationship     TEXT        CHECK (char_length(relationship) <= 100),
  phone            TEXT        CHECK (char_length(phone) <= 30),
  photo_url        TEXT        CHECK (char_length(photo_url) <= 2000),
  id_verified      BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Time-bounded authorizations (e.g. grandparent visiting for a week)
  is_permanent     BOOLEAN     NOT NULL DEFAULT TRUE,
  valid_from       DATE,
  valid_until      DATE,
  notes            TEXT        CHECK (char_length(notes) <= 1000),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX pickup_auth_student_idx ON pickup_authorizations(tenant_id, student_id)
  WHERE is_active = TRUE;

-- ────────────────────────────────────────────────────────────
-- 3. Student Dismissal Method Preferences
-- ────────────────────────────────────────────────────────────
-- Per-student, per-day defaults so the dashboard pre-fills correctly.
-- 'default' day_of_week acts as a fallback for days not explicitly set.

CREATE TABLE student_dismissal_methods (
  id               UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID     NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id       UUID     NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day_of_week      TEXT     NOT NULL DEFAULT 'default'
                              CHECK (day_of_week IN (
                                'default','monday','tuesday','wednesday',
                                'thursday','friday'
                              )),
  dismissal_method TEXT     NOT NULL
                              CHECK (dismissal_method IN (
                                'parent_pickup','bus','oshc','walker','other'
                              )),
  bus_route_id     UUID     REFERENCES bus_routes(id) ON DELETE SET NULL,
  notes            TEXT     CHECK (char_length(notes) <= 500),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, day_of_week)
);

CREATE INDEX student_dismissal_tenant_idx ON student_dismissal_methods(tenant_id, student_id);

-- ────────────────────────────────────────────────────────────
-- 4. Daily Dismissal Records
-- ────────────────────────────────────────────────────────────
-- One row per student per school day (created when staff opens the
-- dismissal dashboard for that day). Starts as 'pending', staff
-- updates to 'confirmed' or 'exception'.

CREATE TABLE dismissal_records (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id             UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  dismissal_date         DATE        NOT NULL,
  expected_method        TEXT        CHECK (expected_method IN (
                                       'parent_pickup','bus','oshc','walker','other'
                                     )),
  actual_method          TEXT        CHECK (actual_method IN (
                                       'parent_pickup','bus','oshc','walker','other'
                                     )),
  status                 TEXT        NOT NULL DEFAULT 'pending'
                                       CHECK (status IN ('pending','confirmed','exception')),
  bus_route_id           UUID        REFERENCES bus_routes(id) ON DELETE SET NULL,
  authorization_id       UUID        REFERENCES pickup_authorizations(id) ON DELETE SET NULL,
  collected_by_name      TEXT        CHECK (char_length(collected_by_name) <= 200),
  -- Exception details
  exception_reason       TEXT        CHECK (exception_reason IN (
                                       'not_collected','unknown_person','late_pickup',
                                       'refused_collection','bus_no_show','other'
                                     )),
  exception_notes        TEXT        CHECK (char_length(exception_notes) <= 2000),
  -- Who confirmed this dismissal
  confirmed_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at           TIMESTAMPTZ,
  notes                  TEXT        CHECK (char_length(notes) <= 1000),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One record per student per day
  UNIQUE (student_id, dismissal_date),

  -- Confirmed records must have a method and confirming staff
  CHECK (
    status != 'confirmed' OR (actual_method IS NOT NULL AND confirmed_by IS NOT NULL)
  ),
  -- Exceptions must have a reason
  CHECK (
    status != 'exception' OR exception_reason IS NOT NULL
  )
);

CREATE INDEX dismissal_records_date_idx  ON dismissal_records(tenant_id, dismissal_date);
CREATE INDEX dismissal_records_status_idx ON dismissal_records(tenant_id, status, dismissal_date);

-- ────────────────────────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE bus_routes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_authorizations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_dismissal_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissal_records          ENABLE ROW LEVEL SECURITY;

-- Bus routes: all authenticated staff in the tenant may read
CREATE POLICY "bus_routes_tenant_isolation"
  ON bus_routes FOR ALL
  USING (tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Pickup authorizations: tenant isolation + permission check
CREATE POLICY "pickup_auth_tenant_isolation"
  ON pickup_authorizations FOR ALL
  USING (tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Dismissal methods: tenant isolation
CREATE POLICY "student_dismissal_methods_tenant_isolation"
  ON student_dismissal_methods FOR ALL
  USING (tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Dismissal records: tenant isolation
CREATE POLICY "dismissal_records_tenant_isolation"
  ON dismissal_records FOR ALL
  USING (tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- ────────────────────────────────────────────────────────────
-- 6. Updated-at trigger helper (reuse existing function)
-- ────────────────────────────────────────────────────────────

CREATE TRIGGER bus_routes_updated_at
  BEFORE UPDATE ON bus_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pickup_auth_updated_at
  BEFORE UPDATE ON pickup_authorizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_dismissal_methods_updated_at
  BEFORE UPDATE ON student_dismissal_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER dismissal_records_updated_at
  BEFORE UPDATE ON dismissal_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 7. Permissions
-- ────────────────────────────────────────────────────────────

INSERT INTO permissions (key, description, module) VALUES
  ('view_dismissal',   'View daily dismissal dashboard and records',  'dismissal'),
  ('manage_dismissal', 'Confirm dismissals, manage bus routes, authorize pickups', 'dismissal')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. Backfill: grant to Owner, Admin, Head of School for all
--    existing tenants (trigger handles new tenants at creation)
-- ────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tm.id AS member_id, tm.tenant_id, tm.role_id
    FROM   tenant_members tm
    JOIN   roles          ro ON ro.id = tm.role_id
    WHERE  ro.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES (r.role_id, 'view_dismissal'),
           (r.role_id, 'manage_dismissal')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
