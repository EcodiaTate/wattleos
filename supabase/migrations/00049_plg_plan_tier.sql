-- ============================================================
-- WattleOS V2 — Migration 00049: PLG Plan Tier Infrastructure
-- ============================================================
-- Adds:
--   plan_tier column on tenants (free | pro | enterprise)
--   plg_feature_usage — tracks which users use which features
--     for Champion Mechanic (multi-user engagement detection)
--   plg_champion_notifications — tracks threshold notifications
--     sent to admins (de-duplication)
-- ============================================================

-- ---- plan_tier on tenants ------------------------------------
-- Existing tenants are grandfathered to 'pro' so nothing breaks.
-- New tenants start on 'free' and upgrade via sales/self-serve.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free'
  CHECK (plan_tier IN ('free', 'pro', 'enterprise'));

-- Backfill all existing tenants to 'pro' (grandfathered)
UPDATE tenants SET plan_tier = 'pro' WHERE plan_tier = 'free';

-- ---- plg_feature_usage ----------------------------------------
-- One row per (tenant, user, feature, day). Daily granularity
-- is sufficient for Champion Mechanic — we care about distinct
-- users, not exact event counts.
CREATE TABLE plg_feature_usage (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL,
  feature      TEXT        NOT NULL,   -- e.g. 'reports', 'observations', 'mastery'
  used_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id, feature, used_date)
);

CREATE INDEX plg_feature_usage_tenant_feature_idx
  ON plg_feature_usage (tenant_id, feature, used_date);

ALTER TABLE plg_feature_usage ENABLE ROW LEVEL SECURITY;

-- System inserts only (server action uses admin client)
CREATE POLICY "plg_feature_usage_admin_only"
  ON plg_feature_usage FOR ALL
  USING (false);

-- ---- plg_champion_notifications --------------------------------
-- Tracks which thresholds have already triggered notifications
-- so we don't spam admins.
CREATE TABLE plg_champion_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature      TEXT        NOT NULL,
  threshold    INTEGER     NOT NULL,   -- e.g. 2, 5 distinct users
  notified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, feature, threshold)
);

CREATE INDEX plg_champion_notifications_tenant_idx
  ON plg_champion_notifications (tenant_id, feature);

ALTER TABLE plg_champion_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plg_champion_notifications_admin_only"
  ON plg_champion_notifications FOR ALL
  USING (false);
