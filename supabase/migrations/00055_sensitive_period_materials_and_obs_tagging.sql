-- ============================================================
-- Migration 00055: Sensitive Period Material Links + Observation Tagging
-- ============================================================
-- Adds:
--   1. sensitive_period_materials — junction table linking a student's
--      active sensitive period to specific Montessori materials with
--      an optional introduction date and guide notes.
--
--   2. observations.sensitive_period_ids — UUID[] column to tag an
--      observation with one or more student sensitive periods
--      (optional; many-to-many via array rather than junction to keep
--      observation creation lightweight).
-- ============================================================

-- ============================================================
-- TABLE: sensitive_period_materials
-- ============================================================
-- Records which materials a guide has deliberately linked to a
-- student's active sensitive period, including when they were
-- first introduced and any running notes.
-- ============================================================

CREATE TABLE sensitive_period_materials (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- The sensitive period window this material belongs to
  student_sensitive_period_id   UUID NOT NULL
    REFERENCES student_sensitive_periods(id) ON DELETE CASCADE,

  -- The Montessori material being linked
  material_id                   UUID NOT NULL
    REFERENCES montessori_materials(id) ON DELETE RESTRICT,

  -- When the material was first introduced in this period context
  introduced_date               DATE,

  -- Guide notes specific to this child × material × period combination
  notes                         TEXT,

  -- Standard metadata
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each material appears once per sensitive period window
  UNIQUE (student_sensitive_period_id, material_id)
);

-- Auto-update trigger
SELECT apply_updated_at_trigger('sensitive_period_materials');

-- Indexes
CREATE INDEX idx_spm_period
  ON sensitive_period_materials (student_sensitive_period_id)
  WHERE TRUE;

CREATE INDEX idx_spm_tenant_material
  ON sensitive_period_materials (tenant_id, material_id);

-- Row-level security
ALTER TABLE sensitive_period_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON sensitive_period_materials
  FOR ALL USING (tenant_id = current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON sensitive_period_materials TO authenticated;

-- ============================================================
-- OBSERVATIONS: Add sensitive period tagging column
-- ============================================================
-- An observation may optionally be tagged with one or more
-- student_sensitive_periods IDs. Using UUID[] (array) rather
-- than a separate junction table keeps observation creation
-- simple — most observations won't use this field.
-- ============================================================

ALTER TABLE observations
  ADD COLUMN sensitive_period_ids UUID[] NOT NULL DEFAULT '{}';

-- Partial index for filtered lookups (observations tagged with any period)
CREATE INDEX idx_obs_sensitive_period_ids
  ON observations USING GIN (sensitive_period_ids)
  WHERE array_length(sensitive_period_ids, 1) > 0;
