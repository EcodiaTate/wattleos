// src/lib/actions/parent/settings.ts
//
// ============================================================
// WattleOS V2 — Parent Portal: Settings Actions
// ============================================================
// Parents can update their consent preferences and contact
// information without staff intervention.
//
// WHY self-service: Consent toggles (media, directory) change
// frequently — parents should be able to update at any time.
// Contact info updates reduce admin workload.
// ============================================================

'use server';

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import type { ActionResponse } from '@/types/api';

// ============================================================
// Types
// ============================================================

export interface ParentGuardianSettings {
  guardianId: string;
  studentId: string;
  studentName: string;
  studentPhotoUrl: string | null;
  relationship: string;
  isPrimary: boolean;
  phone: string | null;
  mediaConsent: boolean;
  directoryConsent: boolean;
  pickupAuthorized: boolean;
}

export interface UpdateConsentInput {
  guardianId: string;
  mediaConsent?: boolean;
  directoryConsent?: boolean;
}

export interface UpdateContactInfoInput {
  guardianId: string;
  phone?: string | null;
}

// ============================================================
// getMySettings — all guardian records with consent/contact info
// ============================================================

export async function getMySettings(): Promise<ActionResponse<ParentGuardianSettings[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('guardians')
      .select(
        `
        id,
        student_id,
        relationship,
        is_primary,
        phone,
        media_consent,
        directory_consent,
        pickup_authorized,
        student:students!inner(
          first_name,
          last_name,
          preferred_name,
          photo_url
        )
      `
      )
      .eq('tenant_id', context.tenant.id)
      .eq('user_id', context.user.id)
      .is('deleted_at', null);

    if (error) {
      return { data: null, error: { message: error.message, code: 'QUERY_ERROR' } };
    }

    const settings: ParentGuardianSettings[] = (data ?? []).map((g) => {
      const student = g.student as unknown as {
        first_name: string;
        last_name: string;
        preferred_name: string | null;
        photo_url: string | null;
      };
      return {
        guardianId: g.id,
        studentId: g.student_id,
        studentName: `${student.preferred_name ?? student.first_name} ${student.last_name}`,
        studentPhotoUrl: student.photo_url,
        relationship: g.relationship,
        isPrimary: g.is_primary,
        phone: g.phone,
        mediaConsent: g.media_consent,
        directoryConsent: g.directory_consent,
        pickupAuthorized: g.pickup_authorized,
      };
    });

    return { data: settings, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' },
    };
  }
}

// ============================================================
// updateConsent — toggle media/directory consent per child
// ============================================================

export async function updateConsent(
  input: UpdateConsentInput
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const context = await getTenantContext();
    const admin = createSupabaseAdminClient();

    // Verify this guardian record belongs to the current user
    const { data: guardian } = await admin
      .from('guardians')
      .select('id, user_id')
      .eq('id', input.guardianId)
      .eq('tenant_id', context.tenant.id)
      .eq('user_id', context.user.id)
      .is('deleted_at', null)
      .single();

    if (!guardian) {
      return { data: null, error: { message: 'Guardian record not found', code: 'NOT_FOUND' } };
    }

    // Build update object
    const updates: Record<string, boolean> = {};
    if (input.mediaConsent !== undefined) {
      updates.media_consent = input.mediaConsent;
    }
    if (input.directoryConsent !== undefined) {
      updates.directory_consent = input.directoryConsent;
    }

    if (Object.keys(updates).length === 0) {
      return { data: { success: true }, error: null };
    }

    const { error } = await admin
      .from('guardians')
      .update(updates)
      .eq('id', input.guardianId)
      .eq('tenant_id', context.tenant.id);

    if (error) {
      return { data: null, error: { message: error.message, code: 'UPDATE_ERROR' } };
    }

    // Audit log
    await admin.from('audit_logs').insert({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      action: 'guardian.consent_updated',
      entity_type: 'guardian',
      entity_id: input.guardianId,
      metadata: { changes: updates },
    });

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' },
    };
  }
}

// ============================================================
// updateContactInfo — parent updates their own phone number
// ============================================================

export async function updateContactInfo(
  input: UpdateContactInfoInput
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const context = await getTenantContext();
    const admin = createSupabaseAdminClient();

    // Verify ownership
    const { data: guardian } = await admin
      .from('guardians')
      .select('id, user_id')
      .eq('id', input.guardianId)
      .eq('tenant_id', context.tenant.id)
      .eq('user_id', context.user.id)
      .is('deleted_at', null)
      .single();

    if (!guardian) {
      return { data: null, error: { message: 'Guardian record not found', code: 'NOT_FOUND' } };
    }

    const updates: Record<string, string | null> = {};
    if (input.phone !== undefined) {
      updates.phone = input.phone;
    }

    if (Object.keys(updates).length === 0) {
      return { data: { success: true }, error: null };
    }

    const { error } = await admin
      .from('guardians')
      .update(updates)
      .eq('id', input.guardianId)
      .eq('tenant_id', context.tenant.id);

    if (error) {
      return { data: null, error: { message: error.message, code: 'UPDATE_ERROR' } };
    }

    // Audit log
    await admin.from('audit_logs').insert({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      action: 'guardian.contact_updated',
      entity_type: 'guardian',
      entity_id: input.guardianId,
      metadata: { fields: Object.keys(updates) },
    });

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Unknown error', code: 'INTERNAL_ERROR' },
    };
  }
}