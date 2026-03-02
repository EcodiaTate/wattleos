-- 00033_school_events.sql
-- ============================================================
-- School Events & RSVP (Module 12 — Communications)
-- ============================================================
-- Events can be school-wide, class-specific, program-specific,
-- or staff-only. Supports optional RSVP with guest counts and
-- capacity limits.
-- ============================================================

-- ── school_events ──────────────────────────────────────────

CREATE TABLE school_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT,
  event_type        TEXT        NOT NULL CHECK (event_type IN (
                                  'general',
                                  'excursion',
                                  'parent_meeting',
                                  'performance',
                                  'sports_day',
                                  'fundraiser',
                                  'professional_development',
                                  'public_holiday',
                                  'pupil_free_day',
                                  'term_start',
                                  'term_end'
                                )),
  start_at          TIMESTAMPTZ NOT NULL,
  end_at            TIMESTAMPTZ,
  all_day           BOOLEAN     NOT NULL DEFAULT false,
  location          TEXT,
  location_url      TEXT,
  scope             TEXT        NOT NULL DEFAULT 'school' CHECK (scope IN (
                                  'school', 'class', 'program', 'staff'
                                )),
  target_class_id   UUID        REFERENCES classes(id) ON DELETE SET NULL,
  target_program_id UUID        REFERENCES programs(id) ON DELETE SET NULL,
  rsvp_enabled      BOOLEAN     NOT NULL DEFAULT false,
  rsvp_deadline     TIMESTAMPTZ,
  max_attendees     INTEGER,
  created_by        UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  attachment_urls   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT school_events_class_scope_check
    CHECK (scope != 'class' OR target_class_id IS NOT NULL),
  CONSTRAINT school_events_program_scope_check
    CHECK (scope != 'program' OR target_program_id IS NOT NULL),
  CONSTRAINT school_events_max_attendees_positive
    CHECK (max_attendees IS NULL OR max_attendees > 0)
);

CREATE INDEX idx_school_events_tenant       ON school_events (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_events_start        ON school_events (tenant_id, start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_events_scope        ON school_events (tenant_id, scope) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_events_class        ON school_events (target_class_id) WHERE deleted_at IS NULL AND target_class_id IS NOT NULL;
CREATE INDEX idx_school_events_program      ON school_events (target_program_id) WHERE deleted_at IS NULL AND target_program_id IS NOT NULL;

SELECT apply_updated_at_trigger('school_events');

ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_events_tenant_isolation" ON school_events
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- ── event_rsvps ────────────────────────────────────────────

CREATE TABLE event_rsvps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id      UUID        NOT NULL REFERENCES school_events(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
  guests        INTEGER     NOT NULL DEFAULT 0 CHECK (guests >= 0),
  notes         TEXT,
  responded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, event_id, user_id)
);

CREATE INDEX idx_event_rsvps_event   ON event_rsvps (event_id);
CREATE INDEX idx_event_rsvps_user    ON event_rsvps (user_id, tenant_id);
CREATE INDEX idx_event_rsvps_status  ON event_rsvps (event_id, status);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_rsvps_tenant_isolation" ON event_rsvps
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1
    )
  );
