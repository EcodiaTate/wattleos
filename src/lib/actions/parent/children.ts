'use server';

// src/lib/actions/parent/children.ts
//
// ============================================================
// WattleOS V2 - Parent Portal: Children Actions
// ============================================================
// Fetches children and overview data for the logged-in parent.
// Authorization is via guardian relationship, not permissions.
//
// WHY guardian-based auth: Parents don't have staff permissions.
// The is_guardian_of() RLS function handles DB-level security,
// and we double-check at the application layer for defense in
// depth.
// ============================================================

"use server";

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface ParentChild {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  photoUrl: string | null;
  dob: string | null;
  className: string | null;
  classId: string | null;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
}

export interface ChildOverview {
  child: ParentChild;
  attendance: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    lastRecordDate: string | null;
  };
  recentObservations: Array<{
    id: string;
    content: string | null;
    authorName: string;
    createdAt: string;
    mediaCount: number;
  }>;
  mastery: {
    total: number;
    mastered: number;
    practicing: number;
    presented: number;
    percentMastered: number;
  };
  publishedReportCount: number;
}

// ============================================================
// requireGuardian - verifies user is a guardian in this tenant
// ============================================================

export async function getMyGuardianRecords(): Promise<
  ActionResponse<
    Array<{
      guardianId: string;
      studentId: string;
      relationship: string;
      isPrimary: boolean;
      mediaConsent: boolean;
      directoryConsent: boolean;
      phone: string | null;
    }>
  >
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("guardians")
      .select(
        "id, student_id, relationship, is_primary, media_consent, directory_consent, phone",
      )
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: "QUERY_ERROR" },
      };
    }

    return {
      data: (data ?? []).map((g) => ({
        guardianId: g.id,
        studentId: g.student_id,
        relationship: g.relationship,
        isPrimary: g.is_primary,
        mediaConsent: g.media_consent,
        directoryConsent: g.directory_consent,
        phone: g.phone,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}

// ============================================================
// getMyChildren - lists all children for the logged-in parent
// ============================================================

export async function getMyChildren(): Promise<ActionResponse<ParentChild[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Fetch guardian records with student + current enrollment/class
    const { data, error } = await supabase
      .from("guardians")
      .select(
        `
        id,
        relationship,
        is_primary,
        student:students!inner(
          id,
          first_name,
          last_name,
          preferred_name,
          photo_url,
          dob
        )
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: "QUERY_ERROR" },
      };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Get current class for each student via active enrollments
    const studentIds = data.map(
      (g) => (g.student as unknown as { id: string }).id,
    );

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        `
        student_id,
        class:classes(id, name)
      `,
      )
      .eq("tenant_id", context.tenant.id)
      .in("student_id", studentIds)
      .eq("status", "active")
      .is("deleted_at", null);

    // Build class lookup
    const classLookup = new Map<string, { id: string; name: string }>();
    for (const enrollment of enrollments ?? []) {
      const cls = enrollment.class as unknown as {
        id: string;
        name: string;
      } | null;
      if (cls) {
        classLookup.set(enrollment.student_id, cls);
      }
    }

    const children: ParentChild[] = data.map((g) => {
      const student = g.student as unknown as {
        id: string;
        first_name: string;
        last_name: string;
        preferred_name: string | null;
        photo_url: string | null;
        dob: string | null;
      };
      const cls = classLookup.get(student.id);

      return {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        preferredName: student.preferred_name,
        photoUrl: student.photo_url,
        dob: student.dob,
        className: cls?.name ?? null,
        classId: cls?.id ?? null,
        guardianId: g.id,
        relationship: g.relationship,
        isPrimary: g.is_primary,
      };
    });

    return { data: children, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}

// ============================================================
// getChildOverview - dashboard card data for a single child
// ============================================================

export async function getChildOverview(
  studentId: string,
): Promise<ActionResponse<ChildOverview>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // 1. Verify guardian relationship
    const { data: guardianRecord } = await supabase
      .from("guardians")
      .select("id, relationship, is_primary")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .single();

    if (!guardianRecord) {
      return {
        data: null,
        error: {
          message: "Not authorized to view this student",
          code: "FORBIDDEN",
        },
      };
    }

    // 2. Fetch child info (reuse getMyChildren shape)
    const { data: studentData } = await supabase
      .from("students")
      .select("id, first_name, last_name, preferred_name, photo_url, dob")
      .eq("id", studentId)
      .is("deleted_at", null)
      .single();

    if (!studentData) {
      return {
        data: null,
        error: { message: "Student not found", code: "NOT_FOUND" },
      };
    }

    // Get current class
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("class:classes(id, name)")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(1)
      .single();

    const cls = enrollment?.class as unknown as {
      id: string;
      name: string;
    } | null;

    const child: ParentChild = {
      id: studentData.id,
      firstName: studentData.first_name,
      lastName: studentData.last_name,
      preferredName: studentData.preferred_name,
      photoUrl: studentData.photo_url,
      dob: studentData.dob,
      className: cls?.name ?? null,
      classId: cls?.id ?? null,
      guardianId: guardianRecord.id,
      relationship: guardianRecord.relationship,
      isPrimary: guardianRecord.is_primary,
    };

    // 3. Attendance summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("status, date")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .is("deleted_at", null)
      .order("date", { ascending: false });

    const records = attendanceRecords ?? [];
    const totalDays = records.length;
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const attendanceRate =
      totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    const attendance = {
      totalDays,
      present,
      absent,
      late,
      attendanceRate,
      lastRecordDate: records[0]?.date ?? null,
    };

    // 4. Recent published observations (last 5)
    const { data: obsStudentLinks } = await supabase
      .from("observation_students")
      .select("observation_id")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId);

    const obsIds = (obsStudentLinks ?? []).map((l) => l.observation_id);

    let recentObservations: ChildOverview["recentObservations"] = [];
    if (obsIds.length > 0) {
      const { data: observations } = await supabase
        .from("observations")
        .select(
          `
          id,
          content,
          created_at,
          author:users!observations_author_id_fkey(first_name, last_name)
        `,
        )
        .eq("tenant_id", context.tenant.id)
        .eq("status", "published")
        .in("id", obsIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get media counts
      const foundObsIds = (observations ?? []).map((o) => o.id);
      const { data: mediaCounts } =
        foundObsIds.length > 0
          ? await supabase
              .from("observation_media")
              .select("observation_id")
              .in("observation_id", foundObsIds)
              .is("deleted_at", null)
          : { data: [] };

      const mediaCountMap = new Map<string, number>();
      for (const m of mediaCounts ?? []) {
        mediaCountMap.set(
          m.observation_id,
          (mediaCountMap.get(m.observation_id) ?? 0) + 1,
        );
      }

      recentObservations = (observations ?? []).map((o) => {
        const author = o.author as unknown as {
          first_name: string | null;
          last_name: string | null;
        } | null;
        return {
          id: o.id,
          content: o.content,
          authorName:
            [author?.first_name, author?.last_name].filter(Boolean).join(" ") ||
            "Guide",
          createdAt: o.created_at,
          mediaCount: mediaCountMap.get(o.id) ?? 0,
        };
      });
    }

    // 5. Mastery snapshot (all instances combined)
    const { data: masteryRecords } = await supabase
      .from("student_mastery")
      .select("status")
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .is("deleted_at", null);

    const masteryData = masteryRecords ?? [];
    const total = masteryData.length;
    const mastered = masteryData.filter((m) => m.status === "mastered").length;
    const practicing = masteryData.filter(
      (m) => m.status === "practicing",
    ).length;
    const presented = masteryData.filter(
      (m) => m.status === "presented",
    ).length;
    const percentMastered =
      total > 0 ? Math.round((mastered / total) * 100) : 0;

    const mastery = { total, mastered, practicing, presented, percentMastered };

    // 6. Published report count
    const { count: publishedReportCount } = await supabase
      .from("student_reports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("student_id", studentId)
      .eq("status", "published")
      .is("deleted_at", null);

    return {
      data: {
        child,
        attendance,
        recentObservations,
        mastery,
        publishedReportCount: publishedReportCount ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
    };
  }
}

// ============================================================
// isGuardianOf - lightweight check for route guards
// ============================================================

export async function isGuardianOf(studentId: string): Promise<boolean> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data } = await supabase
      .from("guardians")
      .select("id")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .limit(1)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

// ============================================================
// isParentUser - checks if user has guardian records (is a parent)
// ============================================================

export async function isParentUser(): Promise<boolean> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { count } = await supabase
      .from("guardians")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .is("deleted_at", null);

    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
