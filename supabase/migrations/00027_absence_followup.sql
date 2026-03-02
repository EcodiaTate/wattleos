-- supabase/migrations/00027_absence_followup.sql
--
-- ============================================================
-- Unexplained Absence Follow-up
-- ============================================================
-- Schools must contact families when a student is absent
-- without explanation. This module tracks:
--
--   absence_followup_config        — per-tenant cutoff + settings
--   absence_followup_alerts        — one alert per student per day
--   absence_followup_notifications — log of notification attempts
--
-- Alerts are generated on demand (staff trigger "Generate Alerts")
-- after roll call. Each alert is for a student marked absent/late
-- who has not yet had their absence explained by cutoff time.
--
-- Push notifications are sent immediately via device tokens.
-- The notification log is structured to also support SMS/email
-- once those gateways are configured.
-- ============================================================

-- ============================================================
-- 1. absence_followup_config
-- ============================================================
-- One row per tenant. Created on first access via upsert.
-- cutoff_time: if roll call is marked absent before this time
-- and not explained by this time, an alert is raised.
-- ============================================================

CREATE TABLE IF NOT EXISTS absence_followup_config (
  tenant_id                      UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,

  -- Time of day (local school time) after which an unexplained
  -- absence triggers a follow-up alert. Default: 09:30.
  cutoff_time                    TIME NOT NULL DEFAULT '09:30:00',

  -- Whether to automatically send push notifications to guardians
  -- when an alert is generated (vs. staff triggering manually).
  auto_notify_guardians          BOOLEAN NOT NULL DEFAULT false,

  -- Template for guardian notifications.
  -- Placeholders: {guardian_name}, {student_name}, {date}, {school_name}
  notification_message_template  TEXT NOT NULL DEFAULT
    'Hi {guardian_name}, {student_name} has been marked absent today ({date}). '
    'Please contact the school to provide an explanation.',

  -- Minutes after cutoff before a pending alert is escalated
  -- to the head of school / principal. Default: 120 min (2 hrs).
  escalation_minutes             SMALLINT NOT NULL DEFAULT 120
    CHECK (escalation_minutes BETWEEN 30 AND 480),

  -- Master switch. Disabled = no alerts generated, no notifications sent.
  enabled                        BOOLEAN NOT NULL DEFAULT true,

  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. absence_followup_alerts
-- ============================================================
-- One per student per calendar day when they are absent and
-- the absence has not been explained by roll call. The UNIQUE
-- constraint prevents duplicate alerts for the same student/day.
-- ============================================================

CREATE TABLE IF NOT EXISTS absence_followup_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- The calendar date of the unexplained absence
  alert_date            DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Link to the attendance record that triggered this alert
  attendance_record_id  UUID REFERENCES attendance_records(id) ON DELETE SET NULL,

  -- Workflow status
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'explained', 'escalated', 'dismissed')),

  -- Explanation details (set when status → 'explained')
  explanation           TEXT,
  explained_at          TIMESTAMPTZ,
  explained_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  explanation_source    TEXT CHECK (explanation_source IN (
    'guardian_call', 'guardian_app', 'staff_entry', 'auto'
  )),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one alert per student per day
  CONSTRAINT absence_followup_alerts_unique UNIQUE (tenant_id, student_id, alert_date)
);

-- Indexes for common queries
CREATE INDEX absence_followup_alerts_tenant_date
  ON absence_followup_alerts (tenant_id, alert_date DESC, status);

CREATE INDEX absence_followup_alerts_student
  ON absence_followup_alerts (student_id, alert_date DESC);

CREATE INDEX absence_followup_alerts_status
  ON absence_followup_alerts (tenant_id, status)
  WHERE status IN ('pending', 'notified', 'escalated');

-- ============================================================
-- 3. absence_followup_notifications
-- ============================================================
-- Log of every notification attempt to a guardian.
-- Supports push now; structured for SMS/email later.
-- Multiple notifications can be sent per alert (e.g. retry,
-- or notifying multiple guardians).
-- ============================================================

CREATE TABLE IF NOT EXISTS absence_followup_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  alert_id      UUID NOT NULL REFERENCES absence_followup_alerts(id) ON DELETE CASCADE,
  guardian_id   UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,

  -- Channel used for this notification attempt
  channel       TEXT NOT NULL CHECK (channel IN ('push', 'sms', 'email')),

  -- Delivery status
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),

  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  error_message TEXT,

  -- Staff who triggered this (NULL = automated)
  sent_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX absence_followup_notifications_alert
  ON absence_followup_notifications (alert_id, created_at DESC);

CREATE INDEX absence_followup_notifications_tenant
  ON absence_followup_notifications (tenant_id, created_at DESC);

-- ============================================================
-- 4. Permissions
-- ============================================================

INSERT INTO permissions (key, description) VALUES
  ('view_absence_followup',   'View unexplained absence alerts and notification history'),
  ('manage_absence_followup', 'Generate alerts, send notifications, record explanations, configure settings')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner, Admin, Head of School; Guides get view-only
DO $$
DECLARE
  t RECORD;
  role_id UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    -- Owner
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Owner' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_absence_followup'), (role_id, 'manage_absence_followup')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Admin
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Admin' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_absence_followup'), (role_id, 'manage_absence_followup')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Head of School
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Head of School' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_absence_followup'), (role_id, 'manage_absence_followup')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Guide (view only)
    SELECT id INTO role_id FROM roles WHERE tenant_id = t.id AND name = 'Guide' LIMIT 1;
    IF role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_key)
      VALUES (role_id, 'view_absence_followup')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE absence_followup_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_followup_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_followup_notifications ENABLE ROW LEVEL SECURITY;

-- Config: view permission to read, manage permission to write
CREATE POLICY "absence_followup_config_select"
  ON absence_followup_config FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_absence_followup')
  );

CREATE POLICY "absence_followup_config_upsert"
  ON absence_followup_config FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_absence_followup')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_absence_followup')
  );

-- Alerts: view permission to read, manage to write
CREATE POLICY "absence_followup_alerts_select"
  ON absence_followup_alerts FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_absence_followup')
  );

CREATE POLICY "absence_followup_alerts_insert"
  ON absence_followup_alerts FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_absence_followup')
  );

CREATE POLICY "absence_followup_alerts_update"
  ON absence_followup_alerts FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_absence_followup')
  );

-- Notifications: same pattern
CREATE POLICY "absence_followup_notifications_select"
  ON absence_followup_notifications FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'view_absence_followup')
  );

CREATE POLICY "absence_followup_notifications_insert"
  ON absence_followup_notifications FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_absence_followup')
  );

CREATE POLICY "absence_followup_notifications_update"
  ON absence_followup_notifications FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    AND has_permission(auth.uid(), tenant_id, 'manage_absence_followup')
  );

-- ============================================================
-- 6. updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION update_absence_followup_config_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER absence_followup_config_updated_at
  BEFORE UPDATE ON absence_followup_config
  FOR EACH ROW EXECUTE FUNCTION update_absence_followup_config_updated_at();

CREATE OR REPLACE FUNCTION update_absence_followup_alerts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER absence_followup_alerts_updated_at
  BEFORE UPDATE ON absence_followup_alerts
  FOR EACH ROW EXECUTE FUNCTION update_absence_followup_alerts_updated_at();
