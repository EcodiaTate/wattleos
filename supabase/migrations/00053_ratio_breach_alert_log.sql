-- ============================================================
-- Migration 00053: Ratio Breach Alert Log
-- ============================================================
-- Tracks when automated breach alerts have been dispatched so
-- the cron job can apply rate-limiting (don't spam every 5 min)
-- and record escalation history for audit/compliance purposes.
--
-- This is separate from ratio_logs (append-only compliance
-- evidence) — this table records the alert *notifications*
-- sent, not the breach measurements.
-- ============================================================

CREATE TABLE IF NOT EXISTS ratio_breach_alert_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id            UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  -- Snapshot of breach at alert time
  children_present    INTEGER     NOT NULL,
  educators_on_floor  INTEGER     NOT NULL,
  required_educators  INTEGER     NOT NULL,
  required_ratio      TEXT        NOT NULL, -- e.g. "1:4"
  -- Alert delivery
  alerted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- JSONB array of { role: string, method: 'announcement'|'sms' }
  alert_recipients    JSONB       NOT NULL DEFAULT '[]',
  -- Escalation tier: 'initial' or 'escalated' (>15 min)
  alert_tier          TEXT        NOT NULL DEFAULT 'initial'
                                  CHECK (alert_tier IN ('initial', 'escalated')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for rate-limiting: "has this class been alerted in the last N minutes?"
CREATE INDEX idx_ratio_breach_alert_log_class_time
  ON ratio_breach_alert_log (tenant_id, class_id, alerted_at DESC);

ALTER TABLE ratio_breach_alert_log ENABLE ROW LEVEL SECURITY;

-- Admins and compliance roles can view alert history
CREATE POLICY "ratio_breach_alert_log_tenant_select"
  ON ratio_breach_alert_log FOR SELECT
  USING (
    has_permission(auth.uid(), tenant_id, 'view_ratios')
    OR has_permission(auth.uid(), tenant_id, 'manage_floor_signin')
  );

-- Inserts are done by the cron (service role) — no user INSERT policy needed
