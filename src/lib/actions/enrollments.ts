'use server';

"use server";

// ============================================================
// WattleOS V2 - Enrollment Server Actions
// ============================================================
// Handles the lifecycle of student-class relationships:
// admit → (optional transfer) → withdraw/complete.
//
// Fix: enrollStudent and transferStudent now call
// getTenantContext() for tenant_id on INSERT operations.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import { Enrollment } from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface EnrollStudentInput {
  student_id: string;
  class_id: string;
  start_date: string;
}

export interface TransferStudentInput {
  student_id: string;
  from_class_id: string;
  to_class_id: string;
  transfer_date: string;
}

// ============================================================
// ENROLL STUDENT IN CLASS
// ============================================================
// Creates a new active enrollment. Checks for existing active
// enrollment in the same class to prevent duplicates.

export async function enrollStudent(
  input: EnrollStudentInput,
): Promise<ActionResponse<Enrollment>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Validation
    if (!input.student_id)
      return failure("Student is required", "VALIDATION_ERROR");
    if (!input.class_id)
      return failure("Class is required", "VALIDATION_ERROR");
    if (!input.start_date)
      return failure("Start date is required", "VALIDATION_ERROR");

    // Check for existing active enrollment in same class
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", input.student_id)
      .eq("class_id", input.class_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return failure(
        "Student is already enrolled in this class",
        "DUPLICATE_ENROLLMENT",
      );
    }

    const { data, error } = await supabase
      .from("enrollments")
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        class_id: input.class_id,
        start_date: input.start_date,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data as Enrollment);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to enroll student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// TRANSFER STUDENT BETWEEN CLASSES
// ============================================================
// Completes the enrollment in the source class (sets end_date)
// and creates a new active enrollment in the target class.

export async function transferStudent(
  input: TransferStudentInput,
): Promise<ActionResponse<{ withdrawn: Enrollment; enrolled: Enrollment }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Validation
    if (!input.student_id)
      return failure("Student is required", "VALIDATION_ERROR");
    if (!input.from_class_id)
      return failure("Source class is required", "VALIDATION_ERROR");
    if (!input.to_class_id)
      return failure("Target class is required", "VALIDATION_ERROR");
    if (!input.transfer_date)
      return failure("Transfer date is required", "VALIDATION_ERROR");
    if (input.from_class_id === input.to_class_id) {
      return failure(
        "Source and target class must be different",
        "VALIDATION_ERROR",
      );
    }

    // Find the active enrollment in the source class
    const { data: currentEnrollment, error: findError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", input.student_id)
      .eq("class_id", input.from_class_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .single();

    if (findError || !currentEnrollment) {
      return failure("No active enrollment found in source class", "NOT_FOUND");
    }

    // Check target class doesn't already have an active enrollment
    const { data: existingTarget } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", input.student_id)
      .eq("class_id", input.to_class_id)
      .eq("status", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (existingTarget) {
      return failure(
        "Student is already enrolled in the target class",
        "DUPLICATE_ENROLLMENT",
      );
    }

    // Complete the current enrollment
    const { data: withdrawn, error: withdrawError } = await supabase
      .from("enrollments")
      .update({
        status: "completed",
        end_date: input.transfer_date,
      })
      .eq("id", currentEnrollment.id)
      .select()
      .single();

    if (withdrawError) {
      return failure(withdrawError.message, "DB_ERROR");
    }

    // Create new enrollment in target class
    const { data: enrolled, error: enrollError } = await supabase
      .from("enrollments")
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.student_id,
        class_id: input.to_class_id,
        start_date: input.transfer_date,
        status: "active",
      })
      .select()
      .single();

    if (enrollError) {
      // Attempt to roll back the withdrawal
      await supabase
        .from("enrollments")
        .update({ status: "active", end_date: null })
        .eq("id", currentEnrollment.id);

      return failure(enrollError.message, "DB_ERROR");
    }

    return success({
      withdrawn: withdrawn as Enrollment,
      enrolled: enrolled as Enrollment,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to transfer student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// WITHDRAW STUDENT FROM CLASS
// ============================================================

export async function withdrawStudent(
  studentId: string,
  classId: string,
  withdrawDate: string,
): Promise<ActionResponse<Enrollment>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollments")
      .update({
        status: "withdrawn",
        end_date: withdrawDate,
      })
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .eq("status", "active")
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    if (!data) {
      return failure("No active enrollment found", "NOT_FOUND");
    }

    return success(data as Enrollment);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to withdraw student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET ENROLLMENT HISTORY FOR A STUDENT
// ============================================================

export async function getStudentEnrollmentHistory(
  studentId: string,
): Promise<ActionResponse<Enrollment[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollments")
      .select("*, class:classes(id, name, room, cycle_level)")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success((data ?? []) as Enrollment[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get enrollment history";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
