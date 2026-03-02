-- supabase/migrations/00017_sign_in_out_kiosk.sql
-- ============================================================
-- Late Arrival / Early Departure Kiosk
-- Backlog: Attendance & Safety → P1
-- ============================================================
-- sign_in_out_records captures every late arrival or early
-- departure event at the school-day kiosk:
--   • Timestamp (when the student physically arrived/departed)
--   • Reason code (appointment, transport, illness, etc.)
--   • Who signed (parent/guardian name + relationship)
--   • Link back to the roll-call attendance_records row
--
-- WHY separate table: attendance_records is a per-day roll-call
-- record (one row per student per day). Sign-in/out events are
-- time-stamped events — a student could theoretically have
-- multiple (arrived late, left early for appointment, returned).
-- A separate table keeps the schema clean and avoids bloating
-- the roll-call hot path.
--
-- ON KIOSK ACTION:
--   1. Insert into sign_in_out_records
--   2. UPSERT into attendance_records:
--        late_arrival  → status = 'late',   check_in_at  = occurred_at
--        early_depart  → status = 'half_day' (if present/late),
--                         check_out_at = occurred_at
-- ============================================================

-- ── Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sign_in_out_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id            UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Event classification
  type                  TEXT        NOT NULL CHECK (type IN ('late_arrival', 'early_departure')),

  -- When: the school day date + the precise timestamp
  event_date            DATE        NOT NULL,
  occurred_at           TIMESTAMPTZ NOT NULL,

  -- Why
  reason_code           TEXT        NOT NULL,
  reason_notes          TEXT,

  -- Who signed off at the door
  signed_by_name        TEXT,
  signed_by_relationship TEXT,

  -- Staff who acknowledged the kiosk entry (may be NULL for self-service)
  acknowledged_by       UUID,

  -- Back-link to roll-call record (populated on create if record exists)
  linked_attendance_id  UUID        REFERENCES attendance_records(id),

  -- Audit
  recorded_by           UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS sign_in_out_records_tenant_date_idx
  ON sign_in_out_records (tenant_id, event_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS sign_in_out_records_student_idx
  ON sign_in_out_records (student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS sign_in_out_records_type_idx
  ON sign_in_out_records (tenant_id, type, event_date)
  WHERE deleted_at IS NULL;

-- ── updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_sign_in_out_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sign_in_out_records_updated_at
  BEFORE UPDATE ON sign_in_out_records
  FOR EACH ROW
  EXECUTE FUNCTION update_sign_in_out_updated_at();

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE sign_in_out_records ENABLE ROW LEVEL SECURITY;

-- Staff: full access within tenant
CREATE POLICY "sign_in_out_tenant_isolation"
  ON sign_in_out_records
  FOR ALL
  USING (
    tenant_id = (
      SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::UUID
    )
  );

-- ── Grant permissions to new table ──────────────────────────

GRANT SELECT, INSERT, UPDATE ON sign_in_out_records TO authenticated;

-- ── Permissions: add MANAGE_SIGN_IN_OUT perm key ────────────
-- This module reuses MANAGE_ATTENDANCE. No new permission row needed.
-- The kiosk and log are both gated on manage_attendance in the app layer.
