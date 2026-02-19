// src/lib/actions/consent.ts
//
// ============================================================
// WattleOS V2 - Consent Check Server Actions
// ============================================================
// Queries guardian consent flags for students. Used by the
// observation capture form to warn when publishing photos of
// students without media consent.
//
// WHY separate file: Consent logic cuts across SIS (guardians)
// and Pedagogy (observations). Keeping it isolated prevents
// circular dependencies between action modules.
// ============================================================

"use server";

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";

/**
 * For a list of student IDs, returns a record mapping each
 * student ID to whether ANY of their guardians has granted
 * media_consent. If a student has no guardians, they are
 * considered as NOT having consent (safe default).
 */
export async function getStudentMediaConsentMap(
  studentIds: string[],
): Promise<ActionResponse<Record<string, boolean>>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (studentIds.length === 0) {
      return success({});
    }

    const { data, error } = await supabase
      .from("guardians")
      .select("student_id, media_consent")
      .in("student_id", studentIds)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, "DB_ERROR");
    }

    // Build map: studentId → true if ANY guardian has media_consent = true
    const consentMap: Record<string, boolean> = {};

    // Default all to false
    for (const id of studentIds) {
      consentMap[id] = false;
    }

    // Set to true if any guardian consented
    for (const row of data ?? []) {
      const guardianRow = row as { student_id: string; media_consent: boolean };
      if (guardianRow.media_consent) {
        consentMap[guardianRow.student_id] = true;
      }
    }

    return success(consentMap);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check media consent";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
