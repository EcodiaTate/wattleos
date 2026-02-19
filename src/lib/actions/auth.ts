'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { setUserTenant, getUserTenants } from '@/lib/auth/tenant-context';
import { redirect } from 'next/navigation';
import type { ActionResponse } from '@/types/api';
import { success, failure, ErrorCodes } from '@/types/api';

// ============================================================
// selectTenantAction
// ============================================================
// Called when a user picks a tenant from the tenant picker.
// Validates membership, then updates JWT app_metadata.
// ============================================================
export async function selectTenantAction(
  tenantId: string
): Promise<ActionResponse<{ tenantId: string }>> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure('Not authenticated', ErrorCodes.UNAUTHORIZED);
  }

  // Verify the user actually belongs to this tenant
  const tenants = await getUserTenants(user.id);
  const membership = tenants.find((t) => t.tenant.id === tenantId);

  if (!membership) {
    return failure('You do not have access to this school', ErrorCodes.FORBIDDEN);
  }

  if (!membership.tenant.is_active) {
    return failure(
      'This school account is currently inactive',
      ErrorCodes.TENANT_NOT_FOUND
    );
  }

  // Update the JWT app_metadata with the selected tenant
  await setUserTenant(user.id, tenantId);

  // Important: ensure the new app_metadata is reflected in the current session cookie.
  // (If your middleware already forces refresh, this is still harmless.)
  try {
    await supabase.auth.refreshSession();
  } catch {
    // If refresh fails (rare), the next request/middleware refresh will still pick up changes.
  }

  return success({ tenantId });
}

// ============================================================
// signOutAction
// ============================================================
// Signs the user out and redirects to login.
// ============================================================
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ============================================================
// switchTenantAction
// ============================================================
// Called when a user wants to switch to a different tenant.
// Clears the current tenant from JWT and redirects to picker.
// ============================================================
export async function switchTenantAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Clear tenant_id from app_metadata to force tenant picker
  // (If your setUserTenant expects null instead of '', adjust it there.)
  await setUserTenant(user.id, '');

  try {
    await supabase.auth.refreshSession();
  } catch {
    // ok
  }

  redirect('/tenant-picker');
}
