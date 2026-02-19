'use server';

// ============================================================
// WattleOS V2 — Emergency Contact Server Actions
// ============================================================
// Separate from guardians: not all emergency contacts are
// system users, and not all guardians are emergency contacts.
//
// Fix: createEmergencyContact now calls getTenantContext()
// for tenant_id on INSERT.
// ============================================================

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { ActionResponse, success, failure } from '@/types/api';
import { EmergencyContact } from '@/types/domain';

// ============================================================
// Input Types
// ============================================================

export interface CreateEmergencyContactInput {
  student_id: string;
  name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary?: string | null;
  email?: string | null;
  priority_order?: number;
  notes?: string | null;
}

export interface UpdateEmergencyContactInput {
  name?: string;
  relationship?: string;
  phone_primary?: string;
  phone_secondary?: string | null;
  email?: string | null;
  priority_order?: number;
  notes?: string | null;
}

// ============================================================
// LIST EMERGENCY CONTACTS FOR A STUDENT
// ============================================================

export async function listEmergencyContacts(
  studentId: string
): Promise<ActionResponse<EmergencyContact[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('student_id', studentId)
      .is('deleted_at', null)
      .order('priority_order', { ascending: true });

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success((data ?? []) as EmergencyContact[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list emergency contacts';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// CREATE EMERGENCY CONTACT
// ============================================================

export async function createEmergencyContact(
  input: CreateEmergencyContactInput
): Promise<ActionResponse<EmergencyContact>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.student_id) return failure('Student is required', 'VALIDATION_ERROR');
    if (!input.name?.trim()) return failure('Name is required', 'VALIDATION_ERROR');
    if (!input.relationship?.trim()) return failure('Relationship is required', 'VALIDATION_ERROR');
    if (!input.phone_primary?.trim()) return failure('Primary phone is required', 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        name: input.name.trim(),
        relationship: input.relationship.trim(),
        phone_primary: input.phone_primary.trim(),
        phone_secondary: input.phone_secondary?.trim() || null,
        email: input.email?.trim() || null,
        priority_order: input.priority_order ?? 1,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as EmergencyContact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create emergency contact';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// UPDATE EMERGENCY CONTACT
// ============================================================

export async function updateEmergencyContact(
  contactId: string,
  input: UpdateEmergencyContactInput
): Promise<ActionResponse<EmergencyContact>> {
  try {
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.relationship !== undefined) updateData.relationship = input.relationship.trim();
    if (input.phone_primary !== undefined) updateData.phone_primary = input.phone_primary.trim();
    if (input.phone_secondary !== undefined) updateData.phone_secondary = input.phone_secondary?.trim() || null;
    if (input.email !== undefined) updateData.email = input.email?.trim() || null;
    if (input.priority_order !== undefined) updateData.priority_order = input.priority_order;
    if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return failure('No fields to update', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(updateData)
      .eq('id', contactId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    if (!data) {
      return failure('Emergency contact not found', 'NOT_FOUND');
    }

    return success(data as EmergencyContact);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update emergency contact';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// DELETE EMERGENCY CONTACT (soft delete)
// ============================================================

export async function deleteEmergencyContact(
  contactId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('emergency_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', contactId)
      .is('deleted_at', null);

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success({ id: contactId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete emergency contact';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}