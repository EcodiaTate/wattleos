-- ============================================================
-- Migration 00071: Add WITH CHECK clauses to ~18 tables
-- ============================================================
-- Multiple tables use USING-only RLS patterns without explicit
-- WITH CHECK clauses. Without WITH CHECK, INSERT/UPDATE inherit
-- the USING clause which may not enforce correct tenant scoping
-- on writes. This migration replaces those implicit ALL policies
-- with explicit per-operation policies.
-- ============================================================

-- ── photo_sessions (00015) ──────────────────────────────────
DROP POLICY IF EXISTS photo_sessions_tenant ON photo_sessions;
CREATE POLICY photo_sessions_select ON photo_sessions
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY photo_sessions_insert ON photo_sessions
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY photo_sessions_update ON photo_sessions
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY photo_sessions_delete ON photo_sessions
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── person_photos (00015) ───────────────────────────────────
DROP POLICY IF EXISTS person_photos_tenant ON person_photos;
CREATE POLICY person_photos_select ON person_photos
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY person_photos_insert ON person_photos
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY person_photos_update ON person_photos
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY person_photos_delete ON person_photos
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── id_card_templates (00015) ───────────────────────────────
DROP POLICY IF EXISTS id_card_templates_tenant ON id_card_templates;
CREATE POLICY id_card_templates_select ON id_card_templates
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY id_card_templates_insert ON id_card_templates
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY id_card_templates_update ON id_card_templates
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY id_card_templates_delete ON id_card_templates
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── recurring_billing_setups (00032) ────────────────────────
DROP POLICY IF EXISTS "recurring_billing_setups_tenant_isolation" ON recurring_billing_setups;
CREATE POLICY recurring_billing_setups_select ON recurring_billing_setups
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY recurring_billing_setups_insert ON recurring_billing_setups
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY recurring_billing_setups_update ON recurring_billing_setups
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY recurring_billing_setups_delete ON recurring_billing_setups
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── recurring_billing_schedules (00032) ─────────────────────
DROP POLICY IF EXISTS "recurring_billing_schedules_tenant_isolation" ON recurring_billing_schedules;
CREATE POLICY recurring_billing_schedules_select ON recurring_billing_schedules
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY recurring_billing_schedules_insert ON recurring_billing_schedules
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY recurring_billing_schedules_update ON recurring_billing_schedules
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY recurring_billing_schedules_delete ON recurring_billing_schedules
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── billing_payment_attempts (00032) ────────────────────────
DROP POLICY IF EXISTS "billing_payment_attempts_tenant_isolation" ON billing_payment_attempts;
CREATE POLICY billing_payment_attempts_select ON billing_payment_attempts
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY billing_payment_attempts_insert ON billing_payment_attempts
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY billing_payment_attempts_update ON billing_payment_attempts
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY billing_payment_attempts_delete ON billing_payment_attempts
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── billing_failures (00032) ────────────────────────────────
DROP POLICY IF EXISTS "billing_failures_tenant_isolation" ON billing_failures;
CREATE POLICY billing_failures_select ON billing_failures
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY billing_failures_insert ON billing_failures
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY billing_failures_update ON billing_failures
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY billing_failures_delete ON billing_failures
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── school_events (00033) ───────────────────────────────────
DROP POLICY IF EXISTS "school_events_tenant_isolation" ON school_events;
CREATE POLICY school_events_select ON school_events
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY school_events_insert ON school_events
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY school_events_update ON school_events
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY school_events_delete ON school_events
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── event_rsvps (00033) ─────────────────────────────────────
DROP POLICY IF EXISTS "event_rsvps_tenant_isolation" ON event_rsvps;
CREATE POLICY event_rsvps_select ON event_rsvps
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY event_rsvps_insert ON event_rsvps
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY event_rsvps_update ON event_rsvps
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY event_rsvps_delete ON event_rsvps
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── environment_plans (00035) ───────────────────────────────
DROP POLICY IF EXISTS "environment_plans_tenant_isolation" ON environment_plans;
CREATE POLICY environment_plans_select ON environment_plans
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY environment_plans_insert ON environment_plans
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY environment_plans_update ON environment_plans
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY environment_plans_delete ON environment_plans
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── plan_shelf_slots (00035) ────────────────────────────────
DROP POLICY IF EXISTS "plan_shelf_slots_tenant_isolation" ON plan_shelf_slots;
CREATE POLICY plan_shelf_slots_select ON plan_shelf_slots
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY plan_shelf_slots_insert ON plan_shelf_slots
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY plan_shelf_slots_update ON plan_shelf_slots
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY plan_shelf_slots_delete ON plan_shelf_slots
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── rotation_schedules (00035) ──────────────────────────────
DROP POLICY IF EXISTS "rotation_schedules_tenant_isolation" ON rotation_schedules;
CREATE POLICY rotation_schedules_select ON rotation_schedules
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY rotation_schedules_insert ON rotation_schedules
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY rotation_schedules_update ON rotation_schedules
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY rotation_schedules_delete ON rotation_schedules
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── accreditation_cycles (00036) ────────────────────────────
DROP POLICY IF EXISTS "accreditation_cycles_tenant_isolation" ON accreditation_cycles;
CREATE POLICY accreditation_cycles_select ON accreditation_cycles
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY accreditation_cycles_insert ON accreditation_cycles
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_cycles_update ON accreditation_cycles
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_cycles_delete ON accreditation_cycles
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── accreditation_assessments (00036) ───────────────────────
DROP POLICY IF EXISTS "accreditation_assessments_tenant_isolation" ON accreditation_assessments;
CREATE POLICY accreditation_assessments_select ON accreditation_assessments
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY accreditation_assessments_insert ON accreditation_assessments
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_assessments_update ON accreditation_assessments
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_assessments_delete ON accreditation_assessments
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── accreditation_evidence (00036) ──────────────────────────
DROP POLICY IF EXISTS "accreditation_evidence_tenant_isolation" ON accreditation_evidence;
CREATE POLICY accreditation_evidence_select ON accreditation_evidence
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY accreditation_evidence_insert ON accreditation_evidence
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_evidence_update ON accreditation_evidence
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_evidence_delete ON accreditation_evidence
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── accreditation_criteria (00036) ──────────────────────────
-- Special: allows NULL tenant_id for global seed rows.
DROP POLICY IF EXISTS "accreditation_criteria_access" ON accreditation_criteria;
CREATE POLICY accreditation_criteria_select ON accreditation_criteria
  FOR SELECT USING (tenant_id IS NULL OR tenant_id = current_tenant_id());
CREATE POLICY accreditation_criteria_insert ON accreditation_criteria
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_criteria_update ON accreditation_criteria
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY accreditation_criteria_delete ON accreditation_criteria
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── excursion_transport_bookings (00037) ────────────────────
DROP POLICY IF EXISTS "excursion_transport_bookings_tenant_isolation" ON excursion_transport_bookings;
CREATE POLICY excursion_transport_bookings_select ON excursion_transport_bookings
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY excursion_transport_bookings_insert ON excursion_transport_bookings
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY excursion_transport_bookings_update ON excursion_transport_bookings
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY excursion_transport_bookings_delete ON excursion_transport_bookings
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── previous_school_records (00038) ─────────────────────────
DROP POLICY IF EXISTS "tenant_isolation" ON previous_school_records;
CREATE POLICY previous_school_records_select ON previous_school_records
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY previous_school_records_insert ON previous_school_records
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY previous_school_records_update ON previous_school_records
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY previous_school_records_delete ON previous_school_records
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── acara_report_periods (00039) ────────────────────────────
DROP POLICY IF EXISTS "acara_report_periods_tenant_isolation" ON acara_report_periods;
CREATE POLICY acara_report_periods_select ON acara_report_periods
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY acara_report_periods_insert ON acara_report_periods
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY acara_report_periods_update ON acara_report_periods
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY acara_report_periods_delete ON acara_report_periods
  FOR DELETE USING (tenant_id = current_tenant_id());

-- ── acara_student_records (00039) ───────────────────────────
DROP POLICY IF EXISTS "acara_student_records_tenant_isolation" ON acara_student_records;
CREATE POLICY acara_student_records_select ON acara_student_records
  FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY acara_student_records_insert ON acara_student_records
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY acara_student_records_update ON acara_student_records
  FOR UPDATE USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY acara_student_records_delete ON acara_student_records
  FOR DELETE USING (tenant_id = current_tenant_id());
