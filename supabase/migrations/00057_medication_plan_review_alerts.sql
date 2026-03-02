-- 00057_medication_plan_review_alerts.sql
--
-- Tracks which medical management plan annual review alerts have
-- been sent. Prevents duplicate alerts from the daily cron job
-- (similar to ratio_breach_alert_log).
--
-- RLS: staff-only, tenant-scoped.
-- Soft-delete: yes (deleted_at).

CREATE TABLE medication_plan_review_alerts (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id),
  medication_plan_id   UUID        NOT NULL REFERENCES medical_management_plans(id),
  review_due_date      DATE        NOT NULL,
  alert_sent_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- [{ user_id: string | null, method: 'announcement' }]
  alert_recipients     JSONB       NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

-- Lookup: was an alert already sent for this plan in this window?
CREATE INDEX idx_mpr_alerts_plan_sent
  ON medication_plan_review_alerts (tenant_id, medication_plan_id, alert_sent_at DESC)
  WHERE deleted_at IS NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE medication_plan_review_alerts ENABLE ROW LEVEL SECURITY;

-- School staff can read alerts for their tenant
CREATE POLICY "staff_select_mpr_alerts"
  ON medication_plan_review_alerts
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND deleted_at IS NULL
  );

-- Service role only for insert/update (cron runs as service role)
CREATE POLICY "service_role_insert_mpr_alerts"
  ON medication_plan_review_alerts
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());
