-- ============================================================
-- Migration 00073: Add deleted_at IS NULL filter to all RLS
-- policies that use tenant_members/tenant_users subqueries
-- ============================================================
-- Many RLS policies from migrations 00022-00039 use:
--   tenant_id = (SELECT tenant_id FROM tenant_members
--     WHERE user_id = auth.uid() LIMIT 1)
--
-- These have two problems:
-- 1. The table is named tenant_users, not tenant_members
--    (but a VIEW named tenant_members may exist for compat)
-- 2. They don't filter on deleted_at IS NULL, meaning a
--    soft-deleted user's row could still match
--
-- This migration replaces ALL affected policies with the
-- canonical current_tenant_id() function which is JWT-based
-- and doesn't have either problem. This is the same fix as
-- Prompt 14 but scoped to the remaining tables not yet fixed.
--
-- NOTE: Migration 00071 already replaced policies on tables
-- from 00032-00039. This migration covers tables from
-- 00022-00024 that were not addressed there.
-- ============================================================

-- ── Tables from 00022 (parent_teacher_interviews) ──────────
-- Check if these tables exist before modifying
DO $$
BEGIN
  -- interview_sessions
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'interview_sessions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "interview_sessions_tenant_isolation" ON interview_sessions';
    EXECUTE 'CREATE POLICY interview_sessions_select ON interview_sessions
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_sessions_insert ON interview_sessions
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_sessions_update ON interview_sessions
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_sessions_delete ON interview_sessions
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  -- interview_slots
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'interview_slots') THEN
    EXECUTE 'DROP POLICY IF EXISTS "interview_slots_tenant_isolation" ON interview_slots';
    EXECUTE 'CREATE POLICY interview_slots_select ON interview_slots
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_slots_insert ON interview_slots
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_slots_update ON interview_slots
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_slots_delete ON interview_slots
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  -- interview_bookings
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'interview_bookings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "interview_bookings_tenant_isolation" ON interview_bookings';
    EXECUTE 'CREATE POLICY interview_bookings_select ON interview_bookings
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_bookings_insert ON interview_bookings
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_bookings_update ON interview_bookings
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY interview_bookings_delete ON interview_bookings
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;
END $$;

-- ── Tables from 00023 (chronic_absence_monitoring) ─────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chronic_absence_thresholds') THEN
    EXECUTE 'DROP POLICY IF EXISTS "chronic_absence_thresholds_tenant_isolation" ON chronic_absence_thresholds';
    EXECUTE 'CREATE POLICY chronic_absence_thresholds_select ON chronic_absence_thresholds
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY chronic_absence_thresholds_insert ON chronic_absence_thresholds
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY chronic_absence_thresholds_update ON chronic_absence_thresholds
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY chronic_absence_thresholds_delete ON chronic_absence_thresholds
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chronic_absence_flags') THEN
    EXECUTE 'DROP POLICY IF EXISTS "chronic_absence_flags_tenant_isolation" ON chronic_absence_flags';
    EXECUTE 'CREATE POLICY chronic_absence_flags_select ON chronic_absence_flags
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY chronic_absence_flags_insert ON chronic_absence_flags
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY chronic_absence_flags_update ON chronic_absence_flags
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY chronic_absence_flags_delete ON chronic_absence_flags
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'absence_followup_actions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "absence_followup_actions_tenant_isolation" ON absence_followup_actions';
    EXECUTE 'CREATE POLICY absence_followup_actions_select ON absence_followup_actions
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY absence_followup_actions_insert ON absence_followup_actions
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY absence_followup_actions_update ON absence_followup_actions
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY absence_followup_actions_delete ON absence_followup_actions
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'absence_followup_contacts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "absence_followup_contacts_tenant_isolation" ON absence_followup_contacts';
    EXECUTE 'CREATE POLICY absence_followup_contacts_select ON absence_followup_contacts
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY absence_followup_contacts_insert ON absence_followup_contacts
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY absence_followup_contacts_update ON absence_followup_contacts
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY absence_followup_contacts_delete ON absence_followup_contacts
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;
END $$;

-- ── Tables from 00024 (volunteer_coordination) ─────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'volunteer_profiles') THEN
    EXECUTE 'DROP POLICY IF EXISTS "volunteer_profiles_tenant_isolation" ON volunteer_profiles';
    EXECUTE 'CREATE POLICY volunteer_profiles_select ON volunteer_profiles
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_profiles_insert ON volunteer_profiles
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_profiles_update ON volunteer_profiles
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_profiles_delete ON volunteer_profiles
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'volunteer_opportunities') THEN
    EXECUTE 'DROP POLICY IF EXISTS "volunteer_opportunities_tenant_isolation" ON volunteer_opportunities';
    EXECUTE 'CREATE POLICY volunteer_opportunities_select ON volunteer_opportunities
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_opportunities_insert ON volunteer_opportunities
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_opportunities_update ON volunteer_opportunities
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_opportunities_delete ON volunteer_opportunities
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'volunteer_signups') THEN
    EXECUTE 'DROP POLICY IF EXISTS "volunteer_signups_tenant_isolation" ON volunteer_signups';
    EXECUTE 'CREATE POLICY volunteer_signups_select ON volunteer_signups
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_signups_insert ON volunteer_signups
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_signups_update ON volunteer_signups
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_signups_delete ON volunteer_signups
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'volunteer_hours') THEN
    EXECUTE 'DROP POLICY IF EXISTS "volunteer_hours_tenant_isolation" ON volunteer_hours';
    EXECUTE 'CREATE POLICY volunteer_hours_select ON volunteer_hours
      FOR SELECT USING (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_hours_insert ON volunteer_hours
      FOR INSERT WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_hours_update ON volunteer_hours
      FOR UPDATE USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())';
    EXECUTE 'CREATE POLICY volunteer_hours_delete ON volunteer_hours
      FOR DELETE USING (tenant_id = current_tenant_id())';
  END IF;
END $$;
