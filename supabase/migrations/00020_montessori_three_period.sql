-- ============================================================
-- Migration 00020: Montessori Three-Period Lessons + Sensitive Periods
-- ============================================================
-- Three-Period Lesson (3PL): The foundational Montessori instructional
-- technique where a concept is taught in three distinct periods:
--   Period 1 — Introduction/Naming ("This is...")
--   Period 2 — Association/Recognition ("Show me...")
--   Period 3 — Recall/Naming ("What is this?")
-- Progression is gated: Period 2 requires Period 1 complete;
-- Period 3 requires Period 2 complete.
--
-- Sensitive Periods: Developmentally-driven windows of heightened
-- receptivity to specific stimuli (language, order, movement, etc.)
-- identified by Montessori as critical for natural learning. Staff
-- record observed sensitive periods and link suggested materials.
-- ============================================================

-- ============================================================
-- TABLE: three_period_lessons
-- ============================================================
-- One row per lesson session (a single guided presentation by
-- an educator). A child may have multiple sessions per material
-- if periods are spread across days.
-- ============================================================

CREATE TABLE three_period_lessons (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Subject and material
  student_id               UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  material_id              UUID NOT NULL REFERENCES montessori_materials(id) ON DELETE RESTRICT,
  educator_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  lesson_date              DATE NOT NULL,

  -- Period 1: Introduction / Naming — "This is..."
  -- The educator names/demonstrates the concept. Always recorded first.
  period_1_status          TEXT NOT NULL DEFAULT 'not_started'
    CHECK (period_1_status IN ('not_started', 'completed', 'needs_repeat')),
  period_1_notes           TEXT,
  period_1_completed_at    TIMESTAMPTZ,

  -- Period 2: Association / Recognition — "Show me..."
  -- Child selects/points to the concept. Requires Period 1 completed.
  period_2_status          TEXT NOT NULL DEFAULT 'not_started'
    CHECK (period_2_status IN ('not_started', 'completed', 'needs_repeat')),
  period_2_notes           TEXT,
  period_2_completed_at    TIMESTAMPTZ,

  -- Period 3: Recall / Naming — "What is this?"
  -- Child names the concept independently. Requires Period 2 completed.
  period_3_status          TEXT NOT NULL DEFAULT 'not_started'
    CHECK (period_3_status IN ('not_started', 'completed', 'needs_repeat')),
  period_3_notes           TEXT,
  period_3_completed_at    TIMESTAMPTZ,

  -- Overall session notes
  session_notes            TEXT,

  -- Standard metadata
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ,

  -- Progression gate: application layer enforces ordering,
  -- but we add a DB constraint to prevent data inconsistency.
  CONSTRAINT period_2_requires_period_1 CHECK (
    period_2_status = 'not_started' OR period_1_status IN ('completed', 'needs_repeat')
  ),
  CONSTRAINT period_3_requires_period_2 CHECK (
    period_3_status = 'not_started' OR period_2_status IN ('completed', 'needs_repeat')
  )
);

-- Indexes
CREATE INDEX idx_three_period_lessons_tenant_date
  ON three_period_lessons (tenant_id, lesson_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_three_period_lessons_student
  ON three_period_lessons (tenant_id, student_id, lesson_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_three_period_lessons_material
  ON three_period_lessons (tenant_id, material_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_three_period_lessons_educator
  ON three_period_lessons (educator_id)
  WHERE deleted_at IS NULL;

-- Auto-update trigger
SELECT apply_updated_at_trigger('three_period_lessons');

-- Row-level security
ALTER TABLE three_period_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON three_period_lessons
  FOR ALL USING (tenant_id = current_tenant_id());

-- ============================================================
-- TABLE: student_sensitive_periods
-- ============================================================
-- Records observed Montessori sensitive periods per child.
-- A sensitive period is a developmental window of heightened
-- receptivity to a specific type of stimuli. Identifying and
-- nurturing them is central to Montessori practice.
-- ============================================================

CREATE TABLE student_sensitive_periods (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Subject child
  student_id               UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,

  -- Which sensitive period
  sensitive_period         TEXT NOT NULL
    CHECK (sensitive_period IN (
      'language',           -- Birth–6: intense absorption of spoken language
      'order',              -- 1.5–4: need for consistency and predictability
      'movement',           -- Birth–2.5: developing gross/fine motor control
      'small_objects',      -- 18m–3: fascination with tiny objects and precision
      'music',              -- Birth–6: receptivity to pitch, rhythm, melody
      'social_behavior',    -- 2.5–6: learning social norms and relationships
      'reading',            -- 3.5–5.5: emergence of symbol-sound connections
      'writing',            -- 3.5–5: muscle readiness and letter formation
      'mathematics',        -- 4–6: abstract quantity and symbol abstraction
      'refinement_of_senses' -- 2–6: isolating and discriminating sensory input
    )),

  -- Intensity of the observed sensitive period
  intensity                TEXT NOT NULL DEFAULT 'emerging'
    CHECK (intensity IN (
      'emerging',    -- Signs of the period beginning
      'active',      -- Clearly observable, child returning repeatedly
      'peak',        -- Strongest point — child highly focused
      'waning'       -- Period naturally subsiding
    )),

  -- Time range of observation
  observed_start_date      DATE,
  observed_end_date        DATE,    -- NULL = still active

  -- Suggested materials (optional educator curation)
  suggested_material_ids   UUID[]   NOT NULL DEFAULT '{}',

  -- Notes
  notes                    TEXT,

  -- Who recorded it
  recorded_by              UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Standard metadata
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_student_sensitive_periods_tenant_student
  ON student_sensitive_periods (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_student_sensitive_periods_tenant_active
  ON student_sensitive_periods (tenant_id, sensitive_period, intensity)
  WHERE deleted_at IS NULL AND observed_end_date IS NULL;

-- Auto-update trigger
SELECT apply_updated_at_trigger('student_sensitive_periods');

-- Row-level security
ALTER TABLE student_sensitive_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON student_sensitive_periods
  FOR ALL USING (tenant_id = current_tenant_id());

-- ============================================================
-- PERMISSIONS: Insert new permissions (reuse existing lesson perms)
-- These are governed by MANAGE_LESSON_RECORDS / VIEW_LESSON_RECORDS
-- which are already seeded in the permissions table, so no new
-- INSERT is needed here. Gating is handled at the action layer.
-- ============================================================

-- Grant authenticated users access (RLS handles tenant scoping)
GRANT SELECT, INSERT, UPDATE, DELETE ON three_period_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_sensitive_periods TO authenticated;
