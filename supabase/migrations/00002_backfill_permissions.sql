-- ============================================================
-- WattleOS V2 — Migration 00002: Backfill Missing Permissions
-- ============================================================
-- The seed file originally only contained 20 permissions.
-- Modules added after the initial launch (classes, timesheets,
-- programs, enrollment, admissions, comms extensions,
-- curriculum_content) were never inserted into the permissions
-- table, so no role could ever be granted them.
--
-- This migration:
--   1. Inserts the 27 missing system permissions
--   2. Backfills role_permissions for every existing tenant
--      using the same logic as seed_tenant_roles():
--        • Owner      → all permissions
--        • Admin      → all except manage_tenant_settings
--        • Head       → all pedagogy + sis + attendance + comms
--        • Lead Guide → explicit list (unchanged)
--        • Guide      → explicit list (unchanged)
--        • Assistant  → explicit list (unchanged)
--
-- Safe to run multiple times (ON CONFLICT DO NOTHING everywhere).
-- ============================================================

-- ── Step 1: Insert missing permissions ──────────────────────────────

INSERT INTO permissions (key, label, module, description) VALUES

  -- Classes
  ('view_classes',           'View Classes',                'classes', 'View class list, rosters, and class details'),
  ('manage_classes',         'Create & Edit Classes',       'classes', 'Create new classes, edit details, manage rosters'),

  -- Communications extensions
  ('manage_events',          'Manage School Events',        'comms', 'Create, edit, and cancel school calendar events'),
  ('moderate_chat',          'Moderate Chat',               'comms', 'Delete or hide messages in any chat channel'),
  ('manage_directory',       'Manage Family Directory',     'comms', 'View and manage the parent/family contact directory'),
  ('view_message_analytics', 'View Message Analytics',      'comms', 'View announcement reach and read-rate analytics'),

  -- Timesheets
  ('log_time',               'Log Time Entries',            'timesheets', 'Create and edit own time entries'),
  ('approve_timesheets',     'Approve Timesheets',          'timesheets', 'Review and approve/reject staff timesheets'),
  ('view_all_timesheets',    'View All Timesheets',         'timesheets', 'View timesheets for all staff members'),

  -- Enrollment & Onboarding
  ('manage_enrollment_periods',  'Manage Enrollment Periods',    'enrollment', 'Create and manage enrollment intake periods'),
  ('review_applications',        'Review Applications',          'enrollment', 'View and comment on enrollment applications'),
  ('approve_applications',       'Approve Applications',         'enrollment', 'Accept or reject enrollment applications'),
  ('manage_parent_invitations',  'Manage Parent Invitations',    'enrollment', 'Send and revoke parent portal invitations'),
  ('view_enrollment_dashboard',  'View Enrollment Dashboard',    'enrollment', 'View enrollment funnel metrics and dashboards'),

  -- Programs / OSHC
  ('manage_programs',        'Manage Programs',             'programs', 'Create and configure OSHC and care programs'),
  ('manage_bookings',        'Manage Session Bookings',     'programs', 'Create, edit, and cancel student session bookings'),
  ('checkin_checkout',       'Check-in / Check-out',        'programs', 'Check students in and out at the kiosk'),
  ('view_program_reports',   'View Program Reports',        'programs', 'View utilisation and revenue reports for programs'),
  ('manage_ccs_settings',    'Manage CCS Settings',         'programs', 'Configure Child Care Subsidy activity types and settings'),

  -- Admissions & Waitlist
  ('manage_waitlist',           'Manage Waitlist',          'admissions', 'Add, edit, and remove waitlist entries'),
  ('view_waitlist',             'View Waitlist',            'admissions', 'View waitlist entries and family details'),
  ('manage_tours',              'Manage Tours',             'admissions', 'Create tour slots and record attendance'),
  ('manage_email_templates',    'Manage Email Templates',   'admissions', 'Create and edit automated admissions email templates'),
  ('view_admissions_analytics', 'View Admissions Analytics','admissions', 'View waitlist conversion and tour funnel analytics'),

  -- Curriculum Content
  ('manage_cross_mappings',        'Manage Cross-Mappings',       'curriculum_content', 'Create mappings between curriculum frameworks'),
  ('view_compliance_reports',      'View Compliance Reports',     'curriculum_content', 'View NQS and framework compliance coverage reports'),
  ('manage_curriculum_templates',  'Manage Curriculum Templates', 'curriculum_content', 'Create and publish reusable curriculum templates')

ON CONFLICT (key) DO NOTHING;


-- ── Step 2: Backfill role_permissions for all existing tenants ──────
--
-- We iterate over every tenant and find their system roles by name,
-- then grant the correct permissions using the same rules as
-- seed_tenant_roles().

DO $$
DECLARE
  r_tenant  RECORD;
  v_owner   UUID;
  v_admin   UUID;
  v_head    UUID;
BEGIN
  FOR r_tenant IN SELECT id FROM tenants LOOP

    -- Owner: all permissions
    SELECT id INTO v_owner FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Owner' AND is_system = true;

    IF v_owner IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_owner, p.id
      FROM permissions p
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Administrator: all except manage_tenant_settings
    SELECT id INTO v_admin FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Administrator' AND is_system = true;

    IF v_admin IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_admin, p.id
      FROM permissions p
      WHERE p.key != 'manage_tenant_settings'
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Head of School: all pedagogy + sis + attendance + comms
    SELECT id INTO v_head FROM roles
    WHERE tenant_id = r_tenant.id AND name = 'Head of School' AND is_system = true;

    IF v_head IS NOT NULL THEN
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT r_tenant.id, v_head, p.id
      FROM permissions p
      WHERE p.module IN ('pedagogy', 'sis', 'attendance', 'comms')
      ON CONFLICT (tenant_id, role_id, permission_id) DO NOTHING;
    END IF;

    -- Lead Guide, Guide, Assistant: their explicit lists haven't changed,
    -- no new permissions are being added to them in this migration.

  END LOOP;
END;
$$;


-- ── Step 3: Also update seed_tenant_roles() so NEW tenants get ──────
--            the Head of School module list right.
--            (Owner and Admin already use SELECT * FROM permissions
--             so they auto-pick up new rows — no change needed.)

-- Nothing to change for Owner/Admin (wildcard selects).
-- Head of School already uses module IN (...) — just ensure
-- any future modules added also update that list there.

-- ── Verification query (run after to confirm) ────────────────────────
-- SELECT module, count(*) FROM permissions GROUP BY module ORDER BY module;
-- SELECT count(*) FROM permissions; -- should be 47
