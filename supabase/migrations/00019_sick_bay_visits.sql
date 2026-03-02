-- ============================================================
-- Migration 00019: Sick Bay Visits Log
-- ============================================================
-- Regulatory basis: Duty of care — record of student health
-- incidents and welfare checks during school hours.
-- ============================================================

-- ============================================================
-- TABLE: sick_bay_visits
-- ============================================================
-- Log of student visits to the sick bay, presenting complaint,
-- action taken, parent notification, and departure time.
-- ============================================================

CREATE TABLE sick_bay_visits (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Subject child
  student_id             UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,

  -- Visit classification
  visit_type             TEXT NOT NULL
    CHECK (visit_type IN ('injury', 'illness', 'medication_given', 'first_aid', 'other')),

  -- Status workflow
  status                 TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'referred')),

  -- Date & time
  visit_date             DATE NOT NULL,
  arrived_at             TIMESTAMPTZ,
  departed_at            TIMESTAMPTZ,

  -- Health details
  presenting_complaint   TEXT,
  treatment_given        TEXT,
  outcome                TEXT,
  notes                  TEXT,

  -- Actions taken
  parent_notified        BOOLEAN NOT NULL DEFAULT false,
  parent_notified_at     TIMESTAMPTZ,
  ambulance_called       BOOLEAN NOT NULL DEFAULT false,

  -- Who recorded it
  recorded_by            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by             UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Standard metadata
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_sick_bay_visits_tenant_date
  ON sick_bay_visits (tenant_id, visit_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_sick_bay_visits_tenant_status
  ON sick_bay_visits (tenant_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_sick_bay_visits_student
  ON sick_bay_visits (tenant_id, student_id)
  WHERE deleted_at IS NULL;

-- Auto-update trigger
SELECT apply_updated_at_trigger('sick_bay_visits');

-- Row-level security
ALTER TABLE sick_bay_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON sick_bay_visits
  FOR ALL USING (tenant_id = current_tenant_id());
