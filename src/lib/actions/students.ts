"use server";

// ============================================================
// WattleOS V2 - Student Server Actions
// ============================================================
// CRUD operations for student records.
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
//
// PART A: getStudent() guardian join already handles nullable
// user_id (Supabase returns null for the joined user when
// user_id is NULL). Added pickup_authorizations fetch to match
// the updated StudentWithDetails type.
//
// PART B: Added Australian compliance fields (nationality,
// languages, indigenous_status, address, government IDs, etc.)
// to CreateStudentInput, UpdateStudentInput, createStudent(),
// and updateStudent(). All new fields are nullable.
// ============================================================

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validatePagination } from "@/lib/utils";
import {
  ActionResponse,
  failure,
  paginated,
  paginatedFailure,
  PaginatedResponse,
  success,
} from "@/types/api";
import type {
  EnrollmentStatus,
  IndigenousStatus,
  LanguageBackground,
  ParentEducationLevel,
  ParentOccupationGroup,
  ResidentialAddress,
  Student,
  StudentWithDetails,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// Input Types
// ============================================================

export interface CreateStudentInput {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  dob?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  enrollment_status?: EnrollmentStatus;
  notes?: string | null;
  // Compliance: enrollment form fields
  nationality?: string | null;
  languages?: string[] | null;
  previous_school?: string | null;
  // Compliance: ACARA / MySchool reporting
  indigenous_status?: IndigenousStatus | null;
  language_background?: LanguageBackground | null;
  country_of_birth?: string | null;
  home_language?: string | null;
  visa_subclass?: string | null;
  // Compliance: ACARA ASC - SES fields
  parent_education_level?: ParentEducationLevel | null;
  parent_occupation_group?: ParentOccupationGroup | null;
  // Compliance: CALD support
  interpreter_required?: boolean;
  // Compliance: address
  residential_address?: ResidentialAddress | null;
  // Compliance: ISQ reporting
  religion?: string | null;
  // Compliance: government identifiers
  crn?: string | null;
  usi?: string | null;
  medicare_number?: string | null;
}

export interface UpdateStudentInput {
  first_name?: string;
  last_name?: string;
  preferred_name?: string | null;
  dob?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  enrollment_status?: EnrollmentStatus;
  notes?: string | null;
  // Compliance: enrollment form fields
  nationality?: string | null;
  languages?: string[] | null;
  previous_school?: string | null;
  // Compliance: ACARA / MySchool reporting
  indigenous_status?: IndigenousStatus | null;
  language_background?: LanguageBackground | null;
  country_of_birth?: string | null;
  home_language?: string | null;
  visa_subclass?: string | null;
  // Compliance: ACARA ASC - SES fields
  parent_education_level?: ParentEducationLevel | null;
  parent_occupation_group?: ParentOccupationGroup | null;
  // Compliance: CALD support
  interpreter_required?: boolean;
  // Compliance: address
  residential_address?: ResidentialAddress | null;
  // Compliance: ISQ reporting
  religion?: string | null;
  // Compliance: government identifiers
  crn?: string | null;
  usi?: string | null;
  medicare_number?: string | null;
}

export interface ListStudentsParams {
  page?: number;
  per_page?: number;
  search?: string;
  enrollment_status?: EnrollmentStatus;
  class_id?: string;
}

// ============================================================
// LIST ACTIVE STUDENTS (slim, for dropdowns)
// ============================================================

export async function listActiveStudents(): Promise<
  ActionResponse<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      preferred_name: string | null;
    }>
  >
> {
  try {
    await requirePermission(Permissions.VIEW_STUDENTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name")
      .eq("enrollment_status", "active")
      .is("deleted_at", null)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    return success(data ?? []);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list active students";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// LIST STUDENTS
// ============================================================

export async function listStudents(
  params: ListStudentsParams = {},
): Promise<PaginatedResponse<Student>> {
  try {
    await requirePermission(Permissions.VIEW_STUDENTS);
    const supabase = await createSupabaseServerClient();
    const { page, perPage, offset } = validatePagination(
      params.page,
      params.per_page,
    );

    // Base query - RLS handles tenant isolation
    let query = supabase
      .from("students")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    // Filter: enrollment status
    if (params.enrollment_status) {
      query = query.eq("enrollment_status", params.enrollment_status);
    }

    // Filter: search by name
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      query = query.or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},preferred_name.ilike.${searchTerm}`,
      );
    }

    // Filter: students in a specific class (via enrollments)
    if (params.class_id) {
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", params.class_id)
        .eq("status", "active")
        .is("deleted_at", null);

      const studentIds = enrollmentData?.map((e) => e.student_id) ?? [];
      if (studentIds.length === 0) {
        return paginated([], 0, page, perPage);
      }
      query = query.in("id", studentIds);
    }

    // Paginate
    query = query.range(offset, offset + perPage - 1);

    const { data, count, error } = await query;

    if (error) {
      return paginatedFailure(error.message, "DB_ERROR");
    }

    return paginated(data as Student[], count ?? 0, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list students";
    return paginatedFailure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET STUDENT BY ID (with all related data)
// ============================================================

export async function getStudent(
  studentId: string,
): Promise<ActionResponse<StudentWithDetails>> {
  try {
    const context = await requirePermission(Permissions.VIEW_STUDENTS);
    const supabase = await createSupabaseServerClient();

    // Fetch student
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    if (studentError || !student) {
      return failure("Student not found", "NOT_FOUND");
    }

    // Fetch enrollments with class data
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("*, class:classes(*)")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("start_date", { ascending: false });

    // Fetch guardians with user data
    const { data: guardians } = await supabase
      .from("guardians")
      .select("*, user:users(id, email, first_name, last_name, avatar_url)")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false });

    // Fetch medical conditions
    const { data: medicalConditions } = await supabase
      .from("medical_conditions")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("severity", { ascending: true });

    // Fetch emergency contacts
    const { data: emergencyContacts } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("priority_order", { ascending: true });

    // Fetch custody restrictions
    const { data: custodyRestrictions } = await supabase
      .from("custody_restrictions")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null);

    // Fetch pickup authorizations
    const { data: pickupAuthorizations } = await supabase
      .from("pickup_authorizations")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("is_permanent", { ascending: false })
      .order("authorized_name", { ascending: true });

    const studentWithDetails: StudentWithDetails = {
      ...(student as Student),
      enrollments: (enrollments ?? []) as StudentWithDetails["enrollments"],
      guardians: (guardians ?? []) as StudentWithDetails["guardians"],
      medical_conditions: medicalConditions ?? [],
      emergency_contacts: emergencyContacts ?? [],
      custody_restrictions: custodyRestrictions ?? [],
      pickup_authorizations: pickupAuthorizations ?? [],
    };

    await logAudit({
      context,
      action: AuditActions.STUDENT_VIEWED,
      entityType: "student",
      entityId: studentId,
    });

    return success(studentWithDetails);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// CREATE STUDENT
// ============================================================

export async function createStudent(
  input: CreateStudentInput,
): Promise<ActionResponse<Student>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    // Validation
    if (!input.first_name?.trim()) {
      return failure("First name is required", "VALIDATION_ERROR");
    }
    if (!input.last_name?.trim()) {
      return failure("Last name is required", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("students")
      .insert({
        tenant_id: context.tenant.id,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        preferred_name: input.preferred_name?.trim() || null,
        dob: input.dob || null,
        gender: input.gender || null,
        photo_url: input.photo_url || null,
        enrollment_status: input.enrollment_status ?? "active",
        notes: input.notes?.trim() || null,
        // Compliance: enrollment form fields
        nationality: input.nationality?.trim() || null,
        languages: input.languages ?? null,
        previous_school: input.previous_school?.trim() || null,
        // Compliance: ACARA / MySchool reporting
        indigenous_status: input.indigenous_status ?? null,
        language_background: input.language_background ?? null,
        country_of_birth: input.country_of_birth?.trim() || null,
        home_language: input.home_language?.trim() || null,
        visa_subclass: input.visa_subclass?.trim() || null,
        // Compliance: ACARA ASC - SES fields
        parent_education_level: input.parent_education_level ?? null,
        parent_occupation_group: input.parent_occupation_group ?? null,
        // Compliance: CALD support
        interpreter_required: input.interpreter_required ?? false,
        // Compliance: address
        residential_address: input.residential_address ?? null,
        // Compliance: ISQ reporting
        religion: input.religion?.trim() || null,
        // Compliance: government identifiers
        crn: input.crn?.trim() || null,
        usi: input.usi?.trim() || null,
        medicare_number: input.medicare_number?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      await logAudit({
        context,
        action: AuditActions.STUDENT_CREATED,
        entityType: "student",
        outcome: "failure",
        metadata: { first_name: input.first_name, last_name: input.last_name, error: error.message },
      });
      return failure(error.message, "DB_ERROR");
    }

    await logAudit({
      context,
      action: AuditActions.STUDENT_CREATED,
      entityType: "student",
      entityId: (data as Student).id,
      metadata: { first_name: input.first_name, last_name: input.last_name },
    });

    return success(data as Student);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// UPDATE STUDENT
// ============================================================

export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput,
): Promise<ActionResponse<Student>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    // Build the update payload - only include fields that were provided
    const updateData: Record<string, unknown> = {};

    // Basic fields
    if (input.first_name !== undefined)
      updateData.first_name = input.first_name.trim();
    if (input.last_name !== undefined)
      updateData.last_name = input.last_name.trim();
    if (input.preferred_name !== undefined)
      updateData.preferred_name = input.preferred_name?.trim() || null;
    if (input.dob !== undefined) updateData.dob = input.dob || null;
    if (input.gender !== undefined) updateData.gender = input.gender || null;
    if (input.photo_url !== undefined)
      updateData.photo_url = input.photo_url || null;
    if (input.enrollment_status !== undefined)
      updateData.enrollment_status = input.enrollment_status;
    if (input.notes !== undefined)
      updateData.notes = input.notes?.trim() || null;

    // Compliance: enrollment form fields
    if (input.nationality !== undefined)
      updateData.nationality = input.nationality?.trim() || null;
    if (input.languages !== undefined)
      updateData.languages = input.languages ?? null;
    if (input.previous_school !== undefined)
      updateData.previous_school = input.previous_school?.trim() || null;

    // Compliance: ACARA / MySchool reporting
    if (input.indigenous_status !== undefined)
      updateData.indigenous_status = input.indigenous_status ?? null;
    if (input.language_background !== undefined)
      updateData.language_background = input.language_background ?? null;
    if (input.country_of_birth !== undefined)
      updateData.country_of_birth = input.country_of_birth?.trim() || null;
    if (input.home_language !== undefined)
      updateData.home_language = input.home_language?.trim() || null;
    if (input.visa_subclass !== undefined)
      updateData.visa_subclass = input.visa_subclass?.trim() || null;
    if (input.parent_education_level !== undefined)
      updateData.parent_education_level = input.parent_education_level ?? null;
    if (input.parent_occupation_group !== undefined)
      updateData.parent_occupation_group =
        input.parent_occupation_group ?? null;
    if (input.interpreter_required !== undefined)
      updateData.interpreter_required = input.interpreter_required;

    // Compliance: address
    if (input.residential_address !== undefined)
      updateData.residential_address = input.residential_address ?? null;

    // Compliance: ISQ reporting
    if (input.religion !== undefined)
      updateData.religion = input.religion?.trim() || null;

    // Compliance: government identifiers
    if (input.crn !== undefined) updateData.crn = input.crn?.trim() || null;
    if (input.usi !== undefined) updateData.usi = input.usi?.trim() || null;
    if (input.medicare_number !== undefined)
      updateData.medicare_number = input.medicare_number?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", "VALIDATION_ERROR");
    }

    const { data, error } = await supabase
      .from("students")
      .update(updateData)
      .eq("id", studentId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      await logAudit({
        context,
        action: AuditActions.STUDENT_UPDATED,
        entityType: "student",
        entityId: studentId,
        outcome: "failure",
        metadata: { updated_fields: Object.keys(updateData), error: error.message },
      });
      return failure(error.message, "DB_ERROR");
    }

    if (!data) {
      return failure("Student not found", "NOT_FOUND");
    }

    await logAudit({
      context,
      action: AuditActions.STUDENT_UPDATED,
      entityType: "student",
      entityId: studentId,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return success(data as Student);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// SOFT DELETE STUDENT
// ============================================================
// Sets deleted_at instead of removing the row.
// Also soft-deletes related enrollments.

export async function deleteStudent(
  studentId: string,
  deletionReason?: string,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_STUDENTS);
    const supabase = await createSupabaseServerClient();

    // Fetch name before delete for audit trail
    const { data: existing } = await supabase
      .from("students")
      .select("first_name, last_name")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    const now = new Date().toISOString();

    // Soft delete the student — record who deleted and why
    const { error: studentError } = await supabase
      .from("students")
      .update({
        deleted_at: now,
        deleted_by: context.user.id,
        deletion_reason: deletionReason ?? null,
      })
      .eq("id", studentId)
      .is("deleted_at", null);

    if (studentError) {
      await logAudit({
        context,
        action: AuditActions.STUDENT_DELETED,
        entityType: "student",
        entityId: studentId,
        outcome: "failure",
        metadata: { error: studentError.message },
      });
      return failure(studentError.message, "DB_ERROR");
    }

    // Soft delete active enrollments — propagate attribution
    await supabase
      .from("enrollments")
      .update({
        deleted_at: now,
        status: "withdrawn",
        deleted_by: context.user.id,
        deletion_reason: "Student record deleted",
      })
      .eq("student_id", studentId)
      .eq("status", "active")
      .is("deleted_at", null);

    await logAudit({
      context,
      action: AuditActions.STUDENT_DELETED,
      entityType: "student",
      entityId: studentId,
      metadata: {
        first_name: existing?.first_name ?? "unknown",
        last_name: existing?.last_name ?? "unknown",
        deletion_reason: deletionReason ?? null,
      },
    });

    return success({ id: studentId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete student";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
