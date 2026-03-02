-- supabase/migrations/00024_volunteer_coordination.sql
--
-- ============================================================
-- Volunteer Coordination
-- ============================================================
-- Schools run excursions and events where parent/community
-- volunteers assist staff. Before any volunteer can be rostered
-- they must hold a current Working with Children Check (WWCC).
--
-- This module provides:
--
--   volunteers            — volunteer profiles with WWCC details
--   volunteer_assignments — links volunteers to excursions/events
--
-- WWCC status (current/expiring_soon/expired/missing) is always
-- computed in application code from wwcc_expiry_date — never
-- stored — so it reflects reality at query time, not at insert.
-- ============================================================

-- ============================================================
-- 1. ENUMs
-- ============================================================

CREATE TYPE volunteer_status AS ENUM (
  'active',      -- Cleared, rostered as needed
  'inactive',    -- Not currently volunteering
  'suspended'    -- Barred from rostering (WWCC issue etc.)
);

CREATE TYPE volunteer_assignment_status AS ENUM (
  'invited',    -- Invitation sent, awaiting response
  'confirmed',  -- Volunteer confirmed attendance
  'declined',   -- Volunteer declined
  'attended',   -- Attended and participated
  'no_show'     -- Did not attend without notice
);

-- ============================================================
-- 2. volunteers
-- ============================================================
-- One row per volunteer per tenant. The WWCC number and expiry
-- are optional at creation — staff can add them later — but
-- a volunteer cannot be assigned to an excursion without a
-- current WWCC (enforced in application, not DB, for flexibility).
-- ============================================================

CREATE TABLE IF NOT EXISTS volunteers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Personal details
  first_name          TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 100),
  last_name           TEXT NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 100),
  email               TEXT,
  phone               TEXT,

  -- WWCC details
  -- wwcc_state uses 2-letter Australian state/territory code
  wwcc_number         TEXT,
  wwcc_expiry_date    DATE,
  wwcc_state          CHAR(3),  -- e.g. 'VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'

  status              volunteer_status NOT NULL DEFAULT 'active',
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Fast lookups by tenant + status
CREATE INDEX volunteers_tenant_status
  ON volunteers (tenant_id, status, last_name, first_name);

-- Fast WWCC expiry alerts (upcoming expiries across all tenants)
CREATE INDEX volunteers_wwcc_expiry
  ON volunteers (tenant_id, wwcc_expiry_date)
  WHERE wwcc_expiry_date IS NOT NULL AND status = 'active';

-- ============================================================
-- 3. volunteer_assignments
-- ============================================================
-- Links a volunteer to a specific excursion (by ID) or a freeform
-- event (by name + date). excursion_id is nullable so volunteers
-- can be assigned to non-excursion events (sports days, fetes etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  volunteer_id     UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,

  -- Either link to an excursion OR use freeform event_name
  excursion_id     UUID REFERENCES excursions(id) ON DELETE SET NULL,
  event_name       TEXT NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 200),
  event_date       DATE NOT NULL,

  role             TEXT NOT NULL CHECK (char_length(role) BETWEEN 1 AND 100),
  status           volunteer_assignment_status NOT NULL DEFAULT 'invited',
  notes            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Upcoming assignments list
CREATE INDEX volunteer_assignments_tenant_date
  ON volunteer_assignments (tenant_id, event_date DESC, status);

-- Per-volunteer assignment history
CREATE INDEX volunteer_assignments_volunteer
  ON volunteer_assignments (volunteer_id, event_date DESC);

-- Per-excursion roster
CREATE INDEX volunteer_assignments_excursion
  ON volunteer_assignments (excursion_id, status)
  WHERE excursion_id IS NOT NULL;

-- ============================================================
-- 4. Permissions
-- ============================================================

INSERT INTO permissions (key, description) VALUES
  ('view_volunteers',   'View volunteer profiles, WWCC status, and assignment lists'),
  ('manage_volunteers', 'Create/update volunteer profiles, record WWCC details, and manage assignments')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner, Admin, Head of School by default
DO $$
DECLARE
  t RECORD;
  role_id UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    -- Owner
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Owner' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_volunteers'), (role_id, 'manage_volunteers')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Admin
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_volunteers'), (role_id, 'manage_volunteers')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Head of School
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Head of School' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_volunteers'), (role_id, 'manage_volunteers')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Guide (view only — they can see who is volunteering)
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Guide' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_volunteers')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_assignments ENABLE ROW LEVEL SECURITY;

-- volunteers: view
CREATE POLICY "volunteers_select"
  ON volunteers FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_volunteers')
  );

-- volunteers: insert
CREATE POLICY "volunteers_insert"
  ON volunteers FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  );

-- volunteers: update
CREATE POLICY "volunteers_update"
  ON volunteers FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  );

-- volunteer_assignments: view
CREATE POLICY "volunteer_assignments_select"
  ON volunteer_assignments FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_volunteers')
  );

-- volunteer_assignments: insert
CREATE POLICY "volunteer_assignments_insert"
  ON volunteer_assignments FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  );

-- volunteer_assignments: update
CREATE POLICY "volunteer_assignments_update"
  ON volunteer_assignments FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  );

-- volunteer_assignments: delete
CREATE POLICY "volunteer_assignments_delete"
  ON volunteer_assignments FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_volunteers')
  );

-- ============================================================
-- 6. updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_volunteers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER volunteers_updated_at
  BEFORE UPDATE ON volunteers
  FOR EACH ROW EXECUTE FUNCTION update_volunteers_updated_at();

CREATE OR REPLACE FUNCTION update_volunteer_assignments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER volunteer_assignments_updated_at
  BEFORE UPDATE ON volunteer_assignments
  FOR EACH ROW EXECUTE FUNCTION update_volunteer_assignments_updated_at();
