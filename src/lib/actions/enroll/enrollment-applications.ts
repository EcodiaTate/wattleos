// src/lib/actions/enroll/enrollment-applications.ts
//
// ============================================================
// WattleOS V2 - Enrollment Application Server Actions (Module 10)
// ============================================================
// The heart of Module 10. Manages the full lifecycle of
// enrollment applications from submission through approval.
//
// The critical function is approveApplication() — a single
// server action that triggers a cascade creating the student
// record, guardian links, medical conditions, emergency
// contacts, custody restrictions, consent flags, and parent
// invitations. One click. Twelve outcomes. Zero re-entry.
//
// PART A FIX: Step 3 now ALWAYS creates guardian records, even
// when the parent hasn't created a user account yet. Guardian
// identity is stored via email/first_name/last_name. When the
// parent later accepts their invitation, acceptInvitation()
// backfills user_id onto the existing guardian record.
//
// WHY server action (not DB trigger): The cascade involves
// business logic (token generation, date computation, consent
// mapping) that doesn't belong in SQL. Server actions also
// give us better error handling and audit trails.
//
// PART B FIX: Step 1 now carries through nationality, languages,
// and previous_school from the application form to the student
// record. Previously these were captured but discarded on approval.
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  submitEnrollmentApplicationSchema,
  validate,
} from "@/lib/validations";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { validatePagination } from "@/lib/utils";
import {
  type ActionResponse,
  ErrorCodes,
  failure,
  paginated,
  paginatedFailure,
  type PaginatedResponse,
  success,
} from "@/types/api";
import type {
  ApplicationCustodyRestriction,
  ApplicationEmergencyContact,
  ApplicationGuardian,
  ApplicationMedicalCondition,
  ApplicationStatus,
  ApplicationWithDetails,
  EnrollmentApplication,
} from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

// Keep the original interface for backward-compat imports,
// but the actual runtime validation uses the Zod schema.
export interface SubmitApplicationInput {
  enrollment_period_id: string;
  submitted_by_email: string;

  // Child info
  child_first_name: string;
  child_last_name: string;
  child_preferred_name?: string | null;
  child_date_of_birth: string;
  child_gender?: string | null;
  child_nationality?: string | null;
  child_languages?: string[];
  child_previous_school?: string | null;

  // Program preferences
  requested_program?: string | null;
  requested_start_date?: string | null;

  // Re-enrollment
  existing_student_id?: string | null;

  // Guardian data
  guardians: ApplicationGuardian[];

  // Medical data
  medical_conditions?: ApplicationMedicalCondition[];

  // Emergency contacts
  emergency_contacts: ApplicationEmergencyContact[];

  // Custody
  custody_restrictions?: ApplicationCustodyRestriction[];

  // Consents
  media_consent: boolean;
  directory_consent: boolean;
  terms_accepted: boolean;
  privacy_accepted: boolean;

  // Custom fields
  custom_responses?: Record<string, unknown>;
}

export interface ListApplicationsParams {
  page?: number;
  per_page?: number;
  status?: ApplicationStatus;
  enrollment_period_id?: string;
  search?: string;
}

export interface ReviewApplicationInput {
  admin_notes?: string | null;
  approved_class_id?: string | null;
}

// ============================================================
// Helpers (local)
// ============================================================

function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ============================================================
// LIST APPLICATIONS (Admin - paginated)
// ============================================================
export async function listEnrollmentApplications(
  params?: ListApplicationsParams,
): Promise<PaginatedResponse<EnrollmentApplication>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const supabase = await createSupabaseServerClient();

    const { page, perPage, offset } = validatePagination(
      params?.page,
      params?.per_page,
    );
    const from = offset;
    const to = offset + perPage - 1;

    let query = supabase
      .from("enrollment_applications")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.enrollment_period_id) {
      query = query.eq("enrollment_period_id", params.enrollment_period_id);
    }
    if (params?.search) {
      const term = `%${params.search}%`;
      query = query.or(
        `child_first_name.ilike.${term},child_last_name.ilike.${term},submitted_by_email.ilike.${term}`,
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return paginatedFailure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    const total = count ?? 0;

    return paginated(
      (data ?? []) as EnrollmentApplication[],
      total,
      page,
      perPage,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list applications";
    return paginatedFailure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET APPLICATION WITH FULL DETAILS (Admin review screen)
// ============================================================

export async function getApplicationDetails(
  applicationId: string,
): Promise<ActionResponse<ApplicationWithDetails>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_applications")
      .select(
        `
        *,
        enrollment_period:enrollment_periods(id, name, year, period_type),
        documents:enrollment_documents(
          id, document_type, file_name, storage_path, mime_type,
          file_size_bytes, uploaded_by_email, verified, verified_by,
          verified_at, notes, created_at
        ),
        reviewer:users!enrollment_applications_reviewed_by_fkey(id, first_name, last_name),
        existing_student:students!enrollment_applications_existing_student_id_fkey(id, first_name, last_name),
        requested_class:classes!enrollment_applications_requested_class_id_fkey(id, name)
      `,
      )
      .eq("id", applicationId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return failure(error?.message ?? "Not found", ErrorCodes.NOT_FOUND);
    }

    // Supabase nested selects sometimes come back as arrays depending on relationship config.
    const enrollment_period = firstOrNull<Record<string, unknown>>(data.enrollment_period as Record<string, unknown> | Record<string, unknown>[]);
    const reviewer = firstOrNull<Record<string, unknown>>(data.reviewer as Record<string, unknown> | Record<string, unknown>[]);
    const existing_student = firstOrNull<Record<string, unknown>>(data.existing_student as Record<string, unknown> | Record<string, unknown>[]);
    const requested_class = firstOrNull<Record<string, unknown>>(data.requested_class as Record<string, unknown> | Record<string, unknown>[]);

    const documentsRaw = (data as Record<string, unknown>).documents;
    const documents = Array.isArray(documentsRaw)
      ? documentsRaw
      : documentsRaw
        ? [documentsRaw]
        : [];

    const {
      enrollment_period: _ep,
      documents: _docs,
      reviewer: _rev,
      existing_student: _es,
      requested_class: _rc,
      ...application
    } = data as Record<string, unknown>;

    return success({
      ...application,
      enrollment_period: enrollment_period ?? {
        id: "",
        name: "",
        year: 0,
        period_type: "new_enrollment",
      },
      documents,
      reviewer: reviewer ?? null,
      existing_student: existing_student ?? null,
      requested_class: requested_class ?? null,
    } as ApplicationWithDetails);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get application details";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SUBMIT APPLICATION (Public - from enrollment form)
// ============================================================
// Can be called by unauthenticated parents. The enrollment
// period must be open. RLS policy validates this on INSERT.

export async function submitEnrollmentApplication(
  tenantId: string,
  input: unknown,
): Promise<ActionResponse<EnrollmentApplication>> {
  try {
    // Zod validates all fields, trims strings, lowercases email,
    // checks date formats, enforces min guardians/contacts
    const parsed = validate(submitEnrollmentApplicationSchema, input);
    if (parsed.error) return parsed.error;
    const v = parsed.data;

    const supabase = await createSupabaseServerClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("enrollment_applications")
      .insert({
        tenant_id: tenantId,
        enrollment_period_id: v.enrollment_period_id,
        status: "submitted",
        submitted_by_email: v.submitted_by_email,
        submitted_at: now,
        child_first_name: v.child_first_name,
        child_last_name: v.child_last_name,
        child_preferred_name: v.child_preferred_name,
        child_date_of_birth: v.child_date_of_birth,
        child_gender: v.child_gender,
        child_nationality: v.child_nationality,
        child_languages: v.child_languages,
        child_previous_school: v.child_previous_school,
        requested_program: v.requested_program,
        requested_start_date: v.requested_start_date,
        existing_student_id: v.existing_student_id,
        guardians: v.guardians,
        medical_conditions: v.medical_conditions,
        emergency_contacts: v.emergency_contacts,
        custody_restrictions: v.custody_restrictions,
        media_consent: v.media_consent,
        directory_consent: v.directory_consent,
        terms_accepted: v.terms_accepted,
        terms_accepted_at: now,
        privacy_accepted: v.privacy_accepted,
        custom_responses: v.custom_responses,
      })
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as EnrollmentApplication);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit application";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE APPLICATION STATUS - Request Changes
// ============================================================

export async function requestApplicationChanges(
  applicationId: string,
  changeNotes: string,
): Promise<ActionResponse<EnrollmentApplication>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!changeNotes?.trim()) {
      return failure(
        "Change request notes are required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("enrollment_applications")
      .update({
        status: "changes_requested",
        change_request_notes: changeNotes.trim(),
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .in("status", ["submitted", "under_review"])
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentApplication);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to request changes";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// REJECT APPLICATION
// ============================================================

export async function rejectApplication(
  applicationId: string,
  rejectionReason: string,
): Promise<ActionResponse<EnrollmentApplication>> {
  try {
    await requirePermission(Permissions.APPROVE_APPLICATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!rejectionReason?.trim()) {
      return failure(
        "Rejection reason is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const { data, error } = await supabase
      .from("enrollment_applications")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .in("status", ["submitted", "under_review", "changes_requested"])
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentApplication);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reject application";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// APPROVE APPLICATION - THE CASCADE
// ============================================================

export interface ApproveApplicationInput {
  approved_class_id: string;
  admin_notes?: string | null;
}

export interface ApprovalResult {
  application: EnrollmentApplication;
  student_id: string;
  invitation_count: number;
}

export async function approveApplication(
  applicationId: string,
  input: ApproveApplicationInput,
): Promise<ActionResponse<ApprovalResult>> {
  try {
    await requirePermission(Permissions.APPROVE_APPLICATIONS);
    const context = await getTenantContext();
    const tenantId = context.tenant.id;
    const userId = context.user.id;

    if (!input.approved_class_id) {
      return failure(
        "A class must be assigned before approval",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Use admin client for cross-table cascade
    const admin = createSupabaseAdminClient();

    // 1. Fetch the full application
    const { data: app, error: appError } = await admin
      .from("enrollment_applications")
      .select("*")
      .eq("id", applicationId)
      .is("deleted_at", null)
      .single();

    if (appError || !app) {
      return failure("Application not found", ErrorCodes.NOT_FOUND);
    }

    if (
      !["submitted", "under_review", "changes_requested"].includes(app.status)
    ) {
      return failure(
        `Cannot approve an application with status "${app.status}"`,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      );
    }

    const guardians = (app.guardians ?? []) as ApplicationGuardian[];
    const medicalConditions = (app.medical_conditions ??
      []) as ApplicationMedicalCondition[];
    const emergencyContacts = (app.emergency_contacts ??
      []) as ApplicationEmergencyContact[];
    const custodyRestrictions = (app.custody_restrictions ??
      []) as ApplicationCustodyRestriction[];

    // ── Step 1: Create or update student record ────────────────
    let studentId: string;

    if (app.existing_student_id) {
      // Re-enrollment: update existing student
      studentId = app.existing_student_id;

      await admin
        .from("students")
        .update({
          preferred_name: app.child_preferred_name,
          gender: app.child_gender,
          enrollment_status: "active",
          // PART B: carry through compliance fields on re-enrollment too
          nationality: app.child_nationality ?? null,
          languages: app.child_languages ?? null,
          previous_school: app.child_previous_school ?? null,
        })
        .eq("id", studentId);
    } else {
      // New enrollment: create student
      const { data: student, error: studentError } = await admin
        .from("students")
        .insert({
          tenant_id: tenantId,
          first_name: app.child_first_name,
          last_name: app.child_last_name,
          preferred_name: app.child_preferred_name,
          dob: app.child_date_of_birth,
          gender: app.child_gender,
          enrollment_status: "active",
          // PART B: carry through compliance fields from application
          nationality: app.child_nationality ?? null,
          languages: app.child_languages ?? null,
          previous_school: app.child_previous_school ?? null,
        })
        .select("id")
        .single();

      if (studentError || !student) {
        return failure(
          `Failed to create student record: ${studentError?.message ?? "unknown"}`,
          ErrorCodes.CREATE_FAILED,
        );
      }

      studentId = student.id;
    }

    // ── Step 2: Create enrollment record ───────────────────────
    const startDate =
      app.requested_start_date ?? new Date().toISOString().split("T")[0];

    await admin.from("enrollments").insert({
      tenant_id: tenantId,
      student_id: studentId,
      class_id: input.approved_class_id,
      start_date: startDate,
      status: "active",
    });

    // ── Step 3: Create guardian records ─────────────────────────
    // PART A FIX: ALWAYS create guardian records, even when the
    // parent hasn't created a user account yet.
    for (const g of guardians) {
      const email = (g.email ?? "").toLowerCase().trim();
      if (!email) continue;

      // Check if user already exists with this email
      const { data: existingUser } = await admin
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const guardianUserId = existingUser?.id ?? null;

      const existingGuardianQuery = guardianUserId
        ? admin
            .from("guardians")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("user_id", guardianUserId)
            .eq("student_id", studentId)
            .is("deleted_at", null)
            .maybeSingle()
        : admin
            .from("guardians")
            .select("id")
            .eq("tenant_id", tenantId)
            .eq("email", email)
            .eq("student_id", studentId)
            .is("deleted_at", null)
            .maybeSingle();

      const { data: existingGuardian } = await existingGuardianQuery;

      const guardianPayload = {
        tenant_id: tenantId,
        user_id: guardianUserId,
        student_id: studentId,
        email,
        first_name: g.first_name,
        last_name: g.last_name,
        relationship: g.relationship,
        is_primary: g.is_primary,
        is_emergency_contact: g.is_emergency_contact,
        pickup_authorized: g.pickup_authorized,
        phone: g.phone,
        media_consent: app.media_consent,
        directory_consent: app.directory_consent,
      };

      if (existingGuardian) {
        await admin
          .from("guardians")
          .update(guardianPayload)
          .eq("id", existingGuardian.id);
      } else {
        await admin.from("guardians").insert(guardianPayload);
      }
    }

    // ── Step 4: Create medical_conditions records ──────────────
    if (medicalConditions.length > 0) {
      const medicalRows = medicalConditions.map((mc) => ({
        tenant_id: tenantId,
        student_id: studentId,
        condition_type: mc.condition_type,
        condition_name: mc.condition_name,
        severity: mc.severity,
        description: mc.description,
        action_plan: mc.action_plan,
        requires_medication: mc.requires_medication,
        medication_name: mc.medication_name,
        medication_location: mc.medication_location,
      }));

      await admin.from("medical_conditions").insert(medicalRows);
    }

    // ── Step 5: Create emergency_contacts records ──────────────
    if (emergencyContacts.length > 0) {
      const contactRows = emergencyContacts.map((ec) => ({
        tenant_id: tenantId,
        student_id: studentId,
        name: ec.name,
        relationship: ec.relationship,
        phone_primary: ec.phone_primary,
        phone_secondary: ec.phone_secondary,
        email: ec.email,
        priority_order: ec.priority_order,
      }));

      await admin.from("emergency_contacts").insert(contactRows);
    }

    // ── Step 6: Create custody_restrictions records ─────────────
    if (custodyRestrictions.length > 0) {
      const restrictionRows = custodyRestrictions.map((cr) => ({
        tenant_id: tenantId,
        student_id: studentId,
        restricted_person_name: cr.restricted_person_name,
        restriction_type: cr.restriction_type,
        court_order_reference: cr.court_order_reference,
        notes: cr.notes,
        effective_date: new Date().toISOString().split("T")[0],
      }));

      await admin.from("custody_restrictions").insert(restrictionRows);
    }

    // ── Step 7: Generate parent invitations ─────────────────────
    let invitationCount = 0;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    for (const g of guardians) {
      const email = (g.email ?? "").toLowerCase().trim();
      if (!email) continue;

      const token = generateSecureToken();

      const { error: inviteError } = await admin
        .from("parent_invitations")
        .insert({
          tenant_id: tenantId,
          email,
          student_id: studentId,
          invited_by: userId,
          token,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        });

      if (!inviteError) {
        invitationCount++;
        continue;
      }

      // Ignore duplicate invite errors (unique constraint)
      if (inviteError.code === "23505") {
        continue;
      }
      // Anything else is a real failure
      return failure(inviteError.message, ErrorCodes.CREATE_FAILED);
    }

    // ── Step 8: Update the application as approved ──────────────
    const { data: updatedApp, error: updateError } = await admin
      .from("enrollment_applications")
      .update({
        status: "approved",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        admin_notes: input.admin_notes ?? null,
        created_student_id: studentId,
        approved_class_id: input.approved_class_id,
      })
      .eq("id", applicationId)
      .select("*")
      .single();

    if (updateError || !updatedApp) {
      return failure(
        `Student created but application update failed: ${updateError?.message ?? "unknown"}`,
        ErrorCodes.UPDATE_FAILED,
      );
    }

    return success({
      application: updatedApp as EnrollmentApplication,
      student_id: studentId,
      invitation_count: invitationCount,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to approve application";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MARK APPLICATION AS UNDER REVIEW
// ============================================================

export async function markUnderReview(
  applicationId: string,
): Promise<ActionResponse<EnrollmentApplication>> {
  try {
    await requirePermission(Permissions.REVIEW_APPLICATIONS);
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_applications")
      .update({
        status: "under_review",
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("status", "submitted")
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentApplication);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark as under review";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// WITHDRAW APPLICATION (Parent action)
// ============================================================

export async function withdrawApplication(
  applicationId: string,
): Promise<ActionResponse<EnrollmentApplication>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_applications")
      .update({ status: "withdrawn" })
      .eq("id", applicationId)
      .in("status", ["draft", "submitted", "changes_requested"])
      .is("deleted_at", null)
      .select("*")
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as EnrollmentApplication);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to withdraw application";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET APPLICATION STATUS (Parent - by email)
// ============================================================

export async function getApplicationStatusByEmail(
  tenantId: string,
  email: string,
): Promise<
  ActionResponse<
    Array<
      Pick<
        EnrollmentApplication,
        | "id"
        | "status"
        | "child_first_name"
        | "child_last_name"
        | "submitted_at"
        | "change_request_notes"
        | "rejection_reason"
      >
    >
  >
> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("enrollment_applications")
      .select(
        "id, status, child_first_name, child_last_name, submitted_at, change_request_notes, rejection_reason",
      )
      .eq("tenant_id", tenantId)
      .eq("submitted_by_email", email.toLowerCase())
      .is("deleted_at", null)
      .order("submitted_at", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data ?? []);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get application status";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Generates a URL-safe random token for parent invitations.
 * 32 bytes → 43 characters base64url (collision-resistant).
 */
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Base64url encode (no padding)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}