"use server";

// src/lib/actions/ratios.ts
//
// ============================================================
// WattleOS V2 - Real-time Ratio Monitoring (Reg 123)
// ============================================================
// Educator on-floor sign-in/out, per-room ratio computation,
// breach detection, and historical ratio logging.
//
// Ratios (NQF national minimum):
//   0–24 months: 1:4
//   24–36 months: 1:5
//   3 years to school age: 1:11
//   School age (OSHC): 1:15
//   Mixed-age rooms: split by bracket, sum required per group
// ============================================================

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { ActionResponse, failure, success } from "@/types/api";
import type {
  FloorSignIn,
  RatioLog,
  LiveRatioState,
  TenantContext,
} from "@/types/domain";
import { logAudit, AuditActions } from "@/lib/utils/audit";
import {
  toggleFloorSignInSchema,
  acknowledgeBreachSchema,
  getRatioHistorySchema,
  getBreachHistorySchema,
} from "@/lib/validations/ratios";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// NQF Ratio Brackets
// ============================================================

const RATIO_BRACKETS = [
  { label: "0–24 months", maxMonths: 24, ratio: 4 },
  { label: "24–36 months", maxMonths: 36, ratio: 5 },
  { label: "3 years – school age", maxMonths: 60, ratio: 11 },
  { label: "School age (OSHC)", maxMonths: Infinity, ratio: 15 },
] as const;

interface BracketBreakdown {
  bracket_label: string;
  max_months: number;
  ratio: number;
  child_count: number;
  educators_needed: number;
}

interface RatioResult {
  required_educators: number;
  required_ratio_denominator: number;
  youngest_child_months: number | null;
  bracket_breakdown: BracketBreakdown[];
}

// ============================================================
// Pure Helpers
// ============================================================

/**
 * Compute required educators using NQF mixed-age bracket rules.
 * Splits children into age brackets and sums `Math.ceil(count / ratio)` per bracket.
 */
function computeRequiredEducators(childAgesInMonths: number[]): RatioResult {
  if (childAgesInMonths.length === 0) {
    return {
      required_educators: 0,
      required_ratio_denominator: 0,
      youngest_child_months: null,
      bracket_breakdown: [],
    };
  }

  const youngest = Math.min(...childAgesInMonths);
  let totalRequired = 0;
  const breakdown: BracketBreakdown[] = [];

  let prevMax = 0;
  for (const bracket of RATIO_BRACKETS) {
    const count = childAgesInMonths.filter(
      (age) => age >= prevMax && age < bracket.maxMonths,
    ).length;
    const needed = count > 0 ? Math.ceil(count / bracket.ratio) : 0;
    totalRequired += needed;
    breakdown.push({
      bracket_label: bracket.label,
      max_months: bracket.maxMonths,
      ratio: bracket.ratio,
      child_count: count,
      educators_needed: needed,
    });
    prevMax = bracket.maxMonths;
  }

  // Denominator is the ratio of the youngest bracket that has children
  const activeWithChildren = breakdown.filter((b) => b.child_count > 0);
  const smallestActive = activeWithChildren[0];

  return {
    required_educators: totalRequired,
    required_ratio_denominator: smallestActive?.ratio ?? 0,
    youngest_child_months: youngest,
    bracket_breakdown: breakdown,
  };
}

/** Calculate age in whole months from DOB string to today. */
function ageInMonths(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

/** Today's date in YYYY-MM-DD format (in local timezone). */
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ============================================================
// Internal: Compute and Log Ratio
// ============================================================

/**
 * Recomputes the live ratio for a given class, inserts an append-only
 * ratio_log entry, and returns the LiveRatioState. Called after every
 * floor sign-in/out toggle.
 */
async function computeAndLogRatio(
  classId: string,
  context: TenantContext,
  supabase: SupabaseClient,
): Promise<LiveRatioState> {
  const tenantId = context.tenant.id;
  // 1. Get class name
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .single();

  const className = cls?.name ?? "Unknown";

  // 2. Count educators currently on floor
  const { data: floorRows } = await supabase
    .from("floor_sign_ins")
    .select("user_id, users!inner(id, first_name, last_name)")
    .eq("tenant_id", tenantId)
    .eq("class_id", classId)
    .eq("is_active", true);

  const educators = (floorRows ?? []).map((row) => {
    const rawU = row.users as unknown as
      | { id: string; first_name: string | null; last_name: string | null }
      | Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
        }>;
    const u = Array.isArray(rawU) ? rawU[0] : rawU;
    return {
      id: u.id,
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
    };
  });

  const educatorsOnFloor = educators.length;

  // 3. Get today's present children for this class
  const today = todayDateStr();

  // Get enrolled student IDs for this class
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("status", "active")
    .is("deleted_at", null);

  const enrolledIds = (enrollments ?? []).map((e) => e.student_id);

  let childAges: number[] = [];

  if (enrolledIds.length > 0) {
    // Get attendance records for today - present + checked in + not checked out
    const { data: attendanceRows } = await supabase
      .from("attendance_records")
      .select("student_id")
      .eq("date", today)
      .in("student_id", enrolledIds)
      .in("status", ["present", "late", "half_day"])
      .not("check_in_at", "is", null)
      .is("check_out_at", null)
      .is("deleted_at", null);

    const presentIds = (attendanceRows ?? []).map((a) => a.student_id);

    if (presentIds.length > 0) {
      // Get DOBs for present students
      const { data: students } = await supabase
        .from("students")
        .select("id, dob")
        .in("id", presentIds);

      childAges = (students ?? [])
        .filter((s) => s.dob)
        .map((s) => ageInMonths(s.dob!));
    }
  }

  const childrenPresent = childAges.length;

  // 4. Compute ratio
  const ratioResult = computeRequiredEducators(childAges);

  const isCompliant =
    childrenPresent === 0 || educatorsOnFloor >= ratioResult.required_educators;

  // 5. Log to ratio_logs (append-only)
  await supabase.from("ratio_logs").insert({
    tenant_id: tenantId,
    class_id: classId,
    children_present: childrenPresent,
    educators_on_floor: educatorsOnFloor,
    required_ratio_denominator: ratioResult.required_ratio_denominator,
    youngest_child_months: ratioResult.youngest_child_months,
    is_breached: !isCompliant,
  });

  // 6. Audit log if breached
  if (!isCompliant) {
    logAudit({
      context,
      action: AuditActions.RATIO_BREACH_DETECTED,
      entityType: "ratio_log",
      entityId: classId,
      metadata: {
        class_name: className,
        children_present: childrenPresent,
        educators_on_floor: educatorsOnFloor,
        required_educators: ratioResult.required_educators,
      },
    });
  }

  return {
    class_id: classId,
    class_name: className,
    children_present: childrenPresent,
    educators_on_floor: educatorsOnFloor,
    required_ratio_denominator: ratioResult.required_ratio_denominator,
    is_compliant: isCompliant,
    educators_on_floor_details: educators,
  };
}

// ============================================================
// Exported Server Actions
// ============================================================

// ────────────────────────────────────────────────────────────
// Toggle Floor Sign-In / Sign-Out
// ────────────────────────────────────────────────────────────

export interface ToggleFloorResult {
  signed_in: boolean;
  ratio_state: LiveRatioState;
}

export async function toggleFloorSignIn(input: {
  class_id: string;
}): Promise<ActionResponse<ToggleFloorResult>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_FLOOR_SIGNIN);
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = toggleFloorSignInSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { class_id } = parsed.data;
    const userId = context.user.id;

    // Check for existing active sign-in for this user + class
    const { data: existing } = await supabase
      .from("floor_sign_ins")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("class_id", class_id)
      .eq("is_active", true)
      .maybeSingle();

    let signedIn: boolean;

    if (existing) {
      // Sign out - set is_active false, stamp signed_out_at
      await supabase
        .from("floor_sign_ins")
        .update({
          is_active: false,
          signed_out_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      signedIn = false;

      logAudit({
        context,
        action: AuditActions.FLOOR_SIGN_OUT,
        entityType: "floor_sign_in",
        entityId: existing.id,
        metadata: { class_id },
      });
    } else {
      // Sign in - insert new record
      const { data: newRow } = await supabase
        .from("floor_sign_ins")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          class_id,
          is_active: true,
        })
        .select("id")
        .single();

      signedIn = true;

      logAudit({
        context,
        action: AuditActions.FLOOR_SIGN_IN,
        entityType: "floor_sign_in",
        entityId: newRow?.id ?? class_id,
        metadata: { class_id },
      });
    }

    // Recompute ratio after toggle
    const ratioState = await computeAndLogRatio(class_id, context, supabase);

    return success({ signed_in: signedIn, ratio_state: ratioState });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to toggle floor sign-in",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Get Current Ratios (All Active Classes)
// ────────────────────────────────────────────────────────────

export async function getCurrentRatios(): Promise<
  ActionResponse<LiveRatioState[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    // Get all active classes
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (!classes?.length) {
      return success([]);
    }

    const today = todayDateStr();
    const classIds = classes.map((c) => c.id);

    // Batch fetch: floor sign-ins for all classes
    const { data: allFloorRows } = await supabase
      .from("floor_sign_ins")
      .select("class_id, user_id, users!inner(id, first_name, last_name)")
      .eq("tenant_id", tenantId)
      .in("class_id", classIds)
      .eq("is_active", true);

    // Batch fetch: enrollments for all classes
    const { data: allEnrollments } = await supabase
      .from("enrollments")
      .select("class_id, student_id")
      .in("class_id", classIds)
      .eq("status", "active")
      .is("deleted_at", null);

    const enrolledByClass = new Map<string, string[]>();
    for (const e of allEnrollments ?? []) {
      const arr = enrolledByClass.get(e.class_id) ?? [];
      arr.push(e.student_id);
      enrolledByClass.set(e.class_id, arr);
    }

    // Collect all enrolled student IDs across classes
    const allStudentIds = [
      ...new Set((allEnrollments ?? []).map((e) => e.student_id)),
    ];

    // Batch fetch: today's attendance for all enrolled students
    let attendanceByStudent = new Map<string, boolean>();
    if (allStudentIds.length > 0) {
      const { data: attendanceRows } = await supabase
        .from("attendance_records")
        .select("student_id")
        .eq("date", today)
        .in("student_id", allStudentIds)
        .in("status", ["present", "late", "half_day"])
        .not("check_in_at", "is", null)
        .is("check_out_at", null)
        .is("deleted_at", null);

      attendanceByStudent = new Map(
        (attendanceRows ?? []).map((a) => [a.student_id, true]),
      );
    }

    // Batch fetch: DOBs for all enrolled students
    let dobMap = new Map<string, string | null>();
    if (allStudentIds.length > 0) {
      const { data: students } = await supabase
        .from("students")
        .select("id, dob")
        .in("id", allStudentIds);

      dobMap = new Map((students ?? []).map((s) => [s.id, s.dob]));
    }

    // Build per-class ratio state
    const results: LiveRatioState[] = classes.map((cls) => {
      // Educators on floor for this class
      const classFloorRows = (allFloorRows ?? []).filter(
        (r) => r.class_id === cls.id,
      );
      const educators = classFloorRows.map((row) => {
        const rawU = row.users as unknown as
          | { id: string; first_name: string | null; last_name: string | null }
          | Array<{
              id: string;
              first_name: string | null;
              last_name: string | null;
            }>;
        const u = Array.isArray(rawU) ? rawU[0] : rawU;
        return {
          id: u.id,
          first_name: u.first_name ?? "",
          last_name: u.last_name ?? "",
        };
      });

      // Present children for this class
      const enrolledIds = enrolledByClass.get(cls.id) ?? [];
      const presentIds = enrolledIds.filter((id) =>
        attendanceByStudent.has(id),
      );
      const childAges = presentIds
        .map((id) => {
          const dob = dobMap.get(id);
          return dob ? ageInMonths(dob) : null;
        })
        .filter((a): a is number => a !== null);

      const ratioResult = computeRequiredEducators(childAges);
      const childrenPresent = childAges.length;
      const educatorsOnFloor = educators.length;

      const isCompliant =
        childrenPresent === 0 ||
        educatorsOnFloor >= ratioResult.required_educators;

      return {
        class_id: cls.id,
        class_name: cls.name,
        children_present: childrenPresent,
        educators_on_floor: educatorsOnFloor,
        required_ratio_denominator: ratioResult.required_ratio_denominator,
        is_compliant: isCompliant,
        educators_on_floor_details: educators,
      };
    });

    return success(results);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get current ratios",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Get Single Class Ratio
// ────────────────────────────────────────────────────────────

export async function getClassRatio(
  classId: string,
): Promise<ActionResponse<LiveRatioState>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const ratioState = await computeAndLogRatio(classId, context, supabase);

    return success(ratioState);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get class ratio",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Acknowledge a Ratio Breach
// ────────────────────────────────────────────────────────────

export async function acknowledgeRatioBreach(input: {
  log_id: string;
}): Promise<ActionResponse<RatioLog>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_FLOOR_SIGNIN);
    const supabase = await createSupabaseServerClient();

    const parsed = acknowledgeBreachSchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { log_id } = parsed.data;

    const { data, error } = await supabase
      .from("ratio_logs")
      .update({
        breach_acknowledged_by: context.user.id,
        breach_acknowledged_at: new Date().toISOString(),
      })
      .eq("id", log_id)
      .eq("tenant_id", context.tenant.id)
      .eq("is_breached", true)
      .select("*")
      .single();

    if (error || !data) {
      return failure(
        "Breach log not found or already acknowledged",
        "NOT_FOUND",
      );
    }

    logAudit({
      context,
      action: AuditActions.RATIO_BREACH_ACKNOWLEDGED,
      entityType: "ratio_log",
      entityId: log_id,
      metadata: { class_id: data.class_id },
    });

    return success(data as RatioLog);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to acknowledge breach",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Get Ratio History (Per Class)
// ────────────────────────────────────────────────────────────

export async function getRatioHistory(input: {
  class_id: string;
  from_date: string;
  to_date: string;
}): Promise<ActionResponse<RatioLog[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = getRatioHistorySchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { class_id, from_date, to_date } = parsed.data;

    const { data, error } = await supabase
      .from("ratio_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("class_id", class_id)
      .gte("logged_at", `${from_date}T00:00:00`)
      .lte("logged_at", `${to_date}T23:59:59`)
      .order("logged_at", { ascending: false })
      .limit(200);

    if (error) {
      return failure(error.message, "NOT_FOUND");
    }

    return success((data ?? []) as RatioLog[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get ratio history",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Get Breach History (Cross-Class)
// ────────────────────────────────────────────────────────────

export interface BreachHistoryEntry extends RatioLog {
  class_name: string;
}

export async function getBreachHistory(input: {
  from_date?: string | null;
  to_date?: string | null;
}): Promise<ActionResponse<BreachHistoryEntry[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const parsed = getBreachHistorySchema.safeParse(input);
    if (!parsed.success) {
      return failure(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { from_date, to_date } = parsed.data;

    let query = supabase
      .from("ratio_logs")
      .select("*, classes!inner(name)")
      .eq("tenant_id", tenantId)
      .eq("is_breached", true)
      .order("logged_at", { ascending: false })
      .limit(100);

    if (from_date) {
      query = query.gte("logged_at", `${from_date}T00:00:00`);
    }
    if (to_date) {
      query = query.lte("logged_at", `${to_date}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, "NOT_FOUND");
    }

    const entries: BreachHistoryEntry[] = (data ?? []).map((row) => {
      const rawC = row.classes as unknown as
        | { name: string }
        | Array<{ name: string }>;
      const c = Array.isArray(rawC) ? rawC[0] : rawC;
      const { classes: _classes, ...rest } = row;
      return {
        ...rest,
        class_name: c.name,
      } as BreachHistoryEntry;
    });

    return success(entries);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get breach history",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Get Ratio Breakdown (Age-Group + Buffer, No Log Insert)
// ────────────────────────────────────────────────────────────

export interface AgeGroupBreakdownRow {
  bracket_label: string;
  child_count: number;
  required_educators: number;
  ratio: number;
}

export interface RatioBreakdown {
  class_id: string;
  class_name: string;
  educators_on_floor: number;
  required_educators: number;
  buffer_educators: number;
  age_group_breakdown: AgeGroupBreakdownRow[];
}

export async function getRatioBreakdown(
  classId: string,
): Promise<ActionResponse<RatioBreakdown>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();
    const tenantId = context.tenant.id;

    const { data: cls } = await supabase
      .from("classes")
      .select("id, name")
      .eq("id", classId)
      .eq("tenant_id", tenantId)
      .single();

    if (!cls) return failure("Class not found", "NOT_FOUND");

    const { data: floorRows } = await supabase
      .from("floor_sign_ins")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .eq("is_active", true);

    const educatorsOnFloor = (floorRows ?? []).length;

    const today = todayDateStr();

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("class_id", classId)
      .eq("status", "active")
      .is("deleted_at", null);

    const enrolledIds = (enrollments ?? []).map((e) => e.student_id);
    let childAges: number[] = [];

    if (enrolledIds.length > 0) {
      const { data: attendanceRows } = await supabase
        .from("attendance_records")
        .select("student_id")
        .eq("date", today)
        .in("student_id", enrolledIds)
        .in("status", ["present", "late", "half_day"])
        .not("check_in_at", "is", null)
        .is("check_out_at", null)
        .is("deleted_at", null);

      const presentIds = (attendanceRows ?? []).map((a) => a.student_id);

      if (presentIds.length > 0) {
        const { data: students } = await supabase
          .from("students")
          .select("id, dob")
          .in("id", presentIds);

        childAges = (students ?? [])
          .filter((s) => s.dob)
          .map((s) => ageInMonths(s.dob!));
      }
    }

    const ratioResult = computeRequiredEducators(childAges);

    const ageGroupBreakdown: AgeGroupBreakdownRow[] =
      ratioResult.bracket_breakdown
        .filter((b) => b.child_count > 0)
        .map((b) => ({
          bracket_label: b.bracket_label,
          child_count: b.child_count,
          required_educators: b.educators_needed,
          ratio: b.ratio,
        }));

    const buffer = Math.max(
      0,
      educatorsOnFloor - ratioResult.required_educators,
    );

    return success({
      class_id: classId,
      class_name: cls.name,
      educators_on_floor: educatorsOnFloor,
      required_educators: ratioResult.required_educators,
      buffer_educators: buffer,
      age_group_breakdown: ageGroupBreakdown,
    });
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get ratio breakdown",
      "UNAUTHORIZED",
    );
  }
}

// ────────────────────────────────────────────────────────────
// Get User's Active Floor Sign-Ins
// ────────────────────────────────────────────────────────────

export async function getMyFloorSignIns(): Promise<
  ActionResponse<FloorSignIn[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("floor_sign_ins")
      .select("*")
      .eq("tenant_id", context.tenant.id)
      .eq("user_id", context.user.id)
      .eq("is_active", true);

    if (error) {
      return failure(error.message, "NOT_FOUND");
    }

    return success((data ?? []) as FloorSignIn[]);
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "Failed to get floor sign-ins",
      "UNAUTHORIZED",
    );
  }
}

