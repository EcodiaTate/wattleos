-- ============================================================
-- 00067_fee_notice_deliveries_rls.sql
-- Enable RLS on fee_notice_deliveries and add tenant-scoped
-- policies via join to fee_notices.tenant_id.
-- ============================================================

ALTER TABLE fee_notice_deliveries ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- Tenant-scoped policies (join through fee_notices)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "fee_notice_deliveries_select"
  ON fee_notice_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fee_notices fn
      WHERE fn.id = fee_notice_deliveries.fee_notice_id
        AND fn.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "fee_notice_deliveries_insert"
  ON fee_notice_deliveries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fee_notices fn
      WHERE fn.id = fee_notice_deliveries.fee_notice_id
        AND fn.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "fee_notice_deliveries_update"
  ON fee_notice_deliveries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fee_notices fn
      WHERE fn.id = fee_notice_deliveries.fee_notice_id
        AND fn.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "fee_notice_deliveries_delete"
  ON fee_notice_deliveries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fee_notices fn
      WHERE fn.id = fee_notice_deliveries.fee_notice_id
        AND fn.tenant_id = current_tenant_id()
    )
  );

-- ────────────────────────────────────────────────────────────
-- Service-role bypass for cron / admin operations
-- ────────────────────────────────────────────────────────────

CREATE POLICY "fee_notice_deliveries_service_role"
  ON fee_notice_deliveries
  FOR ALL
  TO service_role
  USING (true);
