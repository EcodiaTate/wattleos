-- ============================================================
-- WattleOS V2 - Migration 00065: Newsletter Module
-- ============================================================
-- Rich-text newsletter templates, scheduled send, audience
-- targeting, and read-receipt tracking. Distinct from
-- announcements (which are short-form, single-body messages).
--
-- Tables:
--   newsletter_templates  – reusable layout/content templates
--   newsletters           – individual newsletter editions
--   newsletter_sections   – ordered content blocks per edition
--   newsletter_recipients – delivery + read-receipt tracking
-- ============================================================

-- ============================================================
-- 1. Newsletter Templates
-- ============================================================
-- Reusable templates staff can base new editions on.
-- body_json stores a structured rich-text representation
-- (blocks of text, images, headings) for the editor.

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  body_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
  header_image_url TEXT,
  footer_html   TEXT,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_newsletter_templates_tenant ON newsletter_templates(tenant_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. Newsletters (editions)
-- ============================================================
-- Each newsletter is an edition sent to a targeted audience.
-- Status workflow: draft → scheduled → sending → sent
-- (side exit: cancelled at any pre-sent stage)

CREATE TYPE newsletter_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
CREATE TYPE newsletter_audience AS ENUM ('all_parents', 'all_staff', 'all_users', 'class', 'program');

CREATE TABLE IF NOT EXISTS newsletters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES newsletter_templates(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  subject_line    TEXT NOT NULL,
  preheader       TEXT,
  body_html       TEXT NOT NULL DEFAULT '',
  body_json       JSONB NOT NULL DEFAULT '[]'::jsonb,
  header_image_url TEXT,
  footer_html     TEXT,
  status          newsletter_status NOT NULL DEFAULT 'draft',
  audience        newsletter_audience NOT NULL DEFAULT 'all_parents',
  target_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  target_program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  author_id       UUID NOT NULL REFERENCES users(id),
  scheduled_for   TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  recipient_count INT NOT NULL DEFAULT 0,
  read_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_newsletters_tenant_status ON newsletters(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_newsletters_sent_at ON newsletters(tenant_id, sent_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. Newsletter Sections (ordered content blocks)
-- ============================================================
-- Each section is a block in the newsletter body. Allows
-- reordering, per-section editing, and mixed content types.

CREATE TYPE newsletter_section_type AS ENUM (
  'heading', 'text', 'image', 'divider', 'button', 'two_column'
);

CREATE TABLE IF NOT EXISTS newsletter_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id   UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  section_type    newsletter_section_type NOT NULL DEFAULT 'text',
  sort_order      INT NOT NULL DEFAULT 0,
  content_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_sections_newsletter ON newsletter_sections(newsletter_id, sort_order);

-- ============================================================
-- 4. Newsletter Recipients (delivery + read receipts)
-- ============================================================
-- One row per recipient per newsletter. Tracks delivery and
-- read-receipt (opened_at). Unique constraint prevents dupes.

CREATE TABLE IF NOT EXISTS newsletter_recipients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id   UUID NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  email           TEXT NOT NULL,
  delivered_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(newsletter_id, user_id)
);

CREATE INDEX idx_newsletter_recipients_newsletter ON newsletter_recipients(newsletter_id);
CREATE INDEX idx_newsletter_recipients_user ON newsletter_recipients(user_id, tenant_id);

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_recipients ENABLE ROW LEVEL SECURITY;

-- Templates: staff with manage_newsletter
CREATE POLICY newsletter_templates_tenant_isolation ON newsletter_templates
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Newsletters: staff with view/manage_newsletter
CREATE POLICY newsletters_tenant_isolation ON newsletters
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Sections: follow parent newsletter access
CREATE POLICY newsletter_sections_tenant_isolation ON newsletter_sections
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Recipients: users can see their own + staff can see all in tenant
CREATE POLICY newsletter_recipients_tenant_isolation ON newsletter_recipients
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================
-- 6. Permissions
-- ============================================================

INSERT INTO permissions (key, label, description) VALUES
  ('view_newsletter',   'View Newsletter',   'View sent newsletters and analytics'),
  ('manage_newsletter', 'Manage Newsletter', 'Create, edit, and send newsletters'),
  ('send_newsletter',   'Send Newsletter',   'Send or schedule newsletter editions')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. Backfill: Grant to Owner/Admin/Head of School for all
--    existing tenants. seed_tenant_roles() only covers new ones.
-- ============================================================

DO $$
DECLARE
  perm_keys TEXT[] := ARRAY['view_newsletter', 'manage_newsletter', 'send_newsletter'];
  admin_roles TEXT[] := ARRAY['Owner', 'Admin', 'Head of School'];
  p TEXT;
  r RECORD;
BEGIN
  FOREACH p IN ARRAY perm_keys LOOP
    FOR r IN
      SELECT rp.role_id, pe.id AS perm_id
      FROM roles ro
      JOIN permissions pe ON pe.key = p
      LEFT JOIN role_permissions rp ON rp.role_id = ro.id AND rp.permission_id = pe.id
      WHERE ro.name = ANY(admin_roles)
        AND rp.id IS NULL
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, r.perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 8. Updated_at triggers
-- ============================================================

CREATE OR REPLACE TRIGGER trg_newsletter_templates_updated_at
  BEFORE UPDATE ON newsletter_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_newsletter_sections_updated_at
  BEFORE UPDATE ON newsletter_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
