'use server';

// ============================================================
// WattleOS V2 — Class Server Actions
// ============================================================
// CRUD for Montessori classrooms/environments.
// Classes are the organizational unit students are enrolled into.
//
// Fix: createClass now calls getTenantContext() for tenant_id.
// ============================================================

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { ActionResponse, success, failure } from '@/types/api';
import { Class, ClassWithCounts, EnrollmentWithStudent } from '@/types/domain';

// ============================================================
// Input Types
// ============================================================

export interface CreateClassInput {
  name: string;
  room?: string | null;
  cycle_level?: string | null;
}

export interface UpdateClassInput {
  name?: string;
  room?: string | null;
  cycle_level?: string | null;
  is_active?: boolean;
}

// ============================================================
// LIST CLASSES (with active enrollment counts)
// ============================================================

export async function listClasses(): Promise<ActionResponse<ClassWithCounts[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    // Get active enrollment counts per class
    const classIds = (classes ?? []).map((c) => c.id);
    const counts: Record<string, number> = {};

    if (classIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'active')
        .is('deleted_at', null);

      for (const enrollment of enrollments ?? []) {
        counts[enrollment.class_id] = (counts[enrollment.class_id] ?? 0) + 1;
      }
    }

    const classesWithCounts: ClassWithCounts[] = (classes ?? []).map((c) => ({
      ...(c as Class),
      active_enrollment_count: counts[c.id] ?? 0,
    }));

    return success(classesWithCounts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list classes';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// GET CLASS BY ID
// ============================================================

export async function getClass(classId: string): Promise<ActionResponse<Class>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return failure('Class not found', 'NOT_FOUND');
    }

    return success(data as Class);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get class';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// GET CLASS ROSTER (students actively enrolled)
// ============================================================

export async function getClassRoster(
  classId: string
): Promise<ActionResponse<EnrollmentWithStudent[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('enrollments')
      .select('*, student:students(*)')
      .eq('class_id', classId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success((data ?? []) as EnrollmentWithStudent[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get class roster';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// CREATE CLASS
// ============================================================

export async function createClass(input: CreateClassInput): Promise<ActionResponse<Class>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.name?.trim()) {
      return failure('Class name is required', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        tenant_id: context.tenant.id,
        name: input.name.trim(),
        room: input.room?.trim() || null,
        cycle_level: input.cycle_level?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success(data as Class);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create class';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// UPDATE CLASS
// ============================================================

export async function updateClass(
  classId: string,
  input: UpdateClassInput
): Promise<ActionResponse<Class>> {
  try {
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.room !== undefined) updateData.room = input.room?.trim() || null;
    if (input.cycle_level !== undefined) updateData.cycle_level = input.cycle_level?.trim() || null;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length === 0) {
      return failure('No fields to update', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', classId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    if (!data) {
      return failure('Class not found', 'NOT_FOUND');
    }

    return success(data as Class);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update class';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}

// ============================================================
// SOFT DELETE CLASS
// ============================================================
// Withdraws all active enrollments before deactivating.

export async function deleteClass(classId: string): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Check for active enrollments
    const { data: activeEnrollments } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (activeEnrollments && activeEnrollments.length > 0) {
      return failure(
        `Cannot delete class with ${activeEnrollments.length} active enrollment(s). Withdraw or transfer students first.`,
        'HAS_ACTIVE_ENROLLMENTS'
      );
    }

    const { error } = await supabase
      .from('classes')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', classId)
      .is('deleted_at', null);

    if (error) {
      return failure(error.message, 'DB_ERROR');
    }

    return success({ id: classId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete class';
    return failure(message, 'UNEXPECTED_ERROR');
  }
}