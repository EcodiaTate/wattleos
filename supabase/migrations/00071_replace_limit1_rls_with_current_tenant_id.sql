-- Migration 00071: Replace all LIMIT 1 tenant scoping RLS patterns
--
-- SECURITY FIX: 13+ tables used a non-deterministic RLS pattern:
--   tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
--
-- For users belonging to multiple tenants, LIMIT 1 without ORDER BY is
-- non-deterministic — the user could see School A's data while logged
-- into School B. Replace with current_tenant_id() which reads the
-- tenant_id from the JWT and is always deterministic.
--
-- Also fixes: some policies used has_permission(auth.uid(), ...) or
-- has_permission(auth.uid(), tenant_id, ...) which don't match the
-- actual 1-parameter function signature. Corrected to has_permission('key').

BEGIN;

-- ============================================================
-- 00040: Cosmic Education (5 policies)
-- ============================================================

-- cosmic_great_lessons: global + tenant rows
DROP POLICY IF EXISTS "cosmic_great_lessons_access" ON cosmic_great_lessons;
CREATE POLICY "cosmic_great_lessons_access" ON cosmic_great_lessons
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = current_tenant_id()
  );

-- cosmic_units
DROP POLICY IF EXISTS "cosmic_units_tenant_isolation" ON cosmic_units;
CREATE POLICY "cosmic_units_tenant_isolation" ON cosmic_units
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- cosmic_unit_studies
DROP POLICY IF EXISTS "cosmic_unit_studies_tenant_isolation" ON cosmic_unit_studies;
CREATE POLICY "cosmic_unit_studies_tenant_isolation" ON cosmic_unit_studies
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- cosmic_unit_participants
DROP POLICY IF EXISTS "cosmic_unit_participants_tenant_isolation" ON cosmic_unit_participants;
CREATE POLICY "cosmic_unit_participants_tenant_isolation" ON cosmic_unit_participants
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- cosmic_study_records
DROP POLICY IF EXISTS "cosmic_study_records_tenant_isolation" ON cosmic_study_records;
CREATE POLICY "cosmic_study_records_tenant_isolation" ON cosmic_study_records
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================================
-- 00059: Visitor & Contractor Log (4 policies)
-- Also fixes: has_permission(auth.uid(), 'key') → has_permission('key')
-- ============================================================

-- visitor_sign_in_records SELECT
DROP POLICY IF EXISTS "visitor_log_select" ON visitor_sign_in_records;
CREATE POLICY "visitor_log_select" ON visitor_sign_in_records
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_visitor_log')
    AND deleted_at IS NULL
  );

-- visitor_sign_in_records ALL (write)
DROP POLICY IF EXISTS "visitor_log_write" ON visitor_sign_in_records;
CREATE POLICY "visitor_log_write" ON visitor_sign_in_records
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_visitor_log')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_visitor_log')
  );

-- contractor_sign_in_records SELECT
DROP POLICY IF EXISTS "contractor_log_select" ON contractor_sign_in_records;
CREATE POLICY "contractor_log_select" ON contractor_sign_in_records
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_contractor_log')
    AND deleted_at IS NULL
  );

-- contractor_sign_in_records ALL (write)
DROP POLICY IF EXISTS "contractor_log_write" ON contractor_sign_in_records;
CREATE POLICY "contractor_log_write" ON contractor_sign_in_records
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_contractor_log')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_contractor_log')
  );

-- ============================================================
-- 00060: NAPLAN Coordination (12 policies)
-- Also fixes: has_permission(auth.uid(), tenant_id, 'key') → has_permission('key')
-- ============================================================

-- naplan_test_windows
DROP POLICY IF EXISTS "naplan_windows_select" ON naplan_test_windows;
CREATE POLICY "naplan_windows_select" ON naplan_test_windows
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_naplan')
  );

DROP POLICY IF EXISTS "naplan_windows_insert" ON naplan_test_windows;
CREATE POLICY "naplan_windows_insert" ON naplan_test_windows
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

DROP POLICY IF EXISTS "naplan_windows_update" ON naplan_test_windows;
CREATE POLICY "naplan_windows_update" ON naplan_test_windows
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

DROP POLICY IF EXISTS "naplan_windows_delete" ON naplan_test_windows;
CREATE POLICY "naplan_windows_delete" ON naplan_test_windows
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
    AND status = 'draft'
  );

-- naplan_cohort_entries
DROP POLICY IF EXISTS "naplan_cohort_select" ON naplan_cohort_entries;
CREATE POLICY "naplan_cohort_select" ON naplan_cohort_entries
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_naplan')
  );

DROP POLICY IF EXISTS "naplan_cohort_insert" ON naplan_cohort_entries;
CREATE POLICY "naplan_cohort_insert" ON naplan_cohort_entries
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

DROP POLICY IF EXISTS "naplan_cohort_update" ON naplan_cohort_entries;
CREATE POLICY "naplan_cohort_update" ON naplan_cohort_entries
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

DROP POLICY IF EXISTS "naplan_cohort_delete" ON naplan_cohort_entries;
CREATE POLICY "naplan_cohort_delete" ON naplan_cohort_entries
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

-- naplan_domain_results
DROP POLICY IF EXISTS "naplan_results_select" ON naplan_domain_results;
CREATE POLICY "naplan_results_select" ON naplan_domain_results
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_naplan')
  );

DROP POLICY IF EXISTS "naplan_results_insert" ON naplan_domain_results;
CREATE POLICY "naplan_results_insert" ON naplan_domain_results
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

DROP POLICY IF EXISTS "naplan_results_update" ON naplan_domain_results;
CREATE POLICY "naplan_results_update" ON naplan_domain_results
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

DROP POLICY IF EXISTS "naplan_results_delete" ON naplan_domain_results;
CREATE POLICY "naplan_results_delete" ON naplan_domain_results
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_naplan')
  );

-- ============================================================
-- 00062: Montessori Accreditation (5 policies)
-- ============================================================

-- accreditation_criteria: global + tenant rows
DROP POLICY IF EXISTS "accreditation_criteria_read" ON accreditation_criteria;
CREATE POLICY "accreditation_criteria_read" ON accreditation_criteria
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = current_tenant_id()
  );

-- accreditation_criteria: write (tenant only)
DROP POLICY IF EXISTS "accreditation_criteria_write" ON accreditation_criteria;
CREATE POLICY "accreditation_criteria_write" ON accreditation_criteria
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- accreditation_cycles
DROP POLICY IF EXISTS "accreditation_cycles_tenant_isolation" ON accreditation_cycles;
CREATE POLICY "accreditation_cycles_tenant_isolation" ON accreditation_cycles
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- accreditation_assessments
DROP POLICY IF EXISTS "accreditation_assessments_tenant_isolation" ON accreditation_assessments;
CREATE POLICY "accreditation_assessments_tenant_isolation" ON accreditation_assessments
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- accreditation_evidence
DROP POLICY IF EXISTS "accreditation_evidence_tenant_isolation" ON accreditation_evidence;
CREATE POLICY "accreditation_evidence_tenant_isolation" ON accreditation_evidence
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================================
-- 00063: Observation Auto-Tagging (1 policy)
-- ============================================================

DROP POLICY IF EXISTS "observation_tag_suggestions_tenant_isolation" ON observation_tag_suggestions;
CREATE POLICY "observation_tag_suggestions_tenant_isolation" ON observation_tag_suggestions
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- ============================================================
-- 00064: Montessori Literacy Hub (4 policies)
-- ============================================================

-- hub_articles: global + tenant SELECT
DROP POLICY IF EXISTS "hub_articles_tenant_read" ON montessori_hub_articles;
CREATE POLICY "hub_articles_tenant_read" ON montessori_hub_articles
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      tenant_id IS NULL
      OR tenant_id = current_tenant_id()
    )
  );

-- hub_articles: write (tenant only)
DROP POLICY IF EXISTS "hub_articles_tenant_write" ON montessori_hub_articles;
CREATE POLICY "hub_articles_tenant_write" ON montessori_hub_articles
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- hub_reads
DROP POLICY IF EXISTS "hub_reads_tenant_isolation" ON montessori_hub_reads;
CREATE POLICY "hub_reads_tenant_isolation" ON montessori_hub_reads
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- hub_feedback
DROP POLICY IF EXISTS "hub_feedback_tenant_isolation" ON montessori_hub_feedback;
CREATE POLICY "hub_feedback_tenant_isolation" ON montessori_hub_feedback
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

COMMIT;
