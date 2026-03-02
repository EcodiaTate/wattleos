-- ============================================================
-- WattleOS V2 — Migration 00014: Backfill Owner & Admin Permissions
-- ============================================================
-- BUG FIX: Migrations 00004 through 00013 each inserted new
-- permissions into the `permissions` table but skipped backfilling
-- `role_permissions` for Owner and Administrator on existing
-- tenants. The comments said "auto-covered by seed_tenant_roles()"
-- but that trigger only fires on INSERT INTO tenants (new tenant
-- creation). Existing tenants' Owner/Admin roles were never
-- granted the 43 permissions added across those 6 migrations.
--
-- Affected permissions (by source migration):
--   00004: 26 compliance module keys (incidents, medication,
--          staff_compliance, ratios, qip, immunisation, ccs,
--          excursions, compliance, lesson_tracking, mqap)
--   00007: 2 emergency_drills keys
--   00008: 3 emergency_coordination keys
--   00011: 7 rostering keys
--   00012: 3 learning_plans keys
--   00013: 2 daily_care keys
--
-- Also backfills Head of School for any module groups that were
-- added in later migrations but not granted to existing HoS roles.
--
-- This migration is fully idempotent (ON CONFLICT DO NOTHING).
-- New tenants created after each migration are already correct
-- because seed_tenant_roles() does a point-in-time SELECT * on
-- creation.
-- ============================================================


DO $$
DECLARE
  r_tenant        RECORD;
  v_owner         UUID;
  v_admin         UUID;
  v_head          UUID;
  v_lead_guide    UUID;
  v_guide         UUID;
  v_assistant     UUID;
BEGIN
  FOR r_tenant IN SELECT id FROM tenants LOOP

    -- ── Owner: ALL permissions ────────────────────────────────
    SELECT id INTO v_owner FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Owner' AND is_system = true;

    IF v_owner IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_owner, p.id
      FROM permissions p
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Administrator: ALL except manage_tenant_settings ──────
    SELECT id INTO v_admin FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Administrator' AND is_system = true;

    IF v_admin IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_admin, p.id
      FROM permissions p
      WHERE p.key != 'manage_tenant_settings'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Head of School: all pedagogy + sis + attendance + comms
    --    + all compliance + rostering + learning plans + daily care
    --    (Matches the latest seed_tenant_roles from 00013)
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module IN (
        'pedagogy', 'sis', 'attendance', 'comms',
        'incidents', 'medication', 'staff_compliance', 'ratios',
        'qip', 'immunisation', 'ccs', 'excursions', 'compliance',
        'lesson_tracking', 'mqap',
        'emergency_drills',
        'emergency_coordination',
        'rostering',
        'learning_plans',
        'daily_care'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Lead Guide: core classroom + operational compliance
    --    + rostering + learning plans + daily care
    --    (Matches the latest seed_tenant_roles from 00013)
    SELECT id INTO v_lead_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Lead Guide' AND is_system = true;

    IF v_lead_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_lead_guide, p.id
      FROM permissions p
      WHERE p.key IN (
        'create_observation', 'publish_observation', 'view_all_observations',
        'manage_curriculum', 'manage_mastery', 'manage_reports',
        'view_students', 'view_medical_records',
        'manage_attendance', 'view_attendance_reports',
        'view_classes',
        'send_class_messages',
        -- Compliance
        'create_incident', 'manage_incidents', 'view_incidents',
        'administer_medication', 'view_medication_records', 'manage_medication_plans',
        'manage_floor_signin', 'view_ratios',
        'view_qip',
        'view_immunisation',
        'manage_excursions', 'view_excursions',
        'view_complaints',
        'manage_lesson_records', 'view_lesson_records',
        'view_mqap',
        -- Emergency Drills
        'manage_emergency_drills', 'view_emergency_drills',
        -- Emergency Coordination
        'coordinate_emergency', 'view_emergency_coordination',
        -- Rostering
        'manage_roster', 'view_roster', 'manage_leave',
        'request_leave', 'request_shift_swap', 'manage_coverage',
        -- Learning Plans
        'manage_ilp', 'view_ilp',
        -- Daily Care
        'manage_daily_care_logs', 'view_daily_care_logs'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Guide: classroom essentials + floor compliance
    --    + self-service rostering + learning plans + daily care
    SELECT id INTO v_guide FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Guide' AND is_system = true;

    IF v_guide IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_guide, p.id
      FROM permissions p
      WHERE p.key IN (
        'create_observation', 'publish_observation',
        'view_students', 'view_medical_records',
        'manage_attendance',
        'view_classes',
        'manage_mastery',
        'send_class_messages',
        -- Compliance
        'create_incident',
        'administer_medication', 'view_medication_records',
        'manage_floor_signin',
        'manage_lesson_records', 'view_lesson_records',
        'view_excursions',
        -- Emergency Drills
        'view_emergency_drills',
        -- Emergency Coordination
        'coordinate_emergency', 'view_emergency_coordination',
        -- Rostering
        'view_roster', 'request_leave', 'request_shift_swap', 'accept_coverage',
        -- Learning Plans
        'manage_ilp', 'view_ilp',
        -- Daily Care
        'manage_daily_care_logs', 'view_daily_care_logs'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- ── Assistant: minimal access + basic rostering + view learning plans + daily care
    SELECT id INTO v_assistant FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Assistant' AND is_system = true;

    IF v_assistant IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_assistant, p.id
      FROM permissions p
      WHERE p.key IN (
        'create_observation', 'view_students', 'manage_attendance',
        'view_classes',
        -- Compliance
        'create_incident',
        'manage_floor_signin',
        -- Emergency Coordination
        'view_emergency_coordination',
        -- Rostering
        'view_roster', 'request_leave', 'accept_coverage',
        -- Learning Plans
        'view_ilp',
        -- Daily Care
        'manage_daily_care_logs', 'view_daily_care_logs'
      )
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

  END LOOP;
END;
$$;


-- ============================================================
-- Verification queries (run manually after migration):
-- ============================================================
-- Total permission count (should be 90):
--   SELECT count(*) FROM permissions;
--
-- Owner should have ALL permissions:
--   SELECT t.name AS tenant, count(*) AS owner_perms
--   FROM role_permissions rp
--   JOIN roles r ON r.id = rp.role_id
--   JOIN tenants t ON t.id = rp.tenant_id
--   WHERE r.name = 'Owner' AND r.is_system = true
--   GROUP BY t.name;
--
-- Admin should have ALL - 1 (missing manage_tenant_settings):
--   SELECT t.name AS tenant, count(*) AS admin_perms
--   FROM role_permissions rp
--   JOIN roles r ON r.id = rp.role_id
--   JOIN tenants t ON t.id = rp.tenant_id
--   WHERE r.name = 'Administrator' AND r.is_system = true
--   GROUP BY t.name;
