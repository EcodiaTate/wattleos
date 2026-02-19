-- ============================================================
-- WattleOS V2 — Module 1: Foundation Migration
-- ============================================================
-- Creates: Extensions, utility functions, tenants, users,
--          permissions, roles, role_permissions, tenant_users,
--          audit_logs. All with RLS, indexes, and triggers.
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Get current tenant_id from Supabase JWT (app_metadata is tamper-proof)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
$$;

-- Check if current user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(required_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_users tu
    JOIN role_permissions rp ON rp.role_id = tu.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = current_tenant_id()
      AND tu.deleted_at IS NULL
      AND p.key = required_permission
  );
$$;

-- Check if current user is a guardian of a given student
CREATE OR REPLACE FUNCTION is_guardian_of(target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM guardians g
    WHERE g.student_id = target_student_id
      AND g.user_id = auth.uid()
      AND g.tenant_id = current_tenant_id()
      AND g.deleted_at IS NULL
  );
$$;

-- Auto-update updated_at on row mutation
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Macro to apply updated_at trigger to any table
CREATE OR REPLACE FUNCTION apply_updated_at_trigger(target_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER trg_%I_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
    target_table, target_table
  );
END;
$$;

-- ============================================================
-- TABLE: tenants
-- ============================================================
-- Root table. NOT tenant-scoped. Every school is a tenant.
-- ============================================================
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  domain      TEXT,
  logo_url    TEXT,
  timezone    TEXT NOT NULL DEFAULT 'Australia/Sydney',
  country     TEXT NOT NULL DEFAULT 'AU',
  currency    TEXT NOT NULL DEFAULT 'AUD',
  settings    JSONB NOT NULL DEFAULT '{}',
  plan_tier   TEXT NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro', 'enterprise')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_domain ON tenants (domain) WHERE domain IS NOT NULL;

SELECT apply_updated_at_trigger('tenants');

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own tenant" ON tenants
  FOR SELECT
  USING (id = current_tenant_id());

-- ============================================================
-- TABLE: users
-- ============================================================
-- Global user identity. One row per human. Links to Supabase Auth.
-- NOT tenant-scoped.
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT apply_updated_at_trigger('users');

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can read profiles in same tenant" ON users
  FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM tenant_users
      WHERE tenant_id = current_tenant_id()
        AND deleted_at IS NULL
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- TABLE: permissions
-- ============================================================
-- System-defined permission keys. Global, NOT tenant-scoped.
-- Managed by WattleOS, not by schools.
-- ============================================================
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  module      TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_permissions_module ON permissions (module);
CREATE INDEX idx_permissions_key ON permissions (key);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- TABLE: roles
-- ============================================================
-- Tenant-scoped roles. Schools can create custom roles.
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON roles (tenant_id) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('roles');

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON roles
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- TABLE: role_permissions
-- ============================================================
-- Maps roles to permissions. Tenant-scoped.
-- ============================================================
CREATE TABLE role_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions (tenant_id, role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions (tenant_id, permission_id);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON role_permissions
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================================
-- TABLE: tenant_users
-- ============================================================
-- Junction between users and tenants. Defines role per school.
-- A user can appear in multiple tenants.
-- ============================================================
CREATE TABLE tenant_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  role_id     UUID NOT NULL REFERENCES roles(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,

  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_users_user ON tenant_users (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_users_role ON tenant_users (tenant_id, role_id) WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('tenant_users');

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON tenant_users
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY "Admins can manage tenant users" ON tenant_users
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_users')
  );

CREATE POLICY "Users can read own memberships" ON tenant_users
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
-- Immutable append-only log for security-sensitive actions.
-- No updated_at, no deleted_at.
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs (tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (tenant_id, user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND has_permission('view_audit_logs')
  );

-- ============================================================
-- FUNCTION: handle_new_user
-- ============================================================
-- Triggered by Supabase Auth on new user signup.
-- Creates a row in our public.users table from auth.users.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'given_name',
    NEW.raw_user_meta_data ->> 'family_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: seed_tenant_roles
-- ============================================================
-- When a new tenant is created, auto-seed default system roles
-- and assign permissions. Called via trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION seed_tenant_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_role_id UUID;
  v_admin_role_id UUID;
  v_head_role_id UUID;
  v_lead_guide_role_id UUID;
  v_guide_role_id UUID;
  v_assistant_role_id UUID;
  v_parent_role_id UUID;
  v_perm RECORD;
BEGIN
  -- Create system roles
  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Owner', 'Full access to all features and settings', true)
    RETURNING id INTO v_owner_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Administrator', 'Administrative access except tenant settings', true)
    RETURNING id INTO v_admin_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Head of School', 'Pedagogical and operational leadership', true)
    RETURNING id INTO v_head_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Lead Guide', 'Lead classroom guide with curriculum management', true)
    RETURNING id INTO v_lead_guide_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Guide', 'Classroom guide with observation and attendance', true)
    RETURNING id INTO v_guide_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Assistant', 'Assistant guide with limited access', true)
    RETURNING id INTO v_assistant_role_id;

  INSERT INTO roles (tenant_id, name, description, is_system) VALUES
    (NEW.id, 'Parent', 'Parent/guardian access to child portfolio', true)
    RETURNING id INTO v_parent_role_id;

  -- Owner gets ALL permissions
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_owner_role_id, p.id
  FROM permissions p;

  -- Administrator gets all except manage_tenant_settings
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_admin_role_id, p.id
  FROM permissions p
  WHERE p.key != 'manage_tenant_settings';

  -- Head of School: all pedagogy + SIS + attendance + comms
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_head_role_id, p.id
  FROM permissions p
  WHERE p.module IN ('pedagogy', 'sis', 'attendance', 'comms');

  -- Lead Guide
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_lead_guide_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'publish_observation', 'view_all_observations',
    'manage_curriculum', 'manage_mastery', 'manage_reports',
    'view_students', 'view_medical_records',
    'manage_attendance', 'send_class_messages'
  );

  -- Guide
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_guide_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'publish_observation',
    'view_students', 'view_medical_records',
    'manage_attendance', 'manage_mastery', 'send_class_messages'
  );

  -- Assistant
  INSERT INTO role_permissions (tenant_id, role_id, permission_id)
  SELECT NEW.id, v_assistant_role_id, p.id
  FROM permissions p
  WHERE p.key IN (
    'create_observation', 'view_students', 'manage_attendance'
  );

  -- Parent gets no explicit permissions (uses is_guardian_of() in RLS)

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tenant_created
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION seed_tenant_roles();
