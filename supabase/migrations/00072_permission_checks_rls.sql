-- ============================================================
-- Migration 00072: Add permission checks to newsletter, fee
-- notice, report builder, and sensitive period tables
-- ============================================================
-- Several tables have tenant scoping but no permission checks
-- in RLS. Any staff member in the tenant can read/write all
-- data. This adds has_permission() gates.
-- ============================================================

-- ── Seed new permissions (idempotent) ───────────────────────
INSERT INTO permissions (key, label, module, description) VALUES
  ('view_newsletter', 'View Newsletters', 'newsletter', 'View published newsletters and templates'),
  ('manage_newsletter', 'Manage Newsletters', 'newsletter', 'Create, edit, send, and delete newsletters'),
  ('send_newsletter', 'Send Newsletter', 'newsletter', 'Send newsletters to recipients'),
  ('view_billing', 'View Billing', 'billing', 'View invoices, fee notices, and billing records'),
  ('manage_billing', 'Manage Billing', 'billing', 'Create and manage invoices, fee notices, and billing'),
  ('view_reports', 'View Reports', 'reports', 'View report builder data and student reports'),
  ('manage_curriculum', 'Manage Curriculum', 'curriculum', 'Manage curriculum content and sensitive period materials')
ON CONFLICT (key) DO NOTHING;

-- ── Grant new permissions to Owner, Administrator, Head of School ──
DO $$
DECLARE
  r RECORD;
  perm_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT rp.role_id, roles.name AS role_name
    FROM roles
    JOIN role_permissions rp ON rp.role_id = roles.id
    WHERE roles.name IN ('Owner', 'Administrator', 'Head of School')
    GROUP BY rp.role_id, roles.name
  LOOP
    FOR perm_id IN
      SELECT id FROM permissions
      WHERE key IN (
        'view_newsletter', 'manage_newsletter', 'send_newsletter',
        'view_billing', 'manage_billing',
        'view_reports', 'manage_curriculum'
      )
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, tenant_id)
      SELECT r.role_id, perm_id, tu.tenant_id
      FROM tenant_users tu
      WHERE tu.role_id = r.role_id
      GROUP BY tu.tenant_id
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Also grant view_newsletter to Lead Guide and Guide roles
DO $$
DECLARE
  r RECORD;
  perm_id UUID;
BEGIN
  SELECT id INTO perm_id FROM permissions WHERE key = 'view_newsletter';
  IF perm_id IS NOT NULL THEN
    FOR r IN
      SELECT DISTINCT rp.role_id
      FROM roles
      JOIN role_permissions rp ON rp.role_id = roles.id
      WHERE roles.name IN ('Lead Guide', 'Guide')
      GROUP BY rp.role_id
    LOOP
      INSERT INTO role_permissions (role_id, permission_id, tenant_id)
      SELECT r.role_id, perm_id, tu.tenant_id
      FROM tenant_users tu
      WHERE tu.role_id = r.role_id
      GROUP BY tu.tenant_id
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ── newsletter_templates (00065) ────────────────────────────
DROP POLICY IF EXISTS newsletter_templates_tenant_isolation ON newsletter_templates;
CREATE POLICY newsletter_templates_select ON newsletter_templates
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_newsletter')
  );
CREATE POLICY newsletter_templates_insert ON newsletter_templates
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );
CREATE POLICY newsletter_templates_update ON newsletter_templates
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );
CREATE POLICY newsletter_templates_delete ON newsletter_templates
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );

-- ── newsletters (00065) ────────────────────────────────────
DROP POLICY IF EXISTS newsletters_tenant_isolation ON newsletters;
CREATE POLICY newsletters_select ON newsletters
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_newsletter')
  );
CREATE POLICY newsletters_insert ON newsletters
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );
CREATE POLICY newsletters_update ON newsletters
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );
CREATE POLICY newsletters_delete ON newsletters
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );

-- ── newsletter_sections (00065) ─────────────────────────────
DROP POLICY IF EXISTS newsletter_sections_tenant_isolation ON newsletter_sections;
CREATE POLICY newsletter_sections_select ON newsletter_sections
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_newsletter')
  );
CREATE POLICY newsletter_sections_insert ON newsletter_sections
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );
CREATE POLICY newsletter_sections_update ON newsletter_sections
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );
CREATE POLICY newsletter_sections_delete ON newsletter_sections
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );

-- ── newsletter_recipients (00065) ───────────────────────────
-- Parents need to read their own newsletter deliveries
DROP POLICY IF EXISTS newsletter_recipients_tenant_isolation ON newsletter_recipients;
CREATE POLICY newsletter_recipients_select ON newsletter_recipients
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission('view_newsletter')
      OR user_id = auth.uid()
    )
  );
CREATE POLICY newsletter_recipients_insert ON newsletter_recipients
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('send_newsletter')
  );
CREATE POLICY newsletter_recipients_update ON newsletter_recipients
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      has_permission('manage_newsletter')
      OR user_id = auth.uid()
    )
  ) WITH CHECK (
    tenant_id = current_tenant_id()
  );
CREATE POLICY newsletter_recipients_delete ON newsletter_recipients
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_newsletter')
  );

-- ── fee_notice_configs (00045) ──────────────────────────────
DROP POLICY IF EXISTS "fee_notice_configs_tenant_isolation" ON fee_notice_configs;
CREATE POLICY fee_notice_configs_select ON fee_notice_configs
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_billing')
  );
CREATE POLICY fee_notice_configs_insert ON fee_notice_configs
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  );
CREATE POLICY fee_notice_configs_update ON fee_notice_configs
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  );
CREATE POLICY fee_notice_configs_delete ON fee_notice_configs
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  );

-- ── fee_notices (00045) ─────────────────────────────────────
DROP POLICY IF EXISTS "fee_notices_tenant_isolation" ON fee_notices;
CREATE POLICY fee_notices_select ON fee_notices
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_billing')
  );
CREATE POLICY fee_notices_insert ON fee_notices
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  );
CREATE POLICY fee_notices_update ON fee_notices
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  );
CREATE POLICY fee_notices_delete ON fee_notices
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_billing')
  );

-- ── report_builder_students (00051) ─────────────────────────
DROP POLICY IF EXISTS "rb_students_tenant_isolation" ON report_builder_students;
CREATE POLICY report_builder_students_select ON report_builder_students
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_reports')
  );
CREATE POLICY report_builder_students_insert ON report_builder_students
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_reports')
  );
CREATE POLICY report_builder_students_update ON report_builder_students
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_reports')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_reports')
  );
CREATE POLICY report_builder_students_delete ON report_builder_students
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_reports')
  );

-- ── sensitive_period_materials (00055) ──────────────────────
DROP POLICY IF EXISTS "Tenant isolation" ON sensitive_period_materials;
CREATE POLICY sensitive_period_materials_select ON sensitive_period_materials
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_curriculum')
  );
CREATE POLICY sensitive_period_materials_insert ON sensitive_period_materials
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_curriculum')
  );
CREATE POLICY sensitive_period_materials_update ON sensitive_period_materials
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_curriculum')
  ) WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission('manage_curriculum')
  );
CREATE POLICY sensitive_period_materials_delete ON sensitive_period_materials
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_curriculum')
  );
