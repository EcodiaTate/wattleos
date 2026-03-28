'use server';

// ============================================================
// WattleOS V2 - MFA Server Actions
// ============================================================
// Supabase TOTP MFA enrollment, verification, and backup codes.
// Uses Supabase's native auth.mfa API + WattleOS backup codes.
// ============================================================

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTenantContext, requirePermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import type { ActionResponse } from '@/types/api';
import { success, failure, ErrorCodes } from '@/types/api';
import { randomBytes, createHash } from 'crypto';

// ============================================================
// enrollMfa — Start TOTP enrollment, returns QR code URI
// ============================================================
export async function enrollMfa(): Promise<
  ActionResponse<{ factorId: string; qrCode: string; secret: string; uri: string }>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure('Not authenticated', ErrorCodes.UNAUTHORIZED);
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'WattleOS Authenticator',
  });

  if (error || !data) {
    return failure(error?.message ?? 'Failed to start MFA enrollment');
  }

  return success({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  });
}

// ============================================================
// verifyMfaEnrollment — Verify TOTP code to complete enrollment
// ============================================================
export async function verifyMfaEnrollment(
  factorId: string,
  code: string
): Promise<ActionResponse<{ backupCodes: string[] }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure('Not authenticated', ErrorCodes.UNAUTHORIZED);
  }

  // Challenge + verify in sequence
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return failure(challengeError?.message ?? 'Failed to create MFA challenge');
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return failure('Invalid verification code. Please try again.');
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);
  const adminClient = createSupabaseAdminClient();

  // Delete any existing backup codes for this user
  await adminClient.from('mfa_backup_codes').delete().eq('user_id', user.id);

  // Store hashed backup codes
  const rows = backupCodes.map((code) => ({
    user_id: user.id,
    code_hash: hashBackupCode(code),
  }));

  await adminClient.from('mfa_backup_codes').insert(rows);

  return success({ backupCodes });
}

// ============================================================
// verifyMfaLogin — Verify TOTP code during login flow
// ============================================================
export async function verifyMfaLogin(
  factorId: string,
  code: string
): Promise<ActionResponse<{ verified: boolean }>> {
  const supabase = await createSupabaseServerClient();

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return failure(challengeError?.message ?? 'Failed to create MFA challenge');
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return failure('Invalid verification code.');
  }

  return success({ verified: true });
}

// ============================================================
// verifyBackupCode — Use a backup code instead of TOTP
// ============================================================
export async function verifyBackupCode(
  code: string
): Promise<ActionResponse<{ verified: boolean; remainingCodes: number }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure('Not authenticated', ErrorCodes.UNAUTHORIZED);
  }

  const adminClient = createSupabaseAdminClient();
  const codeHash = hashBackupCode(code);

  // Find matching unused backup code
  const { data: matchingCode } = await adminClient
    .from('mfa_backup_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .single();

  if (!matchingCode) {
    return failure('Invalid backup code.');
  }

  // Mark as used
  await adminClient
    .from('mfa_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', matchingCode.id);

  // Count remaining
  const { count } = await adminClient
    .from('mfa_backup_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('used_at', null);

  return success({ verified: true, remainingCodes: count ?? 0 });
}

// ============================================================
// getMfaStatus — Check if user has MFA enrolled + required
// ============================================================
export async function getMfaStatus(): Promise<
  ActionResponse<{
    enrolled: boolean;
    required: boolean;
    factorId: string | null;
    backupCodesRemaining: number;
  }>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure('Not authenticated', ErrorCodes.UNAUTHORIZED);
  }

  // Check if user has verified TOTP factors
  const { data: factors } =
    await supabase.auth.mfa.listFactors();

  const verifiedTotp = factors?.totp?.find(
    (f) => f.status === 'verified'
  );

  // Check if MFA is required for this user's role
  const ctx = await getTenantContext();
  const adminClient = createSupabaseAdminClient();

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('require_mfa_for_roles')
    .eq('id', ctx.tenant.id)
    .single();

  const requiredRoles: string[] = tenant?.require_mfa_for_roles ?? ['Owner', 'Administrator'];
  const required = requiredRoles.includes(ctx.role.name);

  // Count remaining backup codes
  let backupCodesRemaining = 0;
  if (verifiedTotp) {
    const { count } = await adminClient
      .from('mfa_backup_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('used_at', null);
    backupCodesRemaining = count ?? 0;
  }

  return success({
    enrolled: !!verifiedTotp,
    required,
    factorId: verifiedTotp?.id ?? null,
    backupCodesRemaining,
  });
}

// ============================================================
// unenrollMfa — Remove TOTP factor
// ============================================================
export async function unenrollMfa(
  factorId: string
): Promise<ActionResponse<{ success: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure('Not authenticated', ErrorCodes.UNAUTHORIZED);
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return failure(error.message);
  }

  // Clean up backup codes
  const adminClient = createSupabaseAdminClient();
  await adminClient.from('mfa_backup_codes').delete().eq('user_id', user.id);

  return success({ success: true });
}

// ============================================================
// updateMfaPolicy — Admin: configure which roles require MFA
// ============================================================
export async function updateMfaPolicy(
  roles: string[]
): Promise<ActionResponse<{ roles: string[] }>> {
  await requirePermission(Permissions.MANAGE_MFA_POLICY as any);

  const ctx = await getTenantContext();
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from('tenants')
    .update({ require_mfa_for_roles: roles })
    .eq('id', ctx.tenant.id);

  if (error) {
    return failure(error.message);
  }

  return success({ roles });
}

// ============================================================
// Helpers
// ============================================================

function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8-character alphanumeric codes in XXXX-XXXX format
    const raw = randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

function hashBackupCode(code: string): string {
  // Normalize: strip dashes, uppercase
  const normalized = code.replace(/-/g, '').toUpperCase();
  return createHash('sha256').update(normalized).digest('hex');
}
