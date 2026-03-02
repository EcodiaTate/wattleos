-- ============================================================
-- Migration 00015: School Photos & ID Cards (Module R)
-- ============================================================
-- Adds photo session management, historical photo archive,
-- and ID card template configuration.
--
-- WHY sessions: Schools do photo day once or twice a year.
-- Grouping photos by session enables bulk upload, year-over-year
-- tracking, retakes, and coverage reporting.
--
-- WHY person_photos (not just photo_url): Historical archive
-- lets schools keep every photo ever taken. The "current" photo
-- writes to students.photo_url or users.avatar_url so zero
-- downstream code changes are needed.
-- ============================================================

-- ── Photo Sessions ───────────────────────────────────────────

CREATE TABLE photo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  person_type TEXT NOT NULL DEFAULT 'both'
    CHECK (person_type IN ('student', 'staff', 'both')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'archived')),
  total_photos INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_photo_sessions_tenant
  ON photo_sessions(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_photo_sessions_status
  ON photo_sessions(tenant_id, status)
  WHERE deleted_at IS NULL;

-- ── Person Photos ────────────────────────────────────────────

CREATE TABLE person_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID REFERENCES photo_sessions(id),
  person_type TEXT NOT NULL CHECK (person_type IN ('student', 'staff')),
  person_id UUID,
  storage_path TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  original_filename TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  crop_data JSONB,
  file_size_bytes INTEGER,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Lookup: all photos for a person (across sessions)
CREATE INDEX idx_person_photos_person
  ON person_photos(tenant_id, person_type, person_id)
  WHERE deleted_at IS NULL;

-- Lookup: all photos in a session
CREATE INDEX idx_person_photos_session
  ON person_photos(session_id)
  WHERE deleted_at IS NULL;

-- Lookup: current profile photo per person (fast for coverage queries)
CREATE INDEX idx_person_photos_current
  ON person_photos(tenant_id, person_type, person_id)
  WHERE is_current = true AND deleted_at IS NULL;

-- Lookup: unmatched photos in a session (person_id IS NULL)
CREATE INDEX idx_person_photos_unmatched
  ON person_photos(session_id)
  WHERE person_id IS NULL AND deleted_at IS NULL;

-- General tenant filter
CREATE INDEX idx_person_photos_tenant
  ON person_photos(tenant_id)
  WHERE deleted_at IS NULL;

-- ── ID Card Templates ────────────────────────────────────────

CREATE TABLE id_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('student', 'staff')),
  template_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_id_card_templates_tenant
  ON id_card_templates(tenant_id)
  WHERE deleted_at IS NULL;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE photo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_card_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY photo_sessions_tenant ON photo_sessions
  USING (tenant_id = current_tenant_id());

CREATE POLICY person_photos_tenant ON person_photos
  USING (tenant_id = current_tenant_id());

CREATE POLICY id_card_templates_tenant ON id_card_templates
  USING (tenant_id = current_tenant_id());

-- ── Permissions ──────────────────────────────────────────────

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_school_photos', 'Manage School Photos', 'school_photos',
   'Upload, match, and manage student and staff profile photos and ID cards'),
  ('view_school_photos', 'View School Photos', 'school_photos',
   'View photo galleries, sessions, and coverage reports');

-- ── Backfill: Grant to Owner, Admin, Head of School ──────────
-- WHY: The seed_tenant_roles() trigger only runs for NEW tenants.
-- Existing tenants need their Owner/Admin roles updated manually.

DO $$
DECLARE
  r RECORD;
  perm_id UUID;
BEGIN
  FOR r IN
    SELECT rp.role_id
    FROM roles
    JOIN role_permissions rp ON rp.role_id = roles.id
    WHERE roles.name IN ('Owner', 'Admin', 'Head of School')
    GROUP BY rp.role_id
  LOOP
    FOR perm_id IN
      SELECT id FROM permissions
      WHERE key IN ('manage_school_photos', 'view_school_photos')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── updated_at triggers ──────────────────────────────────────

CREATE TRIGGER set_photo_sessions_updated_at
  BEFORE UPDATE ON photo_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_person_photos_updated_at
  BEFORE UPDATE ON person_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_id_card_templates_updated_at
  BEFORE UPDATE ON id_card_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
