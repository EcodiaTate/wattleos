-- 00040_cosmic_education.sql
-- ============================================================
-- Cosmic Education Unit Planning (Montessori 6–12)
-- ============================================================
-- Supports planning and tracking of the five Great Lessons
-- and integrated cosmic education units for 6–12 programmes.
--
-- Tables:
--   cosmic_great_lessons     — the 5 Great Lessons (seeded, tenant-extensible)
--   cosmic_units             — unit plans linked to great lessons
--   cosmic_unit_studies      — individual cultural study topics within a unit
--   cosmic_unit_participants — which students/classes are enrolled in a unit
--   cosmic_study_records     — per-student study completion records
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUM: great lesson identifier
-- ────────────────────────────────────────────────────────────
CREATE TYPE cosmic_great_lesson AS ENUM (
  'story_of_universe',     -- The Story of the Universe (Big Bang)
  'story_of_life',         -- The Story of Life (Timeline of Life)
  'story_of_humans',       -- The Coming of Human Beings
  'story_of_communication',-- The Story of Communication in Signs (writing)
  'story_of_numbers',      -- The Story of Numbers (mathematics)
  'custom'                 -- school-created extension lesson
);

-- ────────────────────────────────────────────────────────────
-- ENUM: unit plan status
-- ────────────────────────────────────────────────────────────
CREATE TYPE cosmic_unit_status AS ENUM (
  'draft',       -- being planned
  'active',      -- currently running
  'completed',   -- finished
  'archived'     -- retired / not running
);

-- ────────────────────────────────────────────────────────────
-- ENUM: cultural study area (Cosmic subject domains)
-- ────────────────────────────────────────────────────────────
CREATE TYPE cosmic_study_area AS ENUM (
  'history',         -- human / world history
  'geography',       -- physical & human geography
  'biology',         -- life science / botany / zoology
  'physics',         -- physical science / chemistry
  'astronomy',       -- universe / solar system
  'mathematics',     -- number history / patterns
  'language_arts',   -- writing / communication systems
  'art_music',       -- arts & music history / creation
  'culture_society', -- cultures, civilisations, social studies
  'economics',       -- trade, needs, goods and services
  'integrated'       -- cross-area project
);

-- ────────────────────────────────────────────────────────────
-- ENUM: study record status
-- ────────────────────────────────────────────────────────────
CREATE TYPE cosmic_study_status AS ENUM (
  'introduced',   -- lesson/concept introduced
  'exploring',    -- student researching / working independently
  'presenting',   -- student preparing a presentation
  'completed'     -- work cycle complete
);

-- ────────────────────────────────────────────────────────────
-- TABLE: cosmic_great_lessons
-- Seeded with the 5 canonical Great Lessons + custom slot.
-- Tenants can add custom records (tenant_id IS NOT NULL).
-- ────────────────────────────────────────────────────────────
CREATE TABLE cosmic_great_lessons (
  id           UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID                 REFERENCES tenants(id) ON DELETE CASCADE,
  -- NULL tenant_id = global seed row
  lesson_key   cosmic_great_lesson  NOT NULL,
  title        TEXT                 NOT NULL,
  subtitle     TEXT,
  description  TEXT,
  age_range    TEXT                 NOT NULL DEFAULT '6-12',
  -- study areas typically sparked by this lesson
  related_areas cosmic_study_area[] NOT NULL DEFAULT '{}',
  display_order SMALLINT            NOT NULL DEFAULT 0,
  is_active    BOOLEAN              NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ          NOT NULL DEFAULT now()
);

CREATE INDEX ON cosmic_great_lessons (lesson_key, display_order);
CREATE INDEX ON cosmic_great_lessons (tenant_id) WHERE tenant_id IS NOT NULL;

CREATE TRIGGER update_cosmic_great_lessons_updated_at
  BEFORE UPDATE ON cosmic_great_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: see global rows + own tenant rows
ALTER TABLE cosmic_great_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmic_great_lessons_access" ON cosmic_great_lessons
  USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
  );

-- ────────────────────────────────────────────────────────────
-- TABLE: cosmic_units
-- A unit plan: one themed study linking a Great Lesson to
-- a set of cultural study topics, with dates and staff lead.
-- ────────────────────────────────────────────────────────────
CREATE TABLE cosmic_units (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  great_lesson_id  UUID               NOT NULL REFERENCES cosmic_great_lessons(id) ON DELETE RESTRICT,
  title            TEXT               NOT NULL,           -- e.g. "Ancient Egypt — Nile Civilisations"
  description      TEXT,
  key_questions    TEXT[],                                -- essential questions driving the unit
  age_range        TEXT               NOT NULL DEFAULT '6-12',
  planned_start    DATE,
  planned_end      DATE,
  actual_start     DATE,
  actual_end       DATE,
  status           cosmic_unit_status NOT NULL DEFAULT 'draft',
  lead_staff_id    UUID               REFERENCES auth.users(id) ON DELETE SET NULL,
  target_class_id  UUID               REFERENCES classes(id) ON DELETE SET NULL,
  -- cross-links
  linked_material_ids  UUID[]         NOT NULL DEFAULT '{}',  -- material inventory items
  linked_lesson_ids    UUID[]         NOT NULL DEFAULT '{}',  -- lesson_records (Montessori lessons)
  notes            TEXT,
  created_by       UUID               REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX ON cosmic_units (tenant_id, status);
CREATE INDEX ON cosmic_units (tenant_id, great_lesson_id);
CREATE INDEX ON cosmic_units (tenant_id, planned_start);

CREATE TRIGGER update_cosmic_units_updated_at
  BEFORE UPDATE ON cosmic_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cosmic_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmic_units_tenant_isolation" ON cosmic_units
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ────────────────────────────────────────────────────────────
-- TABLE: cosmic_unit_studies
-- Individual cultural study topics / sub-projects within a unit.
-- Each study covers one area and has its own learning outcomes.
-- ────────────────────────────────────────────────────────────
CREATE TABLE cosmic_unit_studies (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id          UUID              NOT NULL REFERENCES cosmic_units(id) ON DELETE CASCADE,
  title            TEXT              NOT NULL,           -- e.g. "Mesopotamia — Cuneiform Writing"
  study_area       cosmic_study_area NOT NULL,
  description      TEXT,
  learning_outcomes TEXT[],
  key_vocabulary   TEXT[],
  materials_needed TEXT[],
  resources        TEXT[],           -- URLs, book titles, etc.
  display_order    SMALLINT          NOT NULL DEFAULT 0,
  created_by       UUID              REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX ON cosmic_unit_studies (tenant_id, unit_id, display_order);

CREATE TRIGGER update_cosmic_unit_studies_updated_at
  BEFORE UPDATE ON cosmic_unit_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cosmic_unit_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmic_unit_studies_tenant_isolation" ON cosmic_unit_studies
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ────────────────────────────────────────────────────────────
-- TABLE: cosmic_unit_participants
-- Which students are enrolled in a unit.
-- Populated manually or seeded from target_class_id.
-- ────────────────────────────────────────────────────────────
CREATE TABLE cosmic_unit_participants (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id     UUID        NOT NULL REFERENCES cosmic_units(id) ON DELETE CASCADE,
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes       TEXT,

  UNIQUE (unit_id, student_id)
);

CREATE INDEX ON cosmic_unit_participants (tenant_id, unit_id);
CREATE INDEX ON cosmic_unit_participants (tenant_id, student_id);

ALTER TABLE cosmic_unit_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmic_unit_participants_tenant_isolation" ON cosmic_unit_participants
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ────────────────────────────────────────────────────────────
-- TABLE: cosmic_study_records
-- Per-student record of progress through a study topic.
-- One row per (study × student). Staff record when work
-- was introduced, when student is exploring, presenting, done.
-- ────────────────────────────────────────────────────────────
CREATE TABLE cosmic_study_records (
  id              UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id         UUID               NOT NULL REFERENCES cosmic_units(id) ON DELETE CASCADE,
  study_id        UUID               NOT NULL REFERENCES cosmic_unit_studies(id) ON DELETE CASCADE,
  student_id      UUID               NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status          cosmic_study_status NOT NULL DEFAULT 'introduced',
  introduced_at   DATE,
  exploring_at    DATE,
  presenting_at   DATE,
  completed_at    DATE,
  presentation_notes TEXT,           -- notes on how the student shared their work
  staff_notes     TEXT,
  recorded_by     UUID               REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),

  UNIQUE (study_id, student_id)
);

CREATE INDEX ON cosmic_study_records (tenant_id, unit_id, student_id);
CREATE INDEX ON cosmic_study_records (tenant_id, study_id);
CREATE INDEX ON cosmic_study_records (tenant_id, status);

CREATE TRIGGER update_cosmic_study_records_updated_at
  BEFORE UPDATE ON cosmic_study_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cosmic_study_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cosmic_study_records_tenant_isolation" ON cosmic_study_records
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ============================================================
-- SEED: Five Great Lessons (global rows, tenant_id IS NULL)
-- ============================================================
INSERT INTO cosmic_great_lessons
  (tenant_id, lesson_key, title, subtitle, description, age_range, related_areas, display_order)
VALUES
  (
    NULL,
    'story_of_universe',
    'The Story of the Universe',
    'The Big Bang and the Formation of the Earth',
    'The first Great Lesson explores the origin of the universe, the formation of stars and galaxies, and the birth of our solar system and Earth. It sparks wonder about physics, chemistry, geology, and astronomy.',
    '6-12',
    ARRAY['astronomy','physics','geography']::cosmic_study_area[],
    1
  ),
  (
    NULL,
    'story_of_life',
    'The Story of Life',
    'The Timeline of Life on Earth',
    'The second Great Lesson traces the emergence of life from single-celled organisms through the age of dinosaurs to the present. It opens exploration in biology, botany, zoology, and palaeontology.',
    '6-12',
    ARRAY['biology','geography','history']::cosmic_study_area[],
    2
  ),
  (
    NULL,
    'story_of_humans',
    'The Coming of Human Beings',
    'How Humans Changed the World',
    'The third Great Lesson explores the unique qualities of humans — imagination, a working hand, and a mathematical mind — and how they enabled human civilisations to transform the planet.',
    '6-12',
    ARRAY['history','culture_society','geography','economics']::cosmic_study_area[],
    3
  ),
  (
    NULL,
    'story_of_communication',
    'The Story of Communication in Signs',
    'The History of Writing and Language',
    'The fourth Great Lesson traces the development of writing — from cave paintings and pictograms through hieroglyphics, cuneiform, the Phoenician alphabet to modern scripts. It grounds language arts study.',
    '6-12',
    ARRAY['language_arts','history','culture_society','art_music']::cosmic_study_area[],
    4
  ),
  (
    NULL,
    'story_of_numbers',
    'The Story of Numbers',
    'The History of Mathematics',
    'The fifth Great Lesson explores how different civilisations developed number systems — from tally marks and Roman numerals to the Hindu-Arabic decimal system — and why mathematics is a human invention.',
    '6-12',
    ARRAY['mathematics','history','culture_society']::cosmic_study_area[],
    5
  );

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (key, label, description, module)
VALUES
  ('view_cosmic_education',   'View Cosmic Education',   'View cosmic education unit plans and study records',         'cosmic_education'),
  ('manage_cosmic_education', 'Manage Cosmic Education',  'Create and manage cosmic education units and study records', 'cosmic_education')
ON CONFLICT (key) DO NOTHING;

-- Backfill Owner, Admin, Head of School — full manage access
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rp.role_id
    FROM role_permissions rp
    JOIN roles ro ON ro.id = rp.role_id
    WHERE ro.name IN ('Owner','Admin','Head of School')
    GROUP BY rp.role_id
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'view_cosmic_education'),
      (r.role_id, 'manage_cosmic_education')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Guide / Lead Educator / Educator — view + manage (they plan and deliver units)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rp.role_id
    FROM role_permissions rp
    JOIN roles ro ON ro.id = rp.role_id
    WHERE ro.name IN ('Guide','Lead Educator','Educator')
    GROUP BY rp.role_id
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'view_cosmic_education'),
      (r.role_id, 'manage_cosmic_education')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
