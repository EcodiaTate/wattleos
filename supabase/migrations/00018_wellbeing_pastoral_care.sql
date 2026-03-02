-- ============================================================
-- Migration 00018: Wellbeing & Pastoral Care (Module P)
-- ============================================================
-- Implements student wellbeing tracking, referral management,
-- counsellor case notes, wellbeing check-ins, and pastoral care
-- records.
--
-- WHY five tables (not one): Each concern type has a distinct
-- access pattern. Counsellor case notes are strictly role-gated
-- (counsellor + principal only). Referrals are collaborative.
-- Flags are broad-visibility pastoral concerns. Mixing them
-- would make RLS and permission logic unmanageable.
--
-- WHY counsellor_case_notes is separate: These contain clinical
-- assessment notes protected by professional privilege. Staff
-- with VIEW_WELLBEING cannot see them — only users with
-- VIEW_COUNSELLOR_NOTES. A separate table allows a different
-- RLS policy and permission check.
-- ============================================================

-- ── Wellbeing Flags ──────────────────────────────────────────

CREATE TABLE wellbeing_flags (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id),
  student_id          UUID        NOT NULL REFERENCES students(id),

  -- Concern details
  category            TEXT        NOT NULL
    CHECK (category IN (
      'behaviour', 'emotional', 'social', 'family', 'health', 'academic', 'other'
    )),
  summary             TEXT        NOT NULL,
  context             TEXT,

  -- Severity and status
  severity            TEXT        NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status              TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'archived')),

  -- Assignment
  assigned_to         UUID        REFERENCES users(id),
  assigned_at         TIMESTAMPTZ,

  -- Resolution
  resolved_at         TIMESTAMPTZ,
  resolved_reason     TEXT,

  -- Audit
  created_by          UUID        NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_wellbeing_flags_tenant
  ON wellbeing_flags (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_wellbeing_flags_student
  ON wellbeing_flags (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_wellbeing_flags_status
  ON wellbeing_flags (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_wellbeing_flags_severity
  ON wellbeing_flags (tenant_id, severity)
  WHERE deleted_at IS NULL AND status IN ('open', 'in_progress');

CREATE INDEX idx_wellbeing_flags_assigned
  ON wellbeing_flags (tenant_id, assigned_to)
  WHERE deleted_at IS NULL AND status IN ('open', 'in_progress');

-- ── Student Referrals ─────────────────────────────────────────

CREATE TABLE student_referrals (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID        NOT NULL REFERENCES tenants(id),
  student_id                UUID        NOT NULL REFERENCES students(id),

  -- Referral classification
  referral_type             TEXT        NOT NULL
    CHECK (referral_type IN ('internal', 'external')),
  specialty                 TEXT        NOT NULL
    CHECK (specialty IN (
      'speech_pathology', 'occupational_therapy', 'psychology',
      'social_work', 'physiotherapy', 'paediatrics', 'counselling', 'other'
    )),

  -- Provider details (for external referrals)
  referred_to_name          TEXT,
  referred_to_organisation  TEXT,

  -- Referral content
  referral_reason           TEXT        NOT NULL,
  notes                     TEXT,
  follow_up_date            DATE,

  -- Status tracking
  status                    TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'in_progress', 'closed', 'declined')),
  accepted_at               TIMESTAMPTZ,
  closed_at                 TIMESTAMPTZ,
  outcome_notes             TEXT,

  -- Linked wellbeing flag (optional)
  linked_flag_id            UUID        REFERENCES wellbeing_flags(id),

  -- Audit
  created_by                UUID        NOT NULL REFERENCES users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_referrals_tenant
  ON student_referrals (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_referrals_student
  ON student_referrals (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_referrals_status
  ON student_referrals (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_referrals_follow_up
  ON student_referrals (tenant_id, follow_up_date)
  WHERE deleted_at IS NULL AND status IN ('pending', 'accepted', 'in_progress');

-- ── Counsellor Case Notes ─────────────────────────────────────
-- Strictly access-controlled: VIEW_COUNSELLOR_NOTES required.

CREATE TABLE counsellor_case_notes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id),
  student_id          UUID        NOT NULL REFERENCES students(id),

  -- Author (counsellor / staff who wrote the note)
  author_id           UUID        NOT NULL REFERENCES users(id),

  -- Session details
  note_type           TEXT        NOT NULL
    CHECK (note_type IN (
      'initial_assessment', 'follow_up', 'crisis_intervention',
      'parent_consultation', 'external_liaison', 'closure'
    )),
  session_date        DATE        NOT NULL,
  duration_minutes    INTEGER,

  -- Content (confidential)
  content             TEXT        NOT NULL,
  is_confidential     BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Follow-up
  follow_up_required  BOOLEAN     NOT NULL DEFAULT FALSE,
  follow_up_notes     TEXT,

  -- Linkages
  linked_flag_id      UUID        REFERENCES wellbeing_flags(id),
  linked_referral_id  UUID        REFERENCES student_referrals(id),

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_case_notes_tenant
  ON counsellor_case_notes (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_case_notes_student
  ON counsellor_case_notes (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_case_notes_date
  ON counsellor_case_notes (tenant_id, session_date DESC)
  WHERE deleted_at IS NULL;

-- ── Wellbeing Check-Ins ───────────────────────────────────────

CREATE TABLE wellbeing_check_ins (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id),
  student_id          UUID        NOT NULL REFERENCES students(id),

  -- Who conducted the check-in
  conducted_by        UUID        NOT NULL REFERENCES users(id),

  -- Status and scheduling
  status              TEXT        NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'rescheduled', 'no_show')),
  scheduled_for       DATE        NOT NULL,
  completed_at        TIMESTAMPTZ,

  -- Check-in content (populated on completion)
  mood_rating         INTEGER     CHECK (mood_rating BETWEEN 1 AND 5),
  wellbeing_areas     TEXT[]      DEFAULT '{}',
  observations        TEXT,
  student_goals       TEXT,
  action_items        TEXT,
  follow_up_date      DATE,

  -- Linked concern flag
  linked_flag_id      UUID        REFERENCES wellbeing_flags(id),

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_check_ins_tenant
  ON wellbeing_check_ins (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_check_ins_student
  ON wellbeing_check_ins (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_check_ins_scheduled
  ON wellbeing_check_ins (tenant_id, scheduled_for)
  WHERE deleted_at IS NULL AND status IN ('scheduled', 'rescheduled');

-- ── Pastoral Care Records ─────────────────────────────────────

CREATE TABLE pastoral_care_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id),
  student_id            UUID        NOT NULL REFERENCES students(id),

  -- Who recorded this
  recorded_by           UUID        NOT NULL REFERENCES users(id),

  -- Record details
  category              TEXT        NOT NULL
    CHECK (category IN (
      'behaviour', 'emotional', 'social', 'family', 'health', 'academic', 'other'
    )),
  title                 TEXT        NOT NULL,
  description           TEXT        NOT NULL,
  date_of_concern       DATE        NOT NULL,

  -- Parent contact
  parent_contacted      BOOLEAN     NOT NULL DEFAULT FALSE,
  parent_contacted_at   TIMESTAMPTZ,
  parent_contact_notes  TEXT,

  -- Follow-up action
  action_taken          TEXT,

  -- Linked concern flag (optional)
  linked_flag_id        UUID        REFERENCES wellbeing_flags(id),

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_pastoral_tenant
  ON pastoral_care_records (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pastoral_student
  ON pastoral_care_records (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pastoral_date
  ON pastoral_care_records (tenant_id, date_of_concern DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pastoral_follow_up
  ON pastoral_care_records (tenant_id)
  WHERE deleted_at IS NULL AND parent_contacted = FALSE;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE wellbeing_flags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_referrals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsellor_case_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellbeing_check_ins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_care_records   ENABLE ROW LEVEL SECURITY;

-- General wellbeing: all staff in tenant (VIEW_WELLBEING enforced at app layer)
CREATE POLICY wellbeing_flags_tenant ON wellbeing_flags
  USING (tenant_id = current_tenant_id());

CREATE POLICY referrals_tenant ON student_referrals
  USING (tenant_id = current_tenant_id());

-- Case notes: tenant-scoped at DB level;
-- VIEW_COUNSELLOR_NOTES enforced at the application layer.
CREATE POLICY case_notes_tenant ON counsellor_case_notes
  USING (tenant_id = current_tenant_id());

CREATE POLICY check_ins_tenant ON wellbeing_check_ins
  USING (tenant_id = current_tenant_id());

CREATE POLICY pastoral_tenant ON pastoral_care_records
  USING (tenant_id = current_tenant_id());

-- ── Permissions ──────────────────────────────────────────────

INSERT INTO permissions (key, label, module, description) VALUES
  ('view_wellbeing', 'View Wellbeing', 'wellbeing',
   'View student wellbeing flags, referrals, check-ins, and pastoral care records'),
  ('manage_wellbeing', 'Manage Wellbeing', 'wellbeing',
   'Create and manage student wellbeing flags, schedule check-ins, and write pastoral records'),
  ('manage_referrals', 'Manage Referrals', 'wellbeing',
   'Create and update student referrals to internal and external specialists'),
  ('view_counsellor_notes', 'View Counsellor Notes', 'wellbeing',
   'View restricted counsellor case notes (counsellor + principal only)'),
  ('manage_counsellor_notes', 'Manage Counsellor Notes', 'wellbeing',
   'Create and update restricted counsellor case notes');

-- ── Backfill: Grant permissions to existing roles ─────────────

DO $$
DECLARE
  r       RECORD;
  perm_id UUID;
BEGIN
  -- view_wellbeing, manage_wellbeing, manage_referrals → broad access
  FOR r IN
    SELECT DISTINCT rp.role_id
    FROM roles
    JOIN role_permissions rp ON rp.role_id = roles.id
    WHERE roles.name IN ('Owner', 'Admin', 'Head of School', 'Lead Guide', 'Guide')
  LOOP
    FOR perm_id IN
      SELECT id FROM permissions
      WHERE key IN ('view_wellbeing', 'manage_wellbeing', 'manage_referrals')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- view_counsellor_notes, manage_counsellor_notes → Owner and Admin only
  FOR r IN
    SELECT DISTINCT rp.role_id
    FROM roles
    JOIN role_permissions rp ON rp.role_id = roles.id
    WHERE roles.name IN ('Owner', 'Admin')
  LOOP
    FOR perm_id IN
      SELECT id FROM permissions
      WHERE key IN ('view_counsellor_notes', 'manage_counsellor_notes')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── updated_at triggers ──────────────────────────────────────

CREATE TRIGGER set_wellbeing_flags_updated_at
  BEFORE UPDATE ON wellbeing_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON student_referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_case_notes_updated_at
  BEFORE UPDATE ON counsellor_case_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_check_ins_updated_at
  BEFORE UPDATE ON wellbeing_check_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_pastoral_records_updated_at
  BEFORE UPDATE ON pastoral_care_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
