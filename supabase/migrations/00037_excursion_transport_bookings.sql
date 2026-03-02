-- 00037_excursion_transport_bookings.sql
-- ============================================================
-- Transport Booking Notes for Excursions (Module H extension)
-- ============================================================
-- Captures structured transport logistics: bus company, vehicle,
-- driver contact, pickup/drop-off times, and booking reference.
-- One booking record per excursion (1:1), with free-form notes.
-- ============================================================

-- ── Enum: payment status ─────────────────────────────────────
CREATE TYPE transport_payment_status AS ENUM (
  'not_applicable',
  'pending',
  'invoiced',
  'paid'
);

-- ── Main table ───────────────────────────────────────────────
CREATE TABLE excursion_transport_bookings (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  excursion_id         UUID         NOT NULL REFERENCES excursions(id) ON DELETE CASCADE,

  -- Company / operator
  company_name         TEXT         NOT NULL,
  company_phone        TEXT,
  company_email        TEXT,
  booking_reference    TEXT,

  -- Vehicle details
  vehicle_type         TEXT         NOT NULL DEFAULT 'bus',
    -- bus | minibus | coach | van | car | ferry | other
  vehicle_registration TEXT,
  passenger_capacity   INT,

  -- Driver
  driver_name          TEXT,
  driver_phone         TEXT,
  driver_licence_number TEXT,

  -- Pickup / drop-off
  pickup_location      TEXT,
  pickup_time          TIME,
  dropoff_location     TEXT,
  dropoff_time         TIME,

  -- Cost / payment
  total_cost_cents     INT,          -- stored in cents to avoid float rounding
  payment_status       transport_payment_status NOT NULL DEFAULT 'not_applicable',
  invoice_number       TEXT,

  -- Free-form notes (special requirements, allergies briefed, accessibility, etc.)
  notes                TEXT,

  -- Soft-delete / audit fields
  created_by           UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Each excursion has at most one transport booking record
CREATE UNIQUE INDEX excursion_transport_bookings_excursion_unique
  ON excursion_transport_bookings (excursion_id);

-- Standard indexes
CREATE INDEX excursion_transport_bookings_tenant_idx
  ON excursion_transport_bookings (tenant_id);

CREATE INDEX excursion_transport_bookings_tenant_created_idx
  ON excursion_transport_bookings (tenant_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE excursion_transport_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "excursion_transport_bookings_tenant_isolation"
  ON excursion_transport_bookings
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ── Updated-at trigger ────────────────────────────────────────
CREATE TRIGGER update_excursion_transport_bookings_updated_at
  BEFORE UPDATE ON excursion_transport_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
