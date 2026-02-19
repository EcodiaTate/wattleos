// src/lib/auth/tenant-context.ts

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import type { TenantContext, Tenant, User, Role } from '@/types/domain';
import type { PermissionKey } from '@/lib/constants/permissions';

// Helper type for the role_permissions select shape
type RolePermissionRow = {
  permission: { key: string } | { key: string }[] | null;
};

// ============================================================
// getTenantContext
// ============================================================
// Cached per-request. Returns the full tenant context including
// the resolved tenant, user, role, and permission keys.
// Redirects to /login if unauthenticated.
// Redirects to /tenant-picker if no tenant in JWT.
// ============================================================
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const supabase = await createSupabaseServerClient();

  // 1. Get authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login');
  }

  // 2. Extract tenant_id from JWT app_metadata
  const tenantId = authUser.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    redirect('/tenant-picker');
  }

  // 3. Fetch tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    redirect('/tenant-picker');
  }

  // 4. Fetch user profile
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (userError || !user) {
    redirect('/login');
  }

  // 5. Fetch tenant membership with role
  const { data: membership, error: membershipError } = await supabase
    .from('tenant_users')
    .select(
      `
      *,
      role:roles(*)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('user_id', authUser.id)
    .is('deleted_at', null)
    .single();

  if (membershipError || !membership || !membership.role) {
    redirect('/tenant-picker');
  }

  // 6. Fetch permission keys for this role
  const { data: rolePermissions, error: permsError } = await supabase
    .from('role_permissions')
    .select(
      `
      permission:permissions(key)
    `
    )
    .eq('tenant_id', tenantId)
    .eq('role_id', membership.role_id);

  if (permsError) {
    // Safer to treat as no permissions than crash context resolution.
    // You can swap this to redirect('/login') if you prefer hard-fail.
    console.error('Failed to load role permissions:', permsError.message);
  }

  const permissions = ((rolePermissions ?? []) as unknown as RolePermissionRow[])
    .map((rp) => {
      const perm = rp.permission;
      if (!perm) return null;

      // Supabase sometimes returns a 1-item array for nested selects
      if (Array.isArray(perm)) return perm[0]?.key ?? null;

      return perm.key ?? null;
    })
    .filter((key): key is string => !!key);

  return {
    tenant: tenant as Tenant,
    user: user as User,
    role: membership.role as Role,
    permissions,
  };
});

// ============================================================
// requirePermission
// ============================================================
// Guard for Server Actions. Throws if the user lacks the
// required permission. Returns the context if authorized.
// ============================================================
export async function requirePermission(permission: PermissionKey): Promise<TenantContext> {
  const context = await getTenantContext();

  if (!context.permissions.includes(permission)) {
    throw new Error(`Forbidden: missing permission '${permission}'`);
  }

  return context;
}

// ============================================================
// hasPermission (server component-safe check)
// ============================================================
export function hasPermission(context: TenantContext, permission: PermissionKey): boolean {
  return context.permissions.includes(permission);
}

// ============================================================
// resolveTenantBySlug
// ============================================================
// Used by middleware to look up a tenant from the URL slug.
// Uses admin client (service role) because this runs before
// the user has a JWT with tenant_id.
// ============================================================
export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  const adminClient = createSupabaseAdminClient();

  const { data, error } = await adminClient
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  return data as Tenant;
}

// ============================================================
// getUserTenants
// ============================================================
export async function getUserTenants(
  userId: string
): Promise<
  Array<{
    tenant: Tenant;
    role: Role;
    status: string;
  }>
> {
  const adminClient = createSupabaseAdminClient();

  const { data, error } = await adminClient
    .from('tenant_users')
    .select(
      `
      status,
      tenant:tenants(*),
      role:roles(*)
    `
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error || !data) return [];

  return data
    .filter((row) => row.tenant && row.role)
    .map((row) => ({
      tenant: row.tenant as unknown as Tenant,
      role: row.role as unknown as Role,
      status: row.status as string,
    }));
}

// ============================================================
// setUserTenant
// ============================================================
export async function setUserTenant(userId: string, tenantId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId },
  });
}
