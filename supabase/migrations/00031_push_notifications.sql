-- ============================================================
-- WattleOS V2 — Push Notification Dispatch (Module: Comms)
-- Migration: 00031_push_notifications.sql
-- ============================================================
-- Adds the dispatch, queuing, template, and delivery tracking
-- layer on top of the existing device_push_tokens table
-- (created in 00006_push_tokens_and_broadcast_rpc.sql).
--
-- WHY:
--   Tokens exist but there was no way to:
--     1. Create notification campaigns from the admin UI
--     2. Track per-device delivery receipts
--     3. Define topic-level opt-in preferences per user
--     4. Store notification templates for recurring events
--     5. Schedule delayed / future notifications
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE notification_topic AS ENUM (
  'announcements',
  'messages',
  'observations',
  'attendance',
  'events',
  'incidents',
  'bookings',
  'reports',
  'emergency',
  'billing',
  'rostering',
  'general'
);

CREATE TYPE notification_status AS ENUM (
  'draft',
  'scheduled',
  'sending',
  'sent',
  'cancelled',
  'failed'
);

CREATE TYPE notification_target_type AS ENUM (
  'all_staff',
  'all_parents',
  'all_users',
  'specific_class',
  'specific_program',
  'specific_users'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced'
);

-- ============================================================
-- NOTIFICATION_DISPATCHES
-- ============================================================
-- A notification campaign created and sent by an admin.
-- Stores the content, target audience, and send state.
-- ============================================================

CREATE TABLE notification_dispatches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  topic           notification_topic NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB DEFAULT '{}'::jsonb,           -- deep-link data for tap action
  target_type     notification_target_type NOT NULL,
  target_class_id UUID REFERENCES classes(id),
  target_program_id UUID REFERENCES programs(id),
  target_user_ids UUID[] DEFAULT NULL,                 -- only set when target_type='specific_users'
  status          notification_status NOT NULL DEFAULT 'draft',
  scheduled_for   TIMESTAMPTZ DEFAULT NULL,            -- NULL = send immediately on publish
  sent_at         TIMESTAMPTZ DEFAULT NULL,
  recipient_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_notification_dispatches_tenant ON notification_dispatches(tenant_id, status, created_at DESC);
CREATE INDEX idx_notification_dispatches_scheduled ON notification_dispatches(scheduled_for) WHERE scheduled_for IS NOT NULL AND status = 'scheduled';

-- ============================================================
-- NOTIFICATION_DELIVERY_LOG
-- ============================================================
-- One row per device token per dispatch.
-- Updated by webhook/callback from FCM/APNs.
-- ============================================================

CREATE TABLE notification_delivery_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id     UUID NOT NULL REFERENCES notification_dispatches(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  token           TEXT NOT NULL,                       -- the device token used
  platform        TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  status          delivery_status NOT NULL DEFAULT 'pending',
  provider_message_id TEXT DEFAULT NULL,               -- FCM/APNs message ID for correlation
  error_message   TEXT DEFAULT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NULL,
  delivered_at    TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_delivery_dispatch ON notification_delivery_log(dispatch_id, status);
CREATE INDEX idx_notification_delivery_user ON notification_delivery_log(tenant_id, user_id, created_at DESC);

-- ============================================================
-- Per-user topic opt-in preferences
-- ============================================================
-- Extends the existing notification_preferences table with
-- per-topic rows for fine-grained control.
-- The legacy boolean columns (notify_announcements, etc.) on
-- notification_preferences are the coarse toggle; this table
-- stores per-notification-topic overrides.
-- ============================================================

CREATE TABLE notification_topic_prefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic           notification_topic NOT NULL,
  push_enabled    BOOLEAN NOT NULL DEFAULT true,
  email_enabled   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);

CREATE INDEX idx_notification_topic_prefs_user ON notification_topic_prefs(tenant_id, user_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE notification_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_topic_prefs ENABLE ROW LEVEL SECURITY;

-- Dispatches: admins/staff with permission can read; service role writes
CREATE POLICY "Tenant members can view dispatches"
  ON notification_dispatches FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Service role manages dispatches"
  ON notification_dispatches FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Delivery log: users see their own rows; admins see all via service role
CREATE POLICY "Users see own delivery rows"
  ON notification_delivery_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages delivery log"
  ON notification_delivery_log FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Topic prefs: users manage their own
CREATE POLICY "Users manage own topic prefs"
  ON notification_topic_prefs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PERMISSIONS INSERT
-- ============================================================

INSERT INTO permissions (key, label, description)
VALUES
  ('manage_push_notifications', 'Manage Push Notifications',
   'Create, schedule, and send push notification campaigns'),
  ('view_notification_analytics', 'View Notification Analytics',
   'View delivery receipts and notification performance data')
ON CONFLICT (key) DO NOTHING;

-- Grant to Owner, Admin, Head of School for existing tenants
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tr.id AS role_id
    FROM   tenant_roles tr
    WHERE  tr.name IN ('Owner', 'Admin', 'Head of School')
  LOOP
    INSERT INTO role_permissions (role_id, permission_key)
    VALUES
      (r.role_id, 'manage_push_notifications'),
      (r.role_id, 'view_notification_analytics')
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at_notification_dispatches()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_notification_dispatches_updated_at
  BEFORE UPDATE ON notification_dispatches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_notification_dispatches();

CREATE OR REPLACE FUNCTION set_updated_at_notification_topic_prefs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_notification_topic_prefs_updated_at
  BEFORE UPDATE ON notification_topic_prefs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_notification_topic_prefs();
