'use server';

// ============================================================
// WattleOS V2 - Session Revocation Server Actions
// ============================================================
// Server-side session invalidation. Updates signed_out_at so
// the middleware can reject JWTs issued before logout.
// ============================================================

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import type { ActionResponse } from '@/types/api';
import { success, failure, ErrorCodes } from '@/types/api';

// ============================================================
// revokeSession — Called during normal signout
// ============================================================
// Sets signed_out_at on the tenant_users row so the middleware
// can reject any JWT issued before this timestamp.
// ============================================================
export async function revokeSession(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) return;

  const adminClient = createSupabaseAdminClient();

  // Set signed_out_at for this tenant membership
  await adminClient
    .from('tenant_users')
    .update({ signed_out_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId);

  // Also revoke refresh tokens via Supabase Admin API
  await adminClient.auth.admin.signOut(user.id, 'global');
}

// ============================================================
// forceLogoutUser — Admin: force a target user to re-authenticate
// ============================================================
export async function forceLogoutUser(
  targetUserId: string,
  reason?: string
): Promise<ActionResponse<{ revoked: boolean }>> {
  const ctx = await requirePermission('manage_users' as any);

  const adminClient = createSupabaseAdminClient();

  // Set signed_out_at on their tenant membership
  const { error: updateError } = await adminClient
    .from('tenant_users')
    .update({ signed_out_at: new Date().toISOString() })
    .eq('user_id', targetUserId)
    .eq('tenant_id', ctx.tenant.id);

  if (updateError) {
    return failure(updateError.message);
  }

  // Record the forced logout
  await adminClient.from('session_revocations').insert({
    tenant_id: ctx.tenant.id,
    target_user_id: targetUserId,
    revoked_by: ctx.user.id,
    reason: reason ?? 'Admin-initiated force logout',
  });

  // Revoke their Supabase refresh tokens
  await adminClient.auth.admin.signOut(targetUserId, 'global');

  return success({ revoked: true });
}

// ============================================================
// checkSessionRevocation — Used by middleware to validate JWT
// ============================================================
// Returns true if the session has been revoked (JWT should be
// rejected). Checks if signed_out_at > JWT issued_at.
// ============================================================
export async function isSessionRevoked(
  userId: string,
  tenantId: string,
  jwtIssuedAt: number
): Promise<boolean> {
  const adminClient = createSupabaseAdminClient();

  const { data } = await adminClient
    .from('tenant_users')
    .select('signed_out_at')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (!data?.signed_out_at) return false;

  const signedOutAt = new Date(data.signed_out_at).getTime() / 1000;
  return signedOutAt > jwtIssuedAt;
}
