-- ============================================================
-- Migration 00016: NCCD Disability Register
-- ============================================================
-- Implements the Nationally Consistent Collection of Data on
-- School Students with Disability (NCCD) register.
--
-- WHY a separate table (not added to students): NCCD is a
-- compliance/reporting construct — one annual snapshot per
-- student. Adding columns to the students table would conflate
-- identity data with regulatory reporting data. A separate
-- table also lets a student have historical NCCD records across
-- multiple collection years.
--
-- WHY evidence_items is a child table: Multiple evidence types
-- can support a single NCCD determination. Linking via FK lets
-- us attach existing observations or ILP evidence items without
-- duplicating data.
--
-- NCCD official levels (DSS 2024 guidelines):
--   1. Quality Differentiated Teaching Practice (QDTP)
--   2. Supplementary Adjustments
--   3. Substantial Adjustments
--   4. Extensive Adjustments
--
-- NCCD adjustment types (CEIA):
--   Curriculum · Environmental · Instructional · Assessment
--
-- NCCD disability categories (aligned to NCCD data portal):
--   Physical · Cognitive · Sensory/Hearing · Sensory/Vision
--   Social/Emotional
-- ============================================================

-- ── NCCD Register Entries ────────────────────────────────────

CREATE TABLE nccd_register_entries (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID        NOT NULL REFERENCES tenants(id),
  student_id                 UUID        NOT NULL REFERENCES students(id),

  -- Annual collection snapshot
  collection_year            INTEGER     NOT NULL CHECK (collection_year >= 2020),

  -- NCCD disability classification
  disability_category        TEXT        NOT NULL
    CHECK (disability_category IN (
      'physical', 'cognitive', 'sensory_hearing', 'sensory_vision', 'social_emotional'
    )),
  -- Free-text subcategory / specific diagnosis (optional, confidential)
  disability_subcategory     TEXT,

  -- NCCD level of adjustment (official NCCD terminology)
  adjustment_level           TEXT        NOT NULL
    CHECK (adjustment_level IN (
      'qdtp', 'supplementary', 'substantial', 'extensive'
    )),

  -- Adjustment types provided (CEIA — can be multiple)
  adjustment_types           TEXT[]      NOT NULL DEFAULT '{}',

  -- Funding details
  funding_source             TEXT        CHECK (funding_source IN (
    'inclusion_support_programme', 'ndis', 'state_disability', 'school_funded', 'none', 'other'
  )),
  funding_reference          TEXT,
  funding_amount             NUMERIC(10,2),

  -- Professional opinion / supporting documentation
  professional_opinion       BOOLEAN     NOT NULL DEFAULT FALSE,
  professional_name          TEXT,
  professional_title         TEXT,
  professional_date          DATE,

  -- Parental consent for NCCD reporting
  parental_consent_given     BOOLEAN     NOT NULL DEFAULT FALSE,
  parental_consent_date      DATE,
  parental_consent_by        UUID        REFERENCES users(id),

  -- Link to an existing ILP (optional — avoids duplicating support plan data)
  ilp_id                     UUID        REFERENCES individual_learning_plans(id),

  -- Review and notes
  status                     TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'under_review', 'exited', 'archived')),
  notes                      TEXT,
  review_due_date            DATE,

  -- Annual collection submission
  submitted_to_collection    BOOLEAN     NOT NULL DEFAULT FALSE,
  collection_submitted_at    TIMESTAMPTZ,
  collection_submitted_by    UUID        REFERENCES users(id),

  -- Audit
  created_by                 UUID        NOT NULL REFERENCES users(id),
  updated_by                 UUID        REFERENCES users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                 TIMESTAMPTZ
);

-- One active record per student per collection year
-- (deleted_at IS NULL partial index allows historical records to coexist)
CREATE UNIQUE INDEX unique_nccd_student_year_active
  ON nccd_register_entries (student_id, collection_year)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_nccd_entries_tenant
  ON nccd_register_entries (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_nccd_entries_student
  ON nccd_register_entries (tenant_id, student_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_nccd_entries_year
  ON nccd_register_entries (tenant_id, collection_year)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_nccd_entries_level
  ON nccd_register_entries (tenant_id, adjustment_level)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_nccd_entries_status
  ON nccd_register_entries (tenant_id, status)
  WHERE deleted_at IS NULL;

-- ── NCCD Evidence Items ──────────────────────────────────────

CREATE TABLE nccd_evidence_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id),
  entry_id          UUID        NOT NULL REFERENCES nccd_register_entries(id) ON DELETE CASCADE,
  student_id        UUID        NOT NULL REFERENCES students(id),

  evidence_type     TEXT        NOT NULL
    CHECK (evidence_type IN (
      'professional_report', 'school_assessment', 'classroom_observation',
      'parent_report', 'medical_certificate', 'ndis_plan',
      'naplan_results', 'work_sample', 'other'
    )),
  description       TEXT        NOT NULL,

  -- Linkages to other modules (all optional — can be standalone)
  observation_id    UUID        REFERENCES observations(id),
  ilp_evidence_id   UUID        REFERENCES ilp_evidence(id),

  -- External document (Supabase Storage URL)
  document_url      TEXT,
  document_name     TEXT,

  evidence_date     DATE,

  -- Audit
  created_by        UUID        NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_nccd_evidence_entry
  ON nccd_evidence_items (entry_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_nccd_evidence_tenant
  ON nccd_evidence_items (tenant_id)
  WHERE deleted_at IS NULL;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE nccd_register_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nccd_evidence_items   ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped: all staff of the tenant can read/write
-- (further restriction to VIEW_NCCD / MANAGE_NCCD enforced at application layer)
CREATE POLICY nccd_entries_tenant ON nccd_register_entries
  USING (tenant_id = current_tenant_id());

CREATE POLICY nccd_evidence_tenant ON nccd_evidence_items
  USING (tenant_id = current_tenant_id());

-- ── Permissions ──────────────────────────────────────────────

INSERT INTO permissions (key, label, module, description) VALUES
  ('manage_nccd', 'Manage NCCD Register', 'nccd',
   'Create, update, and submit NCCD disability register entries and supporting evidence'),
  ('view_nccd', 'View NCCD Register', 'nccd',
   'View NCCD disability register entries and annual collection reports');

-- ── Backfill: Grant to Owner, Admin, Head of School ──────────

DO $$
DECLARE
  r       RECORD;
  perm_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT rp.role_id
    FROM roles
    JOIN role_permissions rp ON rp.role_id = roles.id
    WHERE roles.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    FOR perm_id IN
      SELECT id FROM permissions
      WHERE key IN ('manage_nccd', 'view_nccd')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── updated_at triggers ──────────────────────────────────────

CREATE TRIGGER set_nccd_entries_updated_at
  BEFORE UPDATE ON nccd_register_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
