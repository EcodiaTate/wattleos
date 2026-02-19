'use server';

// ============================================================
// WattleOS V2 — Custody Restriction Server Actions
// ============================================================
// HIGH-SENSITIVITY TABLE. Tracks court orders and access
// restrictions. Only accessible by users with
// 'manage_safety_records' permission (enforced by RLS).
//
// Fix: createCustodyRestriction now calls getTenantContext()
// for tenant_id on INSERT. Audit log writes use context
// instead of a separate auth.getUser() call.
// ============================================================

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { ActionResponse, success, failure } from '@/types/api';
import { CustodyRestriction, RestrictionType } from '@/types/domain';

// ============================================================
// Input Types
// ============================================================

export interface CreateCustodyRestrictionInput {
  student_id: string;
  restricted_person_name: string;
  restriction_type: RestrictionType;
  court_order_reference?: string | null;
  court_order_doc_url?: string | null;
  effective_date: string;
  expiry_date?: string | null;
  notes?: string | null;
}

export interface UpdateCustodyRestrictionInput {
  restricted_person_name?: string;
  restriction_type?: RestrictionType;
  court_order_reference?: string | null;
  court_order_doc_url?: string | null;
  effective_date?: string;
  expiry_date?: string | null;
  notes?: string | null;
}

// ============================================================
// LIST CUSTODY RESTRICTIONS FOR A STUDENT
// ============================================================

export async function listCustodyRestrictions(
  studentId: string
): Promise<ActionResponse<CustodyRestriction[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('custody_restrictions')
      .select('*')
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('effective_date', { ascending: false });

    if (error) {
      // RLS will deny access if user lacks 'manage_safety_records' permission
      if (error.code === '42501' || error.message.includes('policy')) {
        return failure('You do not have permission to view custody restrictions', 'FORBIDDEN');
      }
      return failure(error.message, 'DB_ERROR');
    }

    return success((data ?? []) as CustodyRestriction[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list custody restrictions';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// CREATE CUSTODY RESTRICTION
// ============================================================

export async function createCustodyRestriction(
  input: CreateCustodyRestrictionInput
): Promise<ActionResponse<CustodyRestriction>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Validation
    if (!input.student_id) return failure('Student is required', 'VALIDATION_ERROR');
    if (!input.restricted_person_name?.trim()) {
      return failure('Restricted person name is required', 'VALIDATION_ERROR');
    }
    if (!input.restriction_type) return failure('Restriction type is required', 'VALIDATION_ERROR');
    if (!input.effective_date) return failure('Effective date is required', 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('custody_restrictions')
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        restricted_person_name: input.restricted_person_name.trim(),
        restriction_type: input.restriction_type,
        court_order_reference: input.court_order_reference?.trim() || null,
        court_order_doc_url: input.court_order_doc_url || null,
        effective_date: input.effective_date,
        expiry_date: input.expiry_date || null,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    // Audit log — custody changes are security-critical
    const adminClient = createSupabaseAdminClient();

    await adminClient.from('audit_logs').insert({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      action: 'custody_restriction.created',
      entity_type: 'custody_restriction',
      entity_id: (data as CustodyRestriction).id,
      metadata: {
        student_id: input.student_id,
        restriction_type: input.restriction_type,
        restricted_person: input.restricted_person_name,
      },
    });

    return success(data as CustodyRestriction);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create custody restriction';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// UPDATE CUSTODY RESTRICTION
// ============================================================

export async function updateCustodyRestriction(
  restrictionId: string,
  input: UpdateCustodyRestrictionInput
): Promise<ActionResponse<CustodyRestriction>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.restricted_person_name !== undefined) updateData.restricted_person_name = input.restricted_person_name.trim();
    if (input.restriction_type !== undefined) updateData.restriction_type = input.restriction_type;
    if (input.court_order_reference !== undefined) updateData.court_order_reference = input.court_order_reference?.trim() || null;
    if (input.court_order_doc_url !== undefined) updateData.court_order_doc_url = input.court_order_doc_url || null;
    if (input.effective_date !== undefined) updateData.effective_date = input.effective_date;
    if (input.expiry_date !== undefined) updateData.expiry_date = input.expiry_date || null;
    if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return failure('No fields to update', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('custody_restrictions')
      .update(updateData)
      .eq('id', restrictionId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    if (!data) {
      return failure('Custody restriction not found', 'NOT_FOUND');
    }

    // Audit log
    const adminClient = createSupabaseAdminClient();

    await adminClient.from('audit_logs').insert({
      tenant_id: context.tenant.id,
      user_id: context.user.id,
      action: 'custody_restriction.updated',
      entity_type: 'custody_restriction',
      entity_id: restrictionId,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as CustodyRestriction);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update custody restriction';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// DELETE CUSTODY RESTRICTION (soft delete)
// ============================================================

export async function deleteCustodyRestriction(
  restrictionId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch before delete for audit
    const { data: existing } = await supabase
      .from('custody_restrictions')
      .select('student_id, restricted_person_name')
      .eq('id', restrictionId)
      .is('deleted_at', null)
      .single();

    const { error } = await supabase
      .from('custody_restrictions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', restrictionId)
      .is('deleted_at', null);

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    // Audit log
    if (existing) {
      const adminClient = createSupabaseAdminClient();

      await adminClient.from('audit_logs').insert({
        tenant_id: context.tenant.id,
        user_id: context.user.id,
        action: 'custody_restriction.deleted',
        entity_type: 'custody_restriction',
        entity_id: restrictionId,
        metadata: {
          student_id: existing.student_id,
          restricted_person: existing.restricted_person_name,
        },
      });
    }

    return success({ id: restrictionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete custody restriction';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}