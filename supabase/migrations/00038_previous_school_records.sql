-- supabase/migrations/00038_previous_school_records.sql
--
-- ============================================================
-- WattleOS V2 — Previous School Records
-- (Backlog: Student Information > Prior school records)
-- ============================================================
-- Stores a child's prior schooling history: school name,
-- enrollment dates, year levels attended, key contacts, and
-- transfer document references.
--
-- Design decisions:
--   - Separate table from students to support multiple prior
--     schools per child (common for transient families).
--   - Soft-delete so records can be recovered if needed.
--   - year_levels TEXT[] for flexible AUS/international formats
--     (e.g. ["Prep", "Grade 1"] or ["Reception", "Year 1"]).
--   - transfer_document_url points to Supabase Storage object.
--   - Permissions: VIEW/MANAGE_PREVIOUS_SCHOOL_RECORDS
--     (Owner/Admin/HoS by default; Guide read-only).
-- ============================================================

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS previous_school_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  school_name          TEXT    NOT NULL,
  school_type          TEXT    NULL,      -- government / independent / catholic / international / homeschool
  suburb               TEXT    NULL,
  state                TEXT    NULL,      -- e.g. VIC, NSW, QLD
  country              TEXT    NOT NULL DEFAULT 'Australia',

  start_date           DATE    NULL,
  end_date             DATE    NULL,
  year_levels          TEXT[]  NULL,      -- grades/year levels attended

  principal_name        TEXT   NULL,
  contact_phone         TEXT   NULL,
  contact_email         TEXT   NULL,

  reason_for_leaving   TEXT    NULL,
  transfer_document_url TEXT   NULL,      -- Supabase Storage path
  notes                TEXT    NULL,

  recorded_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ NULL
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX idx_previous_school_records_tenant
  ON previous_school_records(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_previous_school_records_student
  ON previous_school_records(student_id)
  WHERE deleted_at IS NULL;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE previous_school_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON previous_school_records
  USING (tenant_id = (
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid()
    LIMIT 1
  ));

-- ── Permissions ───────────────────────────────────────────────

INSERT INTO permissions (key, description) VALUES
  ('view_previous_school_records',   'View student prior school records'),
  ('manage_previous_school_records', 'Create, edit and delete student prior school records')
ON CONFLICT (key) DO NOTHING;

-- ── Backfill to existing tenants ─────────────────────────────
-- Grant to Owner, Admin, Head of School for all existing tenants.
-- The seed_tenant_roles() trigger covers NEW tenants only.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tr.id AS role_id
    FROM   tenant_roles tr
    WHERE  tr.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'view_previous_school_records'),
      (r.role_id, 'manage_previous_school_records')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Also grant VIEW to Guide role (read-only; Guides need context for new enrolees)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tr.id AS role_id
    FROM   tenant_roles tr
    WHERE  tr.name = 'Guide'
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES (r.role_id, 'view_previous_school_records')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
