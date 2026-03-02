-- ============================================================
-- Migration 00022: Parent-Teacher Interview Scheduling
-- ============================================================
-- Adds three tables supporting the full interview scheduling
-- workflow:
--
--   interview_sessions   — the overall booking period an admin
--                          opens (e.g. "Term 1 PT Interviews")
--   interview_slots      — individual staff time slots within
--                          a session (15-min increments, etc.)
--   interview_bookings   — a family's booking of one slot for
--                          one of their enrolled children
--
-- Permissions added:
--   manage_interview_sessions — admin creates/closes sessions
--   book_interview            — parents/staff book slots
--   view_interview_schedule   — staff view their own calendar
-- ============================================================

-- ── Interview Sessions ───────────────────────────────────────

CREATE TABLE interview_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,                 -- "Term 1 2026 Parent-Teacher Interviews"
  description        TEXT,
  session_start_date DATE        NOT NULL,                 -- first day bookings can be held
  session_end_date   DATE        NOT NULL,                 -- last day
  booking_open_at    TIMESTAMPTZ,                          -- when parents can start booking (NULL = immediately)
  booking_close_at   TIMESTAMPTZ,                          -- when booking window closes (NULL = manual)
  slot_duration_mins SMALLINT    NOT NULL DEFAULT 15       -- minutes per slot
    CHECK (slot_duration_mins BETWEEN 5 AND 120),
  allow_cancellation BOOLEAN     NOT NULL DEFAULT TRUE,
  cancellation_cutoff_hours SMALLINT NOT NULL DEFAULT 24, -- hours before slot parents can cancel
  notes              TEXT,                                 -- staff-visible notes
  status             TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  created_by         UUID        NOT NULL REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,

  CONSTRAINT interview_sessions_dates_check CHECK (session_end_date >= session_start_date),
  CONSTRAINT interview_sessions_title_nonempty CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX idx_interview_sessions_tenant
  ON interview_sessions(tenant_id, status)
  WHERE deleted_at IS NULL;

-- ── Interview Slots ──────────────────────────────────────────

CREATE TABLE interview_slots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id    UUID        NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  staff_user_id UUID        NOT NULL REFERENCES auth.users(id),
  slot_date     DATE        NOT NULL,
  start_time    TIME        NOT NULL,
  end_time      TIME        NOT NULL,                      -- start_time + slot_duration_mins
  location      TEXT,                                      -- "Room 3", "Zoom link: ..."
  is_blocked    BOOLEAN     NOT NULL DEFAULT FALSE,        -- staff-blocked (unavailable)
  block_reason  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT interview_slots_times_check CHECK (end_time > start_time),
  -- Prevent double-booking the same staff member at the same time
  CONSTRAINT interview_slots_no_overlap UNIQUE (staff_user_id, slot_date, start_time)
);

CREATE INDEX idx_interview_slots_session   ON interview_slots(session_id);
CREATE INDEX idx_interview_slots_staff     ON interview_slots(staff_user_id, slot_date);
CREATE INDEX idx_interview_slots_available
  ON interview_slots(session_id, slot_date, start_time)
  WHERE is_blocked = FALSE;

-- ── Interview Bookings ───────────────────────────────────────

CREATE TABLE interview_bookings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id     UUID        NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  slot_id        UUID        NOT NULL REFERENCES interview_slots(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  booked_by      UUID        NOT NULL REFERENCES auth.users(id),    -- parent or staff
  guardian_name  TEXT        NOT NULL,                              -- snapshot at booking time
  guardian_email TEXT,
  guardian_phone TEXT,
  status         TEXT        NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled', 'no_show', 'completed')),
  cancellation_reason TEXT,
  cancelled_at   TIMESTAMPTZ,
  cancelled_by   UUID        REFERENCES auth.users(id),
  outcome_notes  TEXT,                                              -- staff fills in post-interview
  outcome_recorded_at TIMESTAMPTZ,
  outcome_recorded_by UUID REFERENCES auth.users(id),
  reminder_sent_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  -- One active booking per slot
  CONSTRAINT interview_bookings_slot_unique UNIQUE (slot_id)
    DEFERRABLE INITIALLY DEFERRED,
  -- One booking per student per session (can rebook if cancelled)
  CONSTRAINT interview_bookings_student_session_unique
    UNIQUE (student_id, session_id) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_interview_bookings_session  ON interview_bookings(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interview_bookings_student  ON interview_bookings(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interview_bookings_booked_by ON interview_bookings(booked_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_interview_bookings_slot     ON interview_bookings(slot_id)    WHERE deleted_at IS NULL;

-- ── Updated_at Triggers ──────────────────────────────────────

CREATE TRIGGER interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER interview_slots_updated_at
  BEFORE UPDATE ON interview_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER interview_bookings_updated_at
  BEFORE UPDATE ON interview_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interview_sessions_tenant_isolation" ON interview_sessions
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "interview_slots_tenant_isolation" ON interview_slots
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "interview_bookings_tenant_isolation" ON interview_bookings
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- ── Permissions Seed ─────────────────────────────────────────

INSERT INTO permissions (key, description) VALUES
  ('manage_interview_sessions', 'Create, edit, open, and close interview booking sessions'),
  ('book_interview',            'Book, reschedule, or cancel a parent-teacher interview slot'),
  ('view_interview_schedule',   'View interview bookings and schedules')
ON CONFLICT (key) DO NOTHING;

-- Backfill for existing tenants
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Admin roles get full management
  FOR r IN
    SELECT DISTINCT tr.id AS role_id
    FROM tenant_roles tr
    WHERE tr.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'manage_interview_sessions'),
      (r.role_id, 'book_interview'),
      (r.role_id, 'view_interview_schedule')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Teaching staff get view + book
  FOR r IN
    SELECT DISTINCT tr.id AS role_id
    FROM tenant_roles tr
    WHERE tr.name IN ('Teacher', 'Educator', 'Lead Educator', 'Staff')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'book_interview'),
      (r.role_id, 'view_interview_schedule')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

COMMENT ON TABLE interview_sessions IS 'An admin-defined period during which parent-teacher interviews can be booked';
COMMENT ON TABLE interview_slots    IS 'An individual available time slot for a specific staff member';
COMMENT ON TABLE interview_bookings IS 'A family booking of a slot for one of their enrolled children';
