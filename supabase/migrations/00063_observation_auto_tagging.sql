-- 00063_observation_auto_tagging.sql
-- ============================================================
-- Observation Auto-Tagging — AI-suggested EYLF/NQF +
-- Montessori area tags presented as confirmable chips.
--
-- Architecture:
--   - observation_tag_suggestions: stores per-observation AI
--     suggestions (not yet applied). Staff confirm or dismiss
--     individual chips; confirmed ones are written to
--     observation_outcomes (existing junction table).
--   - suggestion_status tracks chip state: pending →
--     confirmed | dismissed.
--   - No new junction table for applied tags — confirmed tags
--     go straight into observation_outcomes which already drives
--     the feed + detail views.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE suggestion_status AS ENUM (
  'pending',     -- awaiting educator review
  'confirmed',   -- educator accepted → tag applied
  'dismissed'    -- educator rejected → not applied
);

CREATE TYPE suggestion_tag_type AS ENUM (
  'curriculum_outcome',  -- links to curriculum_nodes.id
  'montessori_area'      -- free label (e.g. "Practical Life")
);

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE observation_tag_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  observation_id  UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,

  -- What type of suggestion this is
  tag_type        suggestion_tag_type NOT NULL,

  -- For curriculum_outcome suggestions: the matched node id
  curriculum_node_id UUID REFERENCES curriculum_nodes(id) ON DELETE SET NULL,

  -- For montessori_area suggestions: area label (e.g. "Language")
  area_label      TEXT,

  -- Human-readable label shown on the chip (always set)
  display_label   TEXT NOT NULL,

  -- Model's confidence (0.0–1.0); used to order chips
  confidence      NUMERIC(4,3) NOT NULL DEFAULT 0.8
    CHECK (confidence >= 0.0 AND confidence <= 1.0),

  -- AI's brief rationale shown on hover
  rationale       TEXT,

  -- Lifecycle
  status          suggestion_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At most one suggestion per (observation, node) pair
  CONSTRAINT uq_suggestion_per_node
    UNIQUE NULLS NOT DISTINCT (observation_id, curriculum_node_id),

  -- At most one suggestion per (observation, area label)
  CONSTRAINT uq_suggestion_per_area
    UNIQUE NULLS NOT DISTINCT (observation_id, area_label),

  -- curriculum_outcome type must have a node id
  CONSTRAINT chk_curriculum_node
    CHECK (
      tag_type <> 'curriculum_outcome' OR curriculum_node_id IS NOT NULL
    ),

  -- montessori_area type must have an area label
  CONSTRAINT chk_area_label
    CHECK (
      tag_type <> 'montessori_area' OR area_label IS NOT NULL
    )
);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE observation_tag_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observation_tag_suggestions_tenant_isolation"
  ON observation_tag_suggestions
  USING (
    tenant_id = (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX ON observation_tag_suggestions (tenant_id);
CREATE INDEX ON observation_tag_suggestions (observation_id);
CREATE INDEX ON observation_tag_suggestions (tenant_id, status);
CREATE INDEX ON observation_tag_suggestions (observation_id, status);

-- ── updated_at trigger ───────────────────────────────────────

CREATE TRIGGER update_observation_tag_suggestions_updated_at
  BEFORE UPDATE ON observation_tag_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
