// src/lib/data-import/actions.ts
//
// ============================================================
// WattleOS V2 - Data Import Server Actions
// ============================================================
// WHY: All database interactions for the import pipeline.
// Validation checks existing data (duplicates, FK references).
// Import uses upsert patterns for attendance (idempotent),
// and admin client for guardian/staff creation (bypasses auth
// limitations).
//
// KEY FIX: Uses context.tenant.id / context.user.id (nested
// TenantContext), NOT the flat context.tenant_id pattern.
//
// AUDIT: Uses centralized logAudit() for consistent metadata
// enrichment (IP, user agent, sensitivity, user identity).
//
// Every action returns { data, error } - never throws.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import { validateImport } from "./validators";
import type {
  ImportType,
  ImportJob,
  ColumnMapping,
  ParsedCSV,
  ValidationResult,
  ValidatedRow,
  ImportMetadata,
} from "./types";
import { logAudit, AuditActions } from "@/lib/utils/audit";

// ============================================================
// 1. Fetch Existing Data (for validation)
// ============================================================

interface ExistingDataPayload {
  student_names: string[]; // ["firstname|lastname", ...]
  class_names: Record<string, string>; // { "lowercase name": "uuid" }
  guardian_emails: string[];
  role_names: Record<string, string>; // { "lowercase name": "uuid" }
  attendance_keys: string[]; // ["studentid|date", ...] - for attendance dedup
}

/**
 * Fetch existing tenant data needed for validation.
 * WHY: We need to detect duplicates and validate FK references
 * BEFORE attempting inserts, so we can show a clean preview.
 */
export async function fetchExistingData(
  importType: ImportType
): Promise<ActionResponse<ExistingDataPayload>> {
  const context = await requirePermission(Permissions.MANAGE_STUDENTS);
  if (!context) return failure("Unauthorized", "UNAUTHORIZED");

  const supabase = await createSupabaseServerClient();

  try {
    const payload: ExistingDataPayload = {
      student_names: [],
      class_names: {},
      guardian_emails: [],
      role_names: {},
      attendance_keys: [],
    };

    // Always fetch students (needed for guardians, emergency contacts, medical, attendance)
    const { data: students, error: studentsErr } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .is("deleted_at", null);

    if (studentsErr) return failure(studentsErr.message, "DB_ERROR");

    // Build student name lookup
    const studentIdByName = new Map<string, string>();
    for (const s of students ?? []) {
      const nameKey = `${s.first_name.toLowerCase()}|${s.last_name.toLowerCase()}`;
      payload.student_names.push(nameKey);
      studentIdByName.set(nameKey, s.id);
    }

    // Fetch classes (needed for student + attendance imports)
    if (importType === "students" || importType === "attendance") {
      const { data: classes, error: classErr } = await supabase
        .from("classes")
        .select("id, name")
        .is("deleted_at", null);

      if (classErr) return failure(classErr.message, "DB_ERROR");

      for (const c of classes ?? []) {
        payload.class_names[c.name.toLowerCase()] = c.id;
      }
    }

    // Fetch guardian emails (needed for guardian imports)
    if (importType === "guardians") {
      const { data: guardians, error: gErr } = await supabase
        .from("guardians")
        .select("user_id, users!inner(email)")
        .is("deleted_at", null);

      if (!gErr && guardians) {
        payload.guardian_emails = guardians
          .map((g) => {
            const user = g.users as unknown as { email: string } | null;
            return user?.email?.toLowerCase() ?? "";
          })
          .filter(Boolean);
      }
    }

    // Fetch roles (needed for staff imports)
    if (importType === "staff") {
      const { data: roles, error: roleErr } = await supabase
        .from("roles")
        .select("id, name")
        .is("deleted_at", null);

      if (roleErr) return failure(roleErr.message, "DB_ERROR");

      for (const r of roles ?? []) {
        payload.role_names[r.name.toLowerCase()] = r.id;
      }
    }

    // Fetch existing attendance records for dedup (last 3 years)
    if (importType === "attendance") {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const cutoffDate = threeYearsAgo.toISOString().split("T")[0];

      const { data: attendance, error: attErr } = await supabase
        .from("attendance_records")
        .select("student_id, date")
        .gte("date", cutoffDate)
        .is("deleted_at", null);

      if (!attErr && attendance) {
        // Build lookup: find student name from ID
        const studentNameById = new Map<string, string>();
        for (const [name, id] of studentIdByName.entries()) {
          studentNameById.set(id, name);
        }

        payload.attendance_keys = attendance
          .map((a) => {
            const name = studentNameById.get(a.student_id);
            return name ? `${name}|${a.date}` : "";
          })
          .filter(Boolean);
      }
    }

    return success(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// 2. Server-Side Validation
// ============================================================

interface ValidateInput {
  import_type: ImportType;
  parsed_csv: ParsedCSV;
  column_mapping: ColumnMapping;
}

/**
 * Validate CSV data against field definitions and existing tenant data.
 * Returns per-row validation results for preview UI.
 */
export async function validateImportData(
  input: ValidateInput
): Promise<ActionResponse<ValidationResult>> {
  const context = await requirePermission(Permissions.MANAGE_STUDENTS);
  if (!context) return failure("Unauthorized", "UNAUTHORIZED");

  try {
    // Fetch existing data for duplicate/FK checking
    const existingResult = await fetchExistingData(input.import_type);
    if (existingResult.error || !existingResult.data) {
      return failure(
        existingResult.error?.message ?? "Failed to fetch existing data",
        "VALIDATION_ERROR"
      );
    }

    const existing = existingResult.data;

    // Convert to the format validators expect
    const existingData = {
      student_names: new Set(existing.student_names),
      class_names: new Map(Object.entries(existing.class_names)),
      guardian_emails: new Set(existing.guardian_emails),
      role_names: new Map(Object.entries(existing.role_names)),
      attendance_keys: new Set(existing.attendance_keys),
    };

    const result = validateImport(
      input.import_type,
      input.parsed_csv,
      input.column_mapping,
      existingData
    );

    return success(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// 3. Execute Import
// ============================================================

interface ExecuteImportInput {
  import_type: ImportType;
  file_name: string;
  column_mapping: ColumnMapping;
  validated_rows: ValidatedRow[];
  metadata: ImportMetadata;
  skip_duplicates: boolean;
}

/**
 * Execute the actual import: create an import job, insert rows, track results.
 * Only processes rows that passed validation (is_valid === true).
 */
export async function executeImport(
  input: ExecuteImportInput
): Promise<ActionResponse<ImportJob>> {
  const context = await requirePermission(Permissions.MANAGE_STUDENTS);
  if (!context) return failure("Unauthorized", "UNAUTHORIZED");

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const tenantId = context.tenant.id;
  const userId = context.user.id;

  try {
    // Create the import job record
    const { data: job, error: jobErr } = await supabase
      .from("import_jobs")
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        import_type: input.import_type,
        status: "importing",
        file_name: input.file_name,
        column_mapping: input.column_mapping,
        total_rows: input.validated_rows.length,
        metadata: input.metadata,
      })
      .select()
      .single();

    if (jobErr || !job) {
      return failure(jobErr?.message ?? "Failed to create import job", "DB_ERROR");
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; field: string; message: string }> = [];

    // Process each validated row
    for (const row of input.validated_rows) {
      // Skip invalid rows
      if (!row.is_valid) {
        errorCount++;
        errors.push(...row.errors);

        await supabase.from("import_job_records").insert({
          tenant_id: tenantId,
          import_job_id: job.id,
          row_number: row.row_number,
          status: "error",
          entity_type: input.import_type,
          raw_data: row.raw_data,
          mapped_data: row.mapped_data,
          error_message: row.errors.map((e) => e.message).join("; "),
        });
        continue;
      }

      // Skip duplicates if option is enabled (except attendance - always upsert)
      if (
        row.is_duplicate &&
        input.skip_duplicates &&
        input.import_type !== "attendance"
      ) {
        skippedCount++;

        await supabase.from("import_job_records").insert({
          tenant_id: tenantId,
          import_job_id: job.id,
          row_number: row.row_number,
          status: "skipped",
          entity_type: input.import_type,
          raw_data: row.raw_data,
          mapped_data: row.mapped_data,
          error_message: "Skipped - duplicate record",
        });
        continue;
      }

      // Attempt to insert the row
      // WHY admin client for guardians/staff: these need to create/lookup
      // users in auth.users which requires service role access.
      const client = ["guardians", "staff"].includes(input.import_type)
        ? admin
        : supabase;

      const insertResult = await insertRow(
        client,
        admin,
        tenantId,
        userId,
        input.import_type,
        row.mapped_data
      );

      if (insertResult.error) {
        errorCount++;
        errors.push({
          row: row.row_number,
          field: "",
          message: insertResult.error,
        });

        await supabase.from("import_job_records").insert({
          tenant_id: tenantId,
          import_job_id: job.id,
          row_number: row.row_number,
          status: "error",
          entity_type: input.import_type,
          raw_data: row.raw_data,
          mapped_data: row.mapped_data,
          error_message: insertResult.error,
        });
      } else {
        importedCount++;

        await supabase.from("import_job_records").insert({
          tenant_id: tenantId,
          import_job_id: job.id,
          row_number: row.row_number,
          status: "imported",
          entity_type: input.import_type,
          entity_id: insertResult.entity_id ?? undefined,
          raw_data: row.raw_data,
          mapped_data: row.mapped_data,
        });
      }
    }

    // Update the job with final counts
    const finalStatus =
      errorCount > 0 && importedCount > 0
        ? "completed_with_errors"
        : errorCount > 0
          ? "failed"
          : "completed";

    const { data: updatedJob, error: updateErr } = await supabase
      .from("import_jobs")
      .update({
        status: finalStatus,
        imported_count: importedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        errors: errors,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select()
      .single();

    if (updateErr) {
      return failure(updateErr.message, "DB_ERROR");
    }

    // WHY audit: Data imports create/modify many records at once.
    // Schools need to track who imported what, how many succeeded/failed,
    // and be able to correlate with the import job for rollback.
    await logAudit({
      context,
      action: AuditActions.IMPORT_COMPLETED,
      entityType: "import_job",
      entityId: job.id,
      metadata: {
        import_type: input.import_type,
        final_status: finalStatus,
        file_name: input.file_name,
        total_rows: input.validated_rows.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    });

    return success(updatedJob as ImportJob);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// Row Insertion Logic (per import type)
// ============================================================

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

interface InsertResult {
  entity_id: string | null;
  error: string | null;
}

/**
 * Insert a single validated row into the appropriate table(s).
 * Each import type has its own insertion logic.
 *
 * @param client - The primary client for inserts (supabase for RLS-safe, admin for auth-required)
 * @param admin - Always the admin client, used when we need service role regardless of primary
 */
async function insertRow(
  client: SupabaseClient | AdminClient,
  admin: AdminClient,
  tenantId: string,
  userId: string,
  importType: ImportType,
  data: Record<string, string>
): Promise<InsertResult> {
  try {
    switch (importType) {
      case "students":
        return await insertStudent(client, tenantId, data);
      case "guardians":
        return await insertGuardian(admin, tenantId, data);
      case "emergency_contacts":
        return await insertEmergencyContact(client, tenantId, data);
      case "medical_conditions":
        return await insertMedicalCondition(client, tenantId, data);
      case "staff":
        return await insertStaff(admin, tenantId, data);
      case "attendance":
        return await insertAttendance(client, tenantId, userId, data);
      default:
        return { entity_id: null, error: `Unknown import type: ${importType}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Insert failed";
    return { entity_id: null, error: message };
  }
}

/**
 * Insert a student record. Also handles:
 * - Creating the class if it doesn't exist
 * - Creating an enrollment if class is specified
 */
async function insertStudent(
  client: SupabaseClient | AdminClient,
  tenantId: string,
  data: Record<string, string>
): Promise<InsertResult> {
  const { data: student, error: studentErr } = await client
    .from("students")
    .insert({
      tenant_id: tenantId,
      first_name: data.first_name,
      last_name: data.last_name,
      preferred_name: data.preferred_name || null,
      dob: data.dob || null,
      gender: data.gender || null,
      enrollment_status: data.enrollment_status || "active",
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (studentErr || !student) {
    return { entity_id: null, error: studentErr?.message ?? "Failed to insert student" };
  }

  // If a class was specified, resolve or create it, then enroll
  if (data.class_name) {
    const classId = await resolveOrCreateClass(client, tenantId, data.class_name);
    if (classId) {
      await client.from("enrollments").insert({
        tenant_id: tenantId,
        student_id: student.id,
        class_id: classId,
        start_date: new Date().toISOString().split("T")[0],
        status: "active",
      });
    }
  }

  return { entity_id: student.id, error: null };
}

/**
 * Insert a guardian record using admin client.
 * WHY admin client: We need to look up users by email in the users table,
 * and create guardian links. If the user doesn't exist, we create a
 * parent_invitation instead of failing (the old limitation).
 */
async function insertGuardian(
  admin: AdminClient,
  tenantId: string,
  data: Record<string, string>
): Promise<InsertResult> {
  // Find the student
  const studentId = await findStudentByName(admin, tenantId, data.student_first_name, data.student_last_name);
  if (!studentId) {
    return {
      entity_id: null,
      error: `Student "${data.student_first_name} ${data.student_last_name}" not found`,
    };
  }

  // Find the user by email
  const email = data.guardian_email.toLowerCase().trim();
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    // User exists - create guardian link directly
    const { data: guardian, error: guardianErr } = await admin
      .from("guardians")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: existingUser.id,
          student_id: studentId,
          relationship: data.relationship || "other",
          is_primary: data.is_primary === "true",
          is_emergency_contact: data.is_emergency_contact === "true",
          pickup_authorized: data.pickup_authorized !== "false",
          phone: data.phone || null,
          media_consent: false,
          directory_consent: false,
        },
        { onConflict: "tenant_id,user_id,student_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (guardianErr || !guardian) {
      return {
        entity_id: null,
        error: guardianErr?.message ?? "Failed to create guardian link",
      };
    }

    // Ensure tenant membership with Parent role
    const { data: parentRole } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", "Parent")
      .is("deleted_at", null)
      .single();

    if (parentRole) {
      await admin.from("tenant_users").upsert(
        {
          tenant_id: tenantId,
          user_id: existingUser.id,
          role_id: parentRole.id,
        },
        { onConflict: "tenant_id,user_id", ignoreDuplicates: true }
      );
    }

    return { entity_id: guardian.id, error: null };
  }

  // User doesn't exist - create a parent_invitation so they can be
  // onboarded later via the mass invite flow or individual invite.
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry for import-generated invites

  const { data: invite, error: inviteErr } = await admin
    .from("parent_invitations")
    .upsert(
      {
        tenant_id: tenantId,
        email,
        student_id: studentId,
        invited_by: (await admin.auth.getUser()).data.user?.id ?? tenantId, // fallback
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "tenant_id,email,student_id", ignoreDuplicates: true }
    )
    .select("id")
    .single();

  if (inviteErr || !invite) {
    return {
      entity_id: null,
      error: `No account for "${email}". Invitation created but guardian link deferred until they accept. ${inviteErr?.message ?? ""}`.trim(),
    };
  }

  // Return the invite ID - not a guardian ID, but tracked for rollback
  return {
    entity_id: invite.id,
    error: null,
  };
}

/**
 * Insert an emergency contact record.
 */
async function insertEmergencyContact(
  client: SupabaseClient | AdminClient,
  tenantId: string,
  data: Record<string, string>
): Promise<InsertResult> {
  const studentId = await findStudentByName(client, tenantId, data.student_first_name, data.student_last_name);
  if (!studentId) {
    return {
      entity_id: null,
      error: `Student "${data.student_first_name} ${data.student_last_name}" not found`,
    };
  }

  const { data: contact, error: contactErr } = await client
    .from("emergency_contacts")
    .insert({
      tenant_id: tenantId,
      student_id: studentId,
      name: data.contact_name,
      relationship: data.relationship,
      phone_primary: data.phone_primary,
      phone_secondary: data.phone_secondary || null,
      email: data.email || null,
      priority_order: parseInt(data.priority_order || "1", 10),
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (contactErr || !contact) {
    return {
      entity_id: null,
      error: contactErr?.message ?? "Failed to insert emergency contact",
    };
  }

  return { entity_id: contact.id, error: null };
}

/**
 * Insert a medical condition record.
 */
async function insertMedicalCondition(
  client: SupabaseClient | AdminClient,
  tenantId: string,
  data: Record<string, string>
): Promise<InsertResult> {
  const studentId = await findStudentByName(client, tenantId, data.student_first_name, data.student_last_name);
  if (!studentId) {
    return {
      entity_id: null,
      error: `Student "${data.student_first_name} ${data.student_last_name}" not found`,
    };
  }

  const { data: condition, error: condErr } = await client
    .from("medical_conditions")
    .insert({
      tenant_id: tenantId,
      student_id: studentId,
      condition_type: data.condition_type,
      condition_name: data.condition_name,
      severity: data.severity,
      description: data.description || null,
      action_plan: data.action_plan || null,
      requires_medication: data.requires_medication === "true",
      medication_name: data.medication_name || null,
      medication_location: data.medication_location || null,
    })
    .select("id")
    .single();

  if (condErr || !condition) {
    return {
      entity_id: null,
      error: condErr?.message ?? "Failed to insert medical condition",
    };
  }

  return { entity_id: condition.id, error: null };
}

/**
 * Insert a staff member using admin client.
 * WHY admin client: We need to invite users via Supabase Auth admin API
 * to create their accounts. The old code errored when no account existed.
 */
async function insertStaff(
  admin: AdminClient,
  tenantId: string,
  data: Record<string, string>
): Promise<InsertResult> {
  // Find the role
  const { data: role } = await admin
    .from("roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", data.role)
    .is("deleted_at", null)
    .single();

  if (!role) {
    return { entity_id: null, error: `Role "${data.role}" not found` };
  }

  const email = data.email.toLowerCase().trim();

  // Check if user already exists
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;

    // Check if already a member of this tenant
    const { data: existingMembership } = await admin
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingMembership) {
      return {
        entity_id: existingMembership.id,
        error: null, // Already a member - treat as success, not error
      };
    }
  } else {
    // Create new auth user via invite email
    const { data: newUser, error: createErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      });

    if (createErr || !newUser?.user) {
      return {
        entity_id: null,
        error: createErr?.message ?? "Failed to create user account",
      };
    }

    userId = newUser.user.id;

    // Ensure users table row
    await admin.from("users").upsert(
      {
        id: userId,
        email,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  // Create tenant membership
  const { data: membership, error: memErr } = await admin
    .from("tenant_users")
    .upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        role_id: role.id,
      },
      { onConflict: "tenant_id,user_id", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (memErr || !membership) {
    return {
      entity_id: null,
      error: memErr?.message ?? "Failed to add staff to school",
    };
  }

  // Set tenant_id in app_metadata for RLS
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId },
  });

  return { entity_id: membership.id, error: null };
}

/**
 * Insert an attendance record using upsert.
 * WHY upsert: The attendance_records table has UNIQUE(tenant_id, student_id, date).
 * Historical imports should overwrite existing records (same as the daily
 * bulkMarkAttendance action). This is idempotent - re-importing the same CSV
 * updates rather than duplicates.
 */
async function insertAttendance(
  client: SupabaseClient | AdminClient,
  tenantId: string,
  recordedBy: string,
  data: Record<string, string>
): Promise<InsertResult> {
  // Find the student
  const studentId = await findStudentByName(
    client,
    tenantId,
    data.student_first_name,
    data.student_last_name
  );
  if (!studentId) {
    return {
      entity_id: null,
      error: `Student "${data.student_first_name} ${data.student_last_name}" not found`,
    };
  }

  // Resolve class if provided (optional)
  let classId: string | null = null;
  if (data.class_name) {
    const { data: cls } = await client
      .from("classes")
      .select("id")
      .ilike("name", data.class_name.trim())
      .is("deleted_at", null)
      .limit(1)
      .single();
    classId = cls?.id ?? null;
  }

  // Parse check-in/check-out times to timestamps
  const checkInAt = parseTimeToTimestamp(data.date, data.check_in_time);
  const checkOutAt = parseTimeToTimestamp(data.date, data.check_out_time);

  // Upsert the attendance record (same pattern as bulkMarkAttendance)
  const { data: record, error: attErr } = await client
    .from("attendance_records")
    .upsert(
      {
        tenant_id: tenantId,
        student_id: studentId,
        class_id: classId,
        date: data.date,
        status: data.status,
        check_in_at: checkInAt,
        check_out_at: checkOutAt,
        notes: data.notes || null,
        recorded_by: recordedBy,
        deleted_at: null, // un-soft-delete if re-importing
      },
      { onConflict: "tenant_id,student_id,date" }
    )
    .select("id")
    .single();

  if (attErr || !record) {
    return {
      entity_id: null,
      error: attErr?.message ?? "Failed to insert attendance record",
    };
  }

  return { entity_id: record.id, error: null };
}

// ============================================================
// Shared Helper Functions
// ============================================================

/**
 * Find a student by first + last name within the current tenant.
 */
async function findStudentByName(
  client: SupabaseClient | AdminClient,
  tenantId: string,
  firstName: string,
  lastName: string
): Promise<string | null> {
  const { data } = await client
    .from("students")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("first_name", firstName.trim())
    .ilike("last_name", lastName.trim())
    .is("deleted_at", null)
    .limit(1)
    .single();

  return data?.id ?? null;
}

/**
 * Find an existing class by name, or create it if it doesn't exist.
 */
async function resolveOrCreateClass(
  client: SupabaseClient | AdminClient,
  tenantId: string,
  className: string
): Promise<string | null> {
  const { data: existing } = await client
    .from("classes")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", className.trim())
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await client
    .from("classes")
    .insert({
      tenant_id: tenantId,
      name: className.trim(),
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

/**
 * Convert a time string + date into an ISO timestamp.
 * Accepts HH:MM, HH:MM AM/PM, or just hour number.
 */
function parseTimeToTimestamp(
  date: string,
  time: string | undefined
): string | null {
  if (!time || time.trim() === "") return null;

  const trimmed = time.trim();

  // HH:MM (24-hour)
  let match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  // HH:MM AM/PM
  match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toLowerCase();
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  // Just a number (hour)
  match = trimmed.match(/^(\d{1,2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    if (hours >= 0 && hours < 24) {
      return `${date}T${String(hours).padStart(2, "0")}:00:00`;
    }
  }

  return null;
}

/**
 * Generate a URL-safe random token.
 */
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ============================================================
// 4. Fetch Import History
// ============================================================

export async function getImportHistory(
  limit: number = 20
): Promise<ActionResponse<ImportJob[]>> {
  const context = await requirePermission(Permissions.MANAGE_STUDENTS);
  if (!context) return failure("Unauthorized", "UNAUTHORIZED");

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return failure(error.message, "DB_ERROR");

  return success((data ?? []) as ImportJob[]);
}

// ============================================================
// 5. Rollback an Import
// ============================================================

export async function rollbackImport(
  jobId: string
): Promise<ActionResponse<{ rolled_back_count: number }>> {
  const context = await requirePermission(Permissions.MANAGE_STUDENTS);
  if (!context) return failure("Unauthorized", "UNAUTHORIZED");

  const supabase = await createSupabaseServerClient();

  // Get the job
  const { data: job, error: jobErr } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return failure("Import job not found", "NOT_FOUND");
  }

  if (!["completed", "completed_with_errors"].includes(job.status)) {
    return failure(
      `Cannot rollback an import with status "${job.status}"`,
      "INVALID_STATE"
    );
  }

  // Get all successfully imported records
  const { data: records, error: recErr } = await supabase
    .from("import_job_records")
    .select("entity_id, entity_type")
    .eq("import_job_id", jobId)
    .eq("status", "imported")
    .not("entity_id", "is", null);

  if (recErr) return failure(recErr.message, "DB_ERROR");

  let rolledBack = 0;

  // Soft-delete each created entity
  for (const record of records ?? []) {
    if (!record.entity_id) continue;

    const tableName = getTableName(job.import_type as ImportType);
    if (!tableName) continue;

    const { error: delErr } = await supabase
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", record.entity_id);

    if (!delErr) rolledBack++;
  }

  // Update the job status
  await supabase
    .from("import_jobs")
    .update({ status: "rolled_back" })
    .eq("id", jobId);

  // WHY audit: Import rollbacks are destructive operations that
  // soft-delete many records at once. Schools need to track who
  // rolled back which import and how many records were affected.
  await logAudit({
    context,
    action: AuditActions.IMPORT_ROLLED_BACK,
    entityType: "import_job",
    entityId: jobId,
    metadata: {
      import_type: job.import_type,
      rolled_back_count: rolledBack,
    },
  });

  return success({ rolled_back_count: rolledBack });
}

/**
 * Map import types to their primary database table names.
 */
function getTableName(importType: ImportType): string | null {
  const map: Record<ImportType, string> = {
    students: "students",
    guardians: "guardians",
    emergency_contacts: "emergency_contacts",
    medical_conditions: "medical_conditions",
    staff: "tenant_users",
    attendance: "attendance_records",
  };
  return map[importType] ?? null;
}