// src/lib/docs/wattle-tool-handlers.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Tool Handlers (New Read Tools)
// ============================================================
// All new read-only tool handlers live here to keep wattle-tools.ts
// from growing unmanageable. Each handler follows the pattern:
//   1. Parse args
//   2. Resolve names (if applicable)
//   3. Query Supabase via the pre-created client
//   4. Return WattleToolResult with both content + structured
//
// Sensitive tools (medical, custody, emergency contacts) log
// access to audit_logs for compliance.
// ============================================================

import type { WattleToolResult, WattleToolContext } from "./wattle-tools";
import {
  resolveStudentByName,
  resolveClassName,
  getClassNames,
  getTodayDate,
  formatDateForDisplay,
} from "./wattle-tools";

// ============================================================
// get_class_roster
// ============================================================

export async function handleGetClassRoster(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const className = (args.class_name as string) ?? "";

  if (!className.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_class_roster",
      success: false,
      content: "Please specify a class name.",
    };
  }

  const resolvedClass = await resolveClassName(supabase, className);
  if (!resolvedClass) {
    const available = await getClassNames(supabase);
    return {
      tool_call_id: toolCallId,
      tool_name: "get_class_roster",
      success: false,
      content: `No class found matching "${className}". Available: ${available.join(", ") || "none"}.`,
    };
  }

  const { data: enrollments, error } = await supabase
    .from("enrollments")
    .select(
      "student:students(id, first_name, last_name, preferred_name, enrollment_status)",
    )
    .eq("class_id", resolvedClass.id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_class_roster",
      success: false,
      content: `Failed to get roster: ${error.message}`,
    };
  }

  const students = (enrollments ?? [])
    .map((e) => {
      const s = (e as Record<string, unknown>).student as {
        id: string;
        first_name: string;
        last_name: string;
        preferred_name: string | null;
        enrollment_status: string;
      } | null;
      return s;
    })
    .filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  const lines = students.map((s) => {
    const name = s.preferred_name
      ? `${s.first_name} "${s.preferred_name}" ${s.last_name}`
      : `${s.first_name} ${s.last_name}`;
    return `- ${name}`;
  });

  return {
    tool_call_id: toolCallId,
    tool_name: "get_class_roster",
    success: true,
    content: `${resolvedClass.name} roster (${students.length} students):\n${lines.join("\n")}`,
    structured: {
      type: "student_list",
      data: {
        class_name: resolvedClass.name,
        students: students.map((s) => ({
          student_id: s.id,
          display_name: s.preferred_name
            ? `${s.first_name} "${s.preferred_name}" ${s.last_name}`
            : `${s.first_name} ${s.last_name}`,
          enrollment_status: s.enrollment_status,
        })),
      },
    },
  };
}

// ============================================================
// get_student_attendance_history
// ============================================================

export async function handleGetStudentAttendanceHistory(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const days = Math.min(Math.max((args.days as number) ?? 14, 1), 90);

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_attendance_history",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_attendance_history",
      success: true,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_attendance_history",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}": ${matches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}. Please specify which one.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Calculate date range
  const today = getTodayDate();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split("T")[0];

  const { data: records, error } = await supabase
    .from("attendance_records")
    .select("date, status, notes")
    .eq("student_id", student.id)
    .gte("date", startStr)
    .lte("date", today)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_attendance_history",
      success: false,
      content: `Failed to get history: ${error.message}`,
    };
  }

  const entries = (records ?? []).map((r) => ({
    date: r.date as string,
    date_display: formatDateForDisplay(r.date as string),
    status: r.status as "present" | "absent" | "late" | "excused" | "half_day",
    notes: r.notes as string | null,
  }));

  // Summary
  const summary = {
    total_days: entries.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    half_day: 0,
  };
  for (const e of entries) {
    if (e.status in summary) (summary as Record<string, number>)[e.status]++;
  }

  const lines = [`Attendance for ${displayName} over the last ${days} days:`];
  lines.push(
    `Total records: ${entries.length}. Present: ${summary.present}, Absent: ${summary.absent}, Late: ${summary.late}, Excused: ${summary.excused}, Half-day: ${summary.half_day}.`,
  );
  if (entries.length > 0) {
    const recentFive = entries.slice(0, 5);
    lines.push("Recent:");
    for (const e of recentFive) {
      lines.push(
        `  ${e.date_display}: ${e.status}${e.notes ? ` (${e.notes})` : ""}`,
      );
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_student_attendance_history",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "attendance_history",
      data: { student_name: displayName, entries, summary },
    },
  };
}

// ============================================================
// get_absent_students_today
// ============================================================

export async function handleGetAbsentStudentsToday(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();
  const dateDisplay = formatDateForDisplay(today);

  // Get all classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  if (!classes || classes.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_absent_students_today",
      success: true,
      content: "No classes found.",
    };
  }

  const classResults: Array<{
    class_name: string;
    absent: string[];
    unmarked: string[];
    total_students: number;
  }> = [];

  for (const cls of classes) {
    // Get active enrollments
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        "student_id, student:students(id, first_name, last_name, preferred_name)",
      )
      .eq("class_id", cls.id)
      .eq("status", "active")
      .is("deleted_at", null);

    const students = (enrollments ?? [])
      .map((e) => {
        const s = (e as Record<string, unknown>).student as {
          id: string;
          first_name: string;
          last_name: string;
          preferred_name: string | null;
        } | null;
        return s ? { studentId: e.student_id as string, ...s } : null;
      })
      .filter((s): s is NonNullable<typeof s> => !!s);

    if (students.length === 0) continue;

    // Get today's records
    const studentIds = students.map((s) => s.studentId);
    const { data: records } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("date", today)
      .in("student_id", studentIds)
      .is("deleted_at", null);

    const recordMap = new Map(
      (records ?? []).map((r) => [r.student_id as string, r.status as string]),
    );

    const absent: string[] = [];
    const unmarked: string[] = [];

    for (const s of students) {
      const status = recordMap.get(s.studentId);
      const name = (s.preferred_name ?? s.first_name) + " " + s.last_name;
      if (!status) unmarked.push(name);
      else if (status === "absent") absent.push(name);
    }

    if (absent.length > 0 || unmarked.length > 0) {
      classResults.push({
        class_name: cls.name,
        absent,
        unmarked,
        total_students: students.length,
      });
    }
  }

  if (classResults.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_absent_students_today",
      success: true,
      content: `No absences or unmarked students found for ${dateDisplay}.`,
    };
  }

  const lines = [`Absent/unmarked students for ${dateDisplay}:`];
  for (const cr of classResults) {
    lines.push(`\n${cr.class_name}:`);
    if (cr.absent.length > 0) lines.push(`  Absent: ${cr.absent.join(", ")}`);
    if (cr.unmarked.length > 0)
      lines.push(`  Not marked: ${cr.unmarked.join(", ")}`);
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_absent_students_today",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "absent_students",
      data: { date: today, date_display: dateDisplay, classes: classResults },
    },
  };
}

// ============================================================
// get_student_observations
// ============================================================

export async function handleGetStudentObservations(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const limit = Math.min(Math.max((args.limit as number) ?? 5, 1), 20);

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_observations",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_observations",
      success: true,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_observations",
      success: false,
      content: `Found ${matches.length} students. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Get observations linked to this student
  const { data: observationLinks } = await supabase
    .from("observation_students")
    .select("observation_id")
    .eq("student_id", student.id);

  const obsIds = (observationLinks ?? []).map(
    (l) => (l as { observation_id: string }).observation_id,
  );

  if (obsIds.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_observations",
      success: true,
      content: `No observations found for ${displayName}.`,
    };
  }

  const { data: observations } = await supabase
    .from("observations")
    .select(
      "id, content, status, created_at, author:users(first_name, last_name)",
    )
    .in("id", obsIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Get outcome counts
  const obsResultIds = (observations ?? []).map(
    (o) => (o as { id: string }).id,
  );
  const { data: outcomeCounts } =
    obsResultIds.length > 0
      ? await supabase
          .from("observation_outcomes")
          .select("observation_id")
          .in("observation_id", obsResultIds)
      : { data: [] };

  const outcomeMap = new Map<string, number>();
  for (const oc of outcomeCounts ?? []) {
    const id = (oc as { observation_id: string }).observation_id;
    outcomeMap.set(id, (outcomeMap.get(id) ?? 0) + 1);
  }

  // Get total count
  const { count: totalCount } = await supabase
    .from("observation_students")
    .select("*", { count: "exact", head: true })
    .eq("student_id", student.id);

  const obsList = (observations ?? []).map((o) => {
    const obs = o as unknown as {
      id: string;
      content: string | null;
      status: string;
      created_at: string;
      author: { first_name: string; last_name: string } | null;
    };
    return {
      id: obs.id,
      content_preview:
        (obs.content ?? "").slice(0, 100) +
        ((obs.content?.length ?? 0) > 100 ? "..." : ""),
      status: obs.status as "draft" | "published" | "archived",
      author_name: obs.author
        ? `${obs.author.first_name} ${obs.author.last_name}`
        : "Unknown",
      created_at: obs.created_at,
      outcome_count: outcomeMap.get(obs.id) ?? 0,
    };
  });

  const lines = [
    `Observations for ${displayName} (${totalCount ?? obsIds.length} total, showing ${obsList.length}):`,
  ];
  for (const obs of obsList) {
    const date = new Date(obs.created_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    lines.push(
      `  ${date} by ${obs.author_name} [${obs.status}]: ${obs.content_preview}`,
    );
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_student_observations",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "observation_list",
      data: {
        student_name: displayName,
        observations: obsList,
        total_count: totalCount ?? obsIds.length,
      },
    },
  };
}

// ============================================================
// get_student_mastery_summary
// ============================================================

export async function handleGetStudentMasterySummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_mastery_summary",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_mastery_summary",
      success: true,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_mastery_summary",
      success: false,
      content: `Found ${matches.length} students. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const { data: masteryRecords } = await supabase
    .from("student_mastery")
    .select("status, curriculum_node:curriculum_nodes(name, parent_id)")
    .eq("student_id", student.id);

  if (!masteryRecords || masteryRecords.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_mastery_summary",
      success: true,
      content: `No mastery records found for ${displayName}.`,
    };
  }

  const summary: Record<string, number> = {
    not_started: 0,
    presented: 0,
    practicing: 0,
    mastered: 0,
  };
  for (const r of masteryRecords) {
    const status = (r as { status: string }).status;
    if (status in summary) summary[status]++;
  }

  const total = masteryRecords.length;
  const lines = [
    `Mastery summary for ${displayName} (${total} outcomes tracked):`,
  ];
  lines.push(
    `  Mastered: ${summary.mastered}, Practicing: ${summary.practicing}, Presented: ${summary.presented}, Not started: ${summary.not_started}`,
  );

  if (total > 0) {
    const masteredPct = Math.round((summary.mastered / total) * 100);
    lines.push(`  Overall progress: ${masteredPct}% mastered`);
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_student_mastery_summary",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "mastery_summary",
      data: {
        student_name: displayName,
        summary: summary as Record<
          "not_started" | "presented" | "practicing" | "mastered",
          number
        >,
        total_outcomes: total,
        areas: [], // TODO: Group by top-level area when curriculum tree is loaded
      },
    },
  };
}

// ============================================================
// get_student_medical_info (SENSITIVE)
// ============================================================

export async function handleGetStudentMedicalInfo(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_medical_info",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_medical_info",
      success: true,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_medical_info",
      success: false,
      content: `Found ${matches.length} students. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const { data: conditions, error } = await supabase
    .from("medical_conditions")
    .select(
      "id, condition_name, condition_type, severity, description, action_plan, requires_medication, medication_name, medication_location, expiry_date",
    )
    .eq("student_id", student.id)
    .is("deleted_at", null);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_medical_info",
      success: false,
      content: `Failed to look up medical info: ${error.message}`,
    };
  }

  // Audit log for sensitive data access
  await logSensitiveAccess(
    supabase,
    ctx,
    "medical_viewed",
    student.id,
    displayName,
  );

  if (!conditions || conditions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_student_medical_info",
      success: true,
      content: `No medical conditions on file for ${displayName}.`,
    };
  }

  const conditionsList = conditions.map((c) => ({
    id: c.id as string,
    condition_name: c.condition_name as string,
    condition_type: c.condition_type as string,
    severity: c.severity as "mild" | "moderate" | "severe" | "life_threatening",
    description: c.description as string | null,
    action_plan: c.action_plan as string | null,
    requires_medication: c.requires_medication as boolean,
    medication_name: c.medication_name as string | null,
    medication_location: c.medication_location as string | null,
    expiry_date: c.expiry_date as string | null,
  }));

  const lines = [
    `Medical conditions for ${displayName} (${conditions.length}):`,
  ];
  for (const c of conditionsList) {
    const severity =
      c.severity === "life_threatening"
        ? "LIFE-THREATENING"
        : c.severity.toUpperCase();
    lines.push(`  [${severity}] ${c.condition_name} (${c.condition_type})`);
    if (c.requires_medication)
      lines.push(
        `    Medication: ${c.medication_name ?? "Unspecified"} - stored at: ${c.medication_location ?? "Unknown"}`,
      );
    if (c.action_plan) lines.push(`    Action plan: ${c.action_plan}`);
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_student_medical_info",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "medical_info",
      sensitive: true,
      data: { student_name: displayName, conditions: conditionsList },
    },
  };
}

// ============================================================
// get_child_medical_alerts (SENSITIVE - Reg 93/94)
// ============================================================
// Surfaces active management plans, medication authorisations,
// and recent administrations for a named child. Highlights
// expiring plans and active medications.
// ============================================================

export async function handleGetChildMedicalAlerts(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_medical_alerts",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const resolvedMatches = await resolveStudentByName(supabase, studentName);
  if (!resolvedMatches || resolvedMatches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_medical_alerts",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }

  const resolved = resolvedMatches[0];
  const displayName = resolved.preferred_name
    ? `${resolved.first_name} "${resolved.preferred_name}" ${resolved.last_name}`
    : `${resolved.first_name} ${resolved.last_name}`;

  // Fetch plans, authorisations, and recent administrations in parallel
  const [plansRes, authsRes, adminsRes] = await Promise.all([
    supabase
      .from("medical_management_plans")
      .select("*")
      .eq("student_id", resolved.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("expiry_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("medication_authorisations")
      .select("*")
      .eq("student_id", resolved.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("medication_name", { ascending: true }),
    supabase
      .from("medication_administrations")
      .select("*")
      .eq("student_id", resolved.id)
      .order("administered_at", { ascending: false })
      .limit(5),
  ]);

  const plans = plansRes.data ?? [];
  const auths = authsRes.data ?? [];
  const admins = adminsRes.data ?? [];

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const planTypeLabels: Record<string, string> = {
    ascia_anaphylaxis: "ASCIA Anaphylaxis",
    asthma: "Asthma",
    diabetes: "Diabetes",
    seizure: "Seizure",
    other: "Other",
  };

  // Build text summary
  const lines: string[] = [];
  lines.push(`Medical alerts for ${displayName}:`);
  lines.push("");

  // Plans
  if (plans.length === 0) {
    lines.push("MANAGEMENT PLANS: None on file.");
  } else {
    lines.push(`MANAGEMENT PLANS (${plans.length} active):`);
    for (const p of plans) {
      const label = planTypeLabels[p.plan_type] ?? p.plan_type;
      let status = "";
      if (p.expiry_date && p.expiry_date < today) {
        status = " ⚠️ EXPIRED";
      } else if (p.expiry_date && p.expiry_date <= thirtyDaysOut) {
        const daysLeft = Math.ceil(
          (new Date(p.expiry_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        status = ` ⚠️ Expiring in ${daysLeft} days`;
      }
      lines.push(`  - ${label}: ${p.condition_name}${status}`);
      if (p.expiry_date) lines.push(`    Expires: ${p.expiry_date}`);
      if (p.notes) lines.push(`    Notes: ${p.notes}`);
    }
  }
  lines.push("");

  // Authorisations
  if (auths.length === 0) {
    lines.push("AUTHORISED MEDICATIONS: None.");
  } else {
    lines.push(`AUTHORISED MEDICATIONS (${auths.length} active):`);
    for (const a of auths) {
      let expiry = "";
      if (a.valid_until && a.valid_until < today) {
        expiry = " ⚠️ AUTHORISATION EXPIRED";
      }
      lines.push(
        `  - ${a.medication_name}: ${a.dose}, ${a.route}, ${a.frequency}${expiry}`,
      );
      lines.push(
        `    Authorised by: ${a.authorised_by_name} (${a.authorisation_date})`,
      );
      if (a.storage_instructions)
        lines.push(`    Storage: ${a.storage_instructions}`);
    }
  }
  lines.push("");

  // Recent administrations
  if (admins.length === 0) {
    lines.push("RECENT ADMINISTRATIONS: None recorded.");
  } else {
    lines.push(`RECENT ADMINISTRATIONS (last ${admins.length}):`);
    for (const d of admins) {
      const dateStr = formatDateForDisplay(d.administered_at);
      lines.push(
        `  - ${dateStr}: ${d.medication_name} ${d.dose_given} (${d.route})${d.parent_notified ? " - parent notified" : ""}`,
      );
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_child_medical_alerts",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "medical_info",
      sensitive: true,
      data: {
        student_name: displayName,
        conditions: [],
      },
    },
  };
}

// ============================================================
// get_emergency_contacts (SENSITIVE)
// ============================================================

export async function handleGetEmergencyContacts(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_contacts",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_contacts",
      success: true,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_contacts",
      success: false,
      content: `Found ${matches.length} students. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const { data: contacts, error } = await supabase
    .from("emergency_contacts")
    .select(
      "id, name, relationship, phone_primary, phone_secondary, priority_order, notes",
    )
    .eq("student_id", student.id)
    .is("deleted_at", null)
    .order("priority_order", { ascending: true });

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_contacts",
      success: false,
      content: `Failed to look up contacts: ${error.message}`,
    };
  }

  await logSensitiveAccess(
    supabase,
    ctx,
    "emergency_contacts_viewed",
    student.id,
    displayName,
  );

  if (!contacts || contacts.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_contacts",
      success: true,
      content: `No emergency contacts on file for ${displayName}.`,
    };
  }

  const contactsList = contacts.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    relationship: c.relationship as string,
    phone_primary: c.phone_primary as string,
    phone_secondary: c.phone_secondary as string | null,
    priority_order: c.priority_order as number,
    notes: c.notes as string | null,
  }));

  const lines = [`Emergency contacts for ${displayName} (${contacts.length}):`];
  for (const c of contactsList) {
    lines.push(
      `  ${c.priority_order}. ${c.name} (${c.relationship}) - ${c.phone_primary}${c.phone_secondary ? `, alt: ${c.phone_secondary}` : ""}`,
    );
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_emergency_contacts",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "emergency_contacts",
      sensitive: true,
      data: { student_name: displayName, contacts: contactsList },
    },
  };
}

// ============================================================
// get_custody_restrictions (SENSITIVE)
// ============================================================

export async function handleGetCustodyRestrictions(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_custody_restrictions",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_custody_restrictions",
      success: true,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_custody_restrictions",
      success: false,
      content: `Found ${matches.length} students. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const { data: restrictions, error } = await supabase
    .from("custody_restrictions")
    .select(
      "id, restricted_person_name, restriction_type, court_order_reference, effective_date, expiry_date, notes",
    )
    .eq("student_id", student.id)
    .is("deleted_at", null);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_custody_restrictions",
      success: false,
      content: `Failed to look up restrictions: ${error.message}`,
    };
  }

  await logSensitiveAccess(
    supabase,
    ctx,
    "custody_restrictions_viewed",
    student.id,
    displayName,
  );

  if (!restrictions || restrictions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_custody_restrictions",
      success: true,
      content: `No custody restrictions on file for ${displayName}.`,
    };
  }

  const restrictionsList = restrictions.map((r) => ({
    id: r.id as string,
    restricted_person_name: r.restricted_person_name as string,
    restriction_type: r.restriction_type as
      | "no_contact"
      | "no_pickup"
      | "supervised_only"
      | "no_information",
    court_order_reference: r.court_order_reference as string | null,
    effective_date: r.effective_date as string,
    expiry_date: r.expiry_date as string | null,
    notes: r.notes as string | null,
  }));

  const lines = [
    `⚠️ CUSTODY RESTRICTIONS for ${displayName} (${restrictions.length}):`,
  ];
  for (const r of restrictionsList) {
    const type = r.restriction_type.replace(/_/g, " ").toUpperCase();
    lines.push(`  [${type}] ${r.restricted_person_name}`);
    if (r.court_order_reference)
      lines.push(`    Court order: ${r.court_order_reference}`);
    if (r.notes) lines.push(`    Notes: ${r.notes}`);
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_custody_restrictions",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "custody_alert",
      sensitive: true,
      data: { student_name: displayName, restrictions: restrictionsList },
    },
  };
}

// ============================================================
// get_recent_announcements
// ============================================================

export async function handleGetRecentAnnouncements(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  const { data: announcements, error } = await supabase
    .from("announcements")
    .select(
      "id, title, priority, published_at, author:users(first_name, last_name)",
    )
    .is("deleted_at", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(10);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_recent_announcements",
      success: false,
      content: `Failed to get announcements: ${error.message}`,
    };
  }

  if (!announcements || announcements.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_recent_announcements",
      success: true,
      content: "No recent announcements.",
    };
  }

  const list = announcements.map((a) => {
    const ann = a as unknown as {
      id: string;
      title: string;
      priority: string;
      published_at: string;
      author: { first_name: string; last_name: string } | null;
    };
    return {
      id: ann.id,
      title: ann.title,
      priority: ann.priority,
      author_name: ann.author
        ? `${ann.author.first_name} ${ann.author.last_name}`
        : "Unknown",
      published_at: ann.published_at,
      acknowledged_count: 0,
      total_recipients: 0,
    };
  });

  const lines = [`Recent announcements (${list.length}):`];
  for (const a of list) {
    const date = new Date(a.published_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    const priority =
      a.priority === "urgent"
        ? " [URGENT]"
        : a.priority === "high"
          ? " [HIGH]"
          : "";
    lines.push(`  ${date}${priority}: ${a.title} - by ${a.author_name}`);
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_recent_announcements",
    success: true,
    content: lines.join("\n"),
    structured: { type: "announcement_list", data: { announcements: list } },
  };
}

// ============================================================
// get_upcoming_events
// ============================================================

export async function handleGetUpcomingEvents(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();

  const { data: events, error } = await supabase
    .from("school_events")
    .select("id, title, event_type, starts_at, ends_at, location")
    .gte("starts_at", today)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true })
    .limit(10);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_upcoming_events",
      success: false,
      content: `Failed to get events: ${error.message}`,
    };
  }

  if (!events || events.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_upcoming_events",
      success: true,
      content: "No upcoming events scheduled.",
    };
  }

  const list = events.map((e) => ({
    id: e.id as string,
    title: e.title as string,
    event_type: e.event_type as string,
    starts_at: e.starts_at as string,
    ends_at: e.ends_at as string | null,
    location: e.location as string | null,
    rsvp_count: 0,
  }));

  const lines = [`Upcoming events (${list.length}):`];
  for (const e of list) {
    const date = new Date(e.starts_at).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const time = new Date(e.starts_at).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    });
    lines.push(
      `  ${date} ${time}: ${e.title}${e.location ? ` @ ${e.location}` : ""}`,
    );
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_upcoming_events",
    success: true,
    content: lines.join("\n"),
    structured: { type: "event_list", data: { events: list } },
  };
}

// ============================================================
// get_program_session_status
// ============================================================

export async function handleGetProgramSessionStatus(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const programName = (args.program_name as string) ?? "";
  const today = getTodayDate();

  if (!programName.trim()) {
    // List active programs if no name specified
    const { data: programs } = await supabase
      .from("programs")
      .select("name")
      .eq("is_active", true)
      .is("deleted_at", null);

    const names = (programs ?? []).map((p) => (p as { name: string }).name);
    return {
      tool_call_id: toolCallId,
      tool_name: "get_program_session_status",
      success: false,
      content: `Please specify a program name. Active programs: ${names.join(", ") || "none found"}.`,
    };
  }

  // Find program
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, capacity")
    .ilike("name", `%${programName}%`)
    .is("deleted_at", null)
    .limit(1);

  if (!programs || programs.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_program_session_status",
      success: false,
      content: `No program found matching "${programName}".`,
    };
  }

  const program = programs[0] as {
    id: string;
    name: string;
    capacity: number | null;
  };

  // Find today's session
  const { data: sessions } = await supabase
    .from("program_sessions")
    .select("id, date, start_time, end_time, status")
    .eq("program_id", program.id)
    .eq("date", today)
    .is("deleted_at", null)
    .limit(1);

  if (!sessions || sessions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_program_session_status",
      success: true,
      content: `No session scheduled for ${program.name} today.`,
    };
  }

  const session = sessions[0] as {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
  };

  // Get bookings with check-in status
  const { data: bookings } = await supabase
    .from("session_bookings")
    .select("id, status, checked_in_at, checked_out_at")
    .eq("session_id", session.id)
    .is("deleted_at", null);

  const booked = (bookings ?? []).filter(
    (b) => (b as { status: string }).status === "confirmed",
  ).length;
  const checkedIn = (bookings ?? []).filter(
    (b) => (b as { checked_in_at: string | null }).checked_in_at !== null,
  ).length;
  const checkedOut = (bookings ?? []).filter(
    (b) => (b as { checked_out_at: string | null }).checked_out_at !== null,
  ).length;
  const noShows = (bookings ?? []).filter(
    (b) => (b as { status: string }).status === "no_show",
  ).length;

  const content = `${program.name} - today's session (${session.start_time}–${session.end_time}): ${booked} booked, ${checkedIn} checked in, ${checkedOut} checked out, ${noShows} no-shows. Capacity: ${program.capacity ?? "unlimited"}.`;

  return {
    tool_call_id: toolCallId,
    tool_name: "get_program_session_status",
    success: true,
    content,
    structured: {
      type: "program_session_status",
      data: {
        program_name: program.name,
        session_date: session.date,
        session_time: `${session.start_time}–${session.end_time}`,
        capacity: program.capacity ?? 0,
        booked,
        checked_in: checkedIn,
        checked_out: checkedOut,
        no_shows: noShows,
      },
    },
  };
}

// ============================================================
// get_daily_summary
// ============================================================

export async function handleGetDailySummary(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, permissions } = ctx;
  const today = getTodayDate();
  const dateDisplay = formatDateForDisplay(today);

  const data: Record<string, unknown> = {
    date: today,
    date_display: dateDisplay,
  };
  const lines = [`Daily summary for ${dateDisplay}:`];

  // Attendance (if permitted)
  if (permissions.includes("manage_attendance")) {
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .is("deleted_at", null);

    let classesComplete = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalUnmarked = 0;

    for (const cls of classes ?? []) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("class_id", (cls as { id: string }).id)
        .eq("status", "active")
        .is("deleted_at", null);

      const studentIds = (enrollments ?? []).map((e) => e.student_id as string);
      if (studentIds.length === 0) continue;

      const { data: records } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("date", today)
        .in("student_id", studentIds)
        .is("deleted_at", null);

      const markedIds = new Set(
        (records ?? []).map((r) => r.student_id as string),
      );
      const unmarked = studentIds.length - markedIds.size;
      const present = (records ?? []).filter(
        (r) => (r as { status: string }).status === "present",
      ).length;
      const absent = (records ?? []).filter(
        (r) => (r as { status: string }).status === "absent",
      ).length;

      totalPresent += present;
      totalAbsent += absent;
      totalUnmarked += unmarked;
      if (unmarked === 0) classesComplete++;
    }

    data.attendance = {
      classes_complete: classesComplete,
      classes_total: (classes ?? []).length,
      total_present: totalPresent,
      total_absent: totalAbsent,
      total_unmarked: totalUnmarked,
    };
    lines.push(
      `\nAttendance: ${classesComplete}/${(classes ?? []).length} classes complete. ${totalPresent} present, ${totalAbsent} absent, ${totalUnmarked} unmarked.`,
    );
  }

  // Events (if permitted)
  if (permissions.includes("manage_events")) {
    const { data: events } = await supabase
      .from("school_events")
      .select("title, starts_at, event_type")
      .gte("starts_at", `${today}T00:00:00`)
      .lte("starts_at", `${today}T23:59:59`)
      .is("deleted_at", null);

    const eventsList = (events ?? []).map((e) => ({
      title: e.title as string,
      starts_at: e.starts_at as string,
      event_type: e.event_type as string,
    }));

    data.events = eventsList;
    if (eventsList.length > 0) {
      lines.push(`\nToday's events (${eventsList.length}):`);
      for (const e of eventsList) {
        const time = new Date(e.starts_at).toLocaleTimeString("en-AU", {
          hour: "numeric",
          minute: "2-digit",
        });
        lines.push(`  ${time}: ${e.title}`);
      }
    } else {
      lines.push("\nNo events today.");
    }
  }

  // Announcements count
  if (permissions.includes("send_announcements")) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .gte("published_at", sevenDaysAgo.toISOString())
      .is("deleted_at", null);

    data.recent_announcements = count ?? 0;
    lines.push(`\nAnnouncements this week: ${count ?? 0}`);
  }

  // Pending timesheets
  if (permissions.includes("approve_timesheets")) {
    const { count } = await supabase
      .from("timesheets")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted");

    data.pending_timesheets = count ?? 0;
    if ((count ?? 0) > 0)
      lines.push(`\nPending timesheets awaiting approval: ${count}`);
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_daily_summary",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "daily_summary",
      data: data as import("@/types/ask-wattle").DailySummaryData["data"],
    },
  };
}

// ============================================================
// get_my_timesheet_status
// ============================================================

export async function handleGetMyTimesheetStatus(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, userId } = ctx;

  // Find the current/most recent pay period
  const today = getTodayDate();
  const { data: periods } = await supabase
    .from("pay_periods")
    .select("id, name, start_date, end_date, status")
    .lte("start_date", today)
    .gte("end_date", today)
    .is("deleted_at", null)
    .limit(1);

  if (!periods || periods.length === 0) {
    // Try the most recent period
    const { data: recentPeriods } = await supabase
      .from("pay_periods")
      .select("id, name, start_date, end_date, status")
      .lte("start_date", today)
      .is("deleted_at", null)
      .order("end_date", { ascending: false })
      .limit(1);

    if (!recentPeriods || recentPeriods.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_my_timesheet_status",
        success: true,
        content: "No pay periods found.",
      };
    }
  }

  const period = (periods && periods.length > 0 ? periods[0] : null) as {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;

  if (!period) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_my_timesheet_status",
      success: true,
      content: "No current pay period found.",
    };
  }

  // Get the user's timesheet
  const { data: timesheets } = await supabase
    .from("timesheets")
    .select(
      "id, status, total_hours, regular_hours, overtime_hours, leave_hours",
    )
    .eq("user_id", userId)
    .eq("pay_period_id", period.id)
    .limit(1);

  // Get time entries count
  const { count: entriesCount } = await supabase
    .from("time_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("pay_period_id", period.id)
    .is("deleted_at", null);

  const timesheet = timesheets?.[0] as
    | {
        status: string;
        total_hours: number;
        regular_hours: number;
        overtime_hours: number;
        leave_hours: number;
      }
    | undefined;

  const statusDisplay = timesheet?.status ?? "no_timesheet";
  const totalHours = timesheet?.total_hours ?? 0;
  const regularHours = timesheet?.regular_hours ?? 0;
  const overtimeHours = timesheet?.overtime_hours ?? 0;
  const leaveHours = timesheet?.leave_hours ?? 0;

  const lines = [
    `Timesheet for ${period.name} (${formatDateForDisplay(period.start_date)} – ${formatDateForDisplay(period.end_date)}):`,
  ];
  lines.push(
    `Status: ${statusDisplay === "no_timesheet" ? "Not started" : statusDisplay}`,
  );
  lines.push(
    `Hours: ${totalHours} total (${regularHours} regular, ${overtimeHours} overtime, ${leaveHours} leave)`,
  );
  lines.push(`Entries: ${entriesCount ?? 0}`);

  return {
    tool_call_id: toolCallId,
    tool_name: "get_my_timesheet_status",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "timesheet_status",
      data: {
        period_name: period.name,
        period_start: period.start_date,
        period_end: period.end_date,
        status: statusDisplay as
          | "draft"
          | "submitted"
          | "approved"
          | "rejected"
          | "synced"
          | "no_timesheet",
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        leave_hours: leaveHours,
        entries_count: entriesCount ?? 0,
      },
    },
  };
}

// ============================================================
// WRITE TOOLS - Phase 6
// ============================================================

// ── bulk_mark_attendance ────────────────────────────────────

export async function handleBulkMarkAttendance(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const className = (args.class_name as string) ?? "";
  const status = (args.status as string) ?? "";
  const date = (args.date as string) ?? getTodayDate();
  const confirmed = (args.confirmed as boolean) ?? false;

  if (!className.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: false,
      content: "Please specify a class name.",
    };
  }

  const validStatuses = ["present", "absent", "late", "excused", "half_day"];
  if (!validStatuses.includes(status)) {
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: false,
      content: `Invalid status "${status}". Must be one of: ${validStatuses.join(", ")}.`,
    };
  }

  const resolvedClass = await resolveClassName(supabase, className);
  if (!resolvedClass) {
    const available = await getClassNames(supabase);
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: false,
      content: `No class found matching "${className}". Available: ${available.join(", ") || "none"}.`,
    };
  }

  // Get active enrollments
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", resolvedClass.id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (enrollError || !enrollments) {
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: false,
      content: `Failed to look up students: ${enrollError?.message ?? "Unknown error"}`,
    };
  }

  const studentIds = enrollments.map((e) => e.student_id as string);
  if (studentIds.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: true,
      content: `${resolvedClass.name} has no active students.`,
    };
  }

  // If not confirmed, return confirmation request instead of executing
  if (!confirmed) {
    const dateDisplay = formatDateForDisplay(date);
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: true,
      content: `Ready to mark all ${studentIds.length} students in ${resolvedClass.name} as ${status} for ${dateDisplay}. Please confirm to proceed.`,
    };
  }

  // CONFIRMED - execute the bulk upsert
  const tenantId = ctx.tenantId;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: false,
      content: "Could not determine your school context.",
    };
  }

  // Capture previous statuses for revert
  const { data: existingRecords } = await supabase
    .from("attendance_records")
    .select("id, student_id, status")
    .eq("date", date)
    .eq("tenant_id", tenantId)
    .in("student_id", studentIds)
    .is("deleted_at", null);

  const previousStatuses: Record<string, string | null> = {};
  for (const sid of studentIds) {
    const existing = (existingRecords ?? []).find(
      (r) => (r as { student_id: string }).student_id === sid,
    );
    previousStatuses[sid] = existing
      ? (existing as { status: string }).status
      : null;
  }

  // Bulk upsert
  const upsertRows = studentIds.map((sid) => ({
    tenant_id: tenantId,
    student_id: sid,
    class_id: resolvedClass.id,
    date,
    status,
    recorded_by: ctx.userId,
    deleted_at: null,
  }));

  const { data: upserted, error: upsertError } = await supabase
    .from("attendance_records")
    .upsert(upsertRows, { onConflict: "tenant_id,student_id,date" })
    .select("id, student_id");

  if (upsertError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "bulk_mark_attendance",
      success: false,
      content: `Failed to mark attendance: ${upsertError.message}`,
    };
  }

  const recordIds = (upserted ?? []).map((r) => (r as { id: string }).id);
  const recordIdMap: Record<string, string | null> = {};
  for (const r of upserted ?? []) {
    const rec = r as { id: string; student_id: string };
    recordIdMap[rec.id] = previousStatuses[rec.student_id] ?? null;
  }

  const dateDisplay = formatDateForDisplay(date);

  // Audit log
  await logWriteAction(supabase, ctx, "bulk_mark_attendance", {
    class_id: resolvedClass.id,
    class_name: resolvedClass.name,
    status,
    date,
    count: studentIds.length,
  });

  return {
    tool_call_id: toolCallId,
    tool_name: "bulk_mark_attendance",
    success: true,
    content: `Done! Marked all ${studentIds.length} students in ${resolvedClass.name} as ${status} for ${dateDisplay}.`,
    structured: {
      type: "bulk_attendance_confirmation",
      data: {
        class_name: resolvedClass.name,
        date,
        date_display: dateDisplay,
        status: status as
          | "present"
          | "absent"
          | "late"
          | "excused"
          | "half_day",
        count: studentIds.length,
        record_ids: recordIds,
      },
    },
    revert: {
      revert_action: "revert_bulk_attendance",
      args: {
        record_ids: recordIds,
        previous_statuses: recordIdMap,
        class_name: resolvedClass.name,
        date,
      },
      label: "Undo all",
      performed_at: new Date().toISOString(),
    },
  };
}

// ── check_in_student ────────────────────────────────────────

export async function handleCheckInStudent(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const programName = (args.program_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: "Please specify a student name.",
    };
  }
  if (!programName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: "Please specify a program name.",
    };
  }

  // Resolve student
  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}": ${matches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Find the program
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .ilike("name", `%${programName}%`)
    .is("deleted_at", null)
    .limit(1);

  if (!programs || programs.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: `No program found matching "${programName}".`,
    };
  }

  const program = programs[0] as { id: string; name: string };
  const today = getTodayDate();

  // Find today's session
  const { data: sessions } = await supabase
    .from("program_sessions")
    .select("id")
    .eq("program_id", program.id)
    .eq("date", today)
    .is("deleted_at", null)
    .limit(1);

  if (!sessions || sessions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: `No session scheduled for ${program.name} today.`,
    };
  }

  const sessionId = (sessions[0] as { id: string }).id;

  // Find the student's booking
  const { data: bookings } = await supabase
    .from("session_bookings")
    .select("id, checked_in_at")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .is("deleted_at", null)
    .limit(1);

  if (!bookings || bookings.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: `${displayName} doesn't have a booking for ${program.name} today.`,
    };
  }

  const booking = bookings[0] as { id: string; checked_in_at: string | null };
  if (booking.checked_in_at) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: true,
      content: `${displayName} is already checked in to ${program.name}.`,
    };
  }

  // Check in
  const checkedInAt = new Date().toISOString();
  const { error } = await supabase
    .from("session_bookings")
    .update({ checked_in_at: checkedInAt })
    .eq("id", booking.id);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_in_student",
      success: false,
      content: `Failed to check in: ${error.message}`,
    };
  }

  await logWriteAction(supabase, ctx, "check_in_student", {
    student_id: student.id,
    student_name: displayName,
    program_name: program.name,
    booking_id: booking.id,
  });

  return {
    tool_call_id: toolCallId,
    tool_name: "check_in_student",
    success: true,
    content: `Checked in ${displayName} to ${program.name}.`,
    structured: {
      type: "checkin_confirmation",
      data: {
        student_name: displayName,
        student_id: student.id,
        program_name: program.name,
        session_date: today,
        checked_in_at: checkedInAt,
        booking_id: booking.id,
      },
    },
    revert: {
      revert_action: "revert_checkin",
      args: {
        booking_id: booking.id,
        student_name: displayName,
        program_name: program.name,
      },
      label: "Undo check-in",
      performed_at: new Date().toISOString(),
    },
  };
}

// ── check_out_student ───────────────────────────────────────

export async function handleCheckOutStudent(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const programName = (args.program_name as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: "Please specify a student name.",
    };
  }
  if (!programName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: "Please specify a program name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}". Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .ilike("name", `%${programName}%`)
    .is("deleted_at", null)
    .limit(1);

  if (!programs || programs.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `No program found matching "${programName}".`,
    };
  }

  const program = programs[0] as { id: string; name: string };
  const today = getTodayDate();

  const { data: sessions } = await supabase
    .from("program_sessions")
    .select("id")
    .eq("program_id", program.id)
    .eq("date", today)
    .is("deleted_at", null)
    .limit(1);

  if (!sessions || sessions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `No session scheduled for ${program.name} today.`,
    };
  }

  const sessionId = (sessions[0] as { id: string }).id;

  const { data: bookings } = await supabase
    .from("session_bookings")
    .select("id, checked_in_at, checked_out_at")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .is("deleted_at", null)
    .limit(1);

  if (!bookings || bookings.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `${displayName} doesn't have a booking for ${program.name} today.`,
    };
  }

  const booking = bookings[0] as {
    id: string;
    checked_in_at: string | null;
    checked_out_at: string | null;
  };

  if (!booking.checked_in_at) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `${displayName} hasn't been checked in to ${program.name} yet.`,
    };
  }

  if (booking.checked_out_at) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: true,
      content: `${displayName} is already checked out of ${program.name}.`,
    };
  }

  const checkedOutAt = new Date().toISOString();
  const { error } = await supabase
    .from("session_bookings")
    .update({ checked_out_at: checkedOutAt })
    .eq("id", booking.id);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "check_out_student",
      success: false,
      content: `Failed to check out: ${error.message}`,
    };
  }

  await logWriteAction(supabase, ctx, "check_out_student", {
    student_id: student.id,
    student_name: displayName,
    program_name: program.name,
    booking_id: booking.id,
  });

  return {
    tool_call_id: toolCallId,
    tool_name: "check_out_student",
    success: true,
    content: `Checked out ${displayName} from ${program.name}.`,
    structured: {
      type: "checkout_confirmation",
      data: {
        student_name: displayName,
        student_id: student.id,
        program_name: program.name,
        session_date: today,
        checked_out_at: checkedOutAt,
        booking_id: booking.id,
      },
    },
    revert: {
      revert_action: "revert_checkout",
      args: {
        booking_id: booking.id,
        student_name: displayName,
        program_name: program.name,
      },
      label: "Undo check-out",
      performed_at: new Date().toISOString(),
    },
  };
}

// ── log_time_entry ──────────────────────────────────────────

export async function handleLogTimeEntry(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, userId } = ctx;
  const date = (args.date as string) ?? getTodayDate();
  const startTime = (args.start_time as string) ?? "";
  const endTime = (args.end_time as string) ?? "";
  const breakMinutes = (args.break_minutes as number) ?? 0;
  const entryType = (args.entry_type as string) ?? "regular";
  const notes = (args.notes as string) ?? null;

  if (!startTime.trim() || !endTime.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "log_time_entry",
      success: false,
      content:
        "Please specify both a start time and end time (e.g. '08:00' and '16:00').",
    };
  }

  // Validate time format (HH:MM)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return {
      tool_call_id: toolCallId,
      tool_name: "log_time_entry",
      success: false,
      content: "Times must be in HH:MM format (e.g. '08:00', '16:30').",
    };
  }

  // Calculate hours
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const totalMinutes = endH * 60 + endM - (startH * 60 + startM) - breakMinutes;

  if (totalMinutes <= 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "log_time_entry",
      success: false,
      content:
        "End time must be after start time (minus break). Please check the times.",
    };
  }

  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Find current pay period
  const { data: periods } = await supabase
    .from("pay_periods")
    .select("id")
    .lte("start_date", date)
    .gte("end_date", date)
    .is("deleted_at", null)
    .limit(1);

  const payPeriodId = periods?.[0] ? (periods[0] as { id: string }).id : null;

  const tenantId = ctx.tenantId;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "log_time_entry",
      success: false,
      content: "Could not determine your school context.",
    };
  }

  const { data: entry, error } = await supabase
    .from("time_entries")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      pay_period_id: payPeriodId,
      date,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      total_hours: totalHours,
      entry_type: entryType,
      notes,
    })
    .select("id")
    .single();

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "log_time_entry",
      success: false,
      content: `Failed to log time: ${error.message}`,
    };
  }

  const dateDisplay = formatDateForDisplay(date);
  const entryId = (entry as { id: string }).id;

  await logWriteAction(supabase, ctx, "log_time_entry", {
    entry_id: entryId,
    date,
    start_time: startTime,
    end_time: endTime,
    total_hours: totalHours,
  });

  return {
    tool_call_id: toolCallId,
    tool_name: "log_time_entry",
    success: true,
    content: `Logged ${totalHours} hours for ${dateDisplay} (${startTime}–${endTime}, ${breakMinutes}min break).`,
    structured: {
      type: "time_entry_confirmation",
      data: {
        date,
        date_display: dateDisplay,
        start_time: startTime,
        end_time: endTime,
        break_minutes: breakMinutes,
        total_hours: totalHours,
        entry_type: entryType,
        notes,
        entry_id: entryId,
      },
    },
    revert: {
      revert_action: "revert_time_entry",
      args: { entry_id: entryId, date, total_hours: totalHours },
      label: "Undo",
      performed_at: new Date().toISOString(),
    },
  };
}

// ============================================================
// Helpers
// ============================================================

type ToolSupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>
>;

async function logWriteAction(
  supabase: ToolSupabaseClient,
  ctx: WattleToolContext,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      action: `ask_wattle.${action}`,
      entity_type: "ask_wattle_write",
      entity_id: null,
      metadata: { source: "ask_wattle", ...metadata },
    });
  } catch {
    // Non-critical
  }
}

async function logSensitiveAccess(
  supabase: ToolSupabaseClient,
  ctx: WattleToolContext,
  action: string,
  studentId: string,
  studentName: string,
): Promise<void> {
  try {
    await supabase.from("audit_logs").insert({
      tenant_id: ctx.tenantId,
      user_id: ctx.userId,
      action: `ask_wattle.${action}`,
      entity_type: "student",
      entity_id: studentId,
      metadata: {
        source: "ask_wattle",
        student_name: studentName,
      },
    });
  } catch {
    // Non-critical - don't fail the tool if audit logging fails
  }
}

// ============================================================
// get_staff_compliance_status (Module C - Reg 136/145/146)
// ============================================================

const EXPIRY_WARNING_DAYS = 60;

function computeStatus(
  expiryStr: string | null,
  today: Date,
): "valid" | "expiring_soon" | "expired" | "missing" {
  if (!expiryStr) return "missing";
  const expiry = new Date(expiryStr);
  if (expiry < today) return "expired";
  const days = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return days <= EXPIRY_WARNING_DAYS ? "expiring_soon" : "valid";
}

function certStatus(
  certs: Array<{
    cert_type: string;
    expiry_date: string | null;
    deleted_at: string | null;
  }>,
  type: string,
  today: Date,
): "valid" | "expiring_soon" | "expired" | "missing" {
  const matching = certs
    .filter((c) => c.cert_type === type && !c.deleted_at)
    .sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return b.expiry_date.localeCompare(a.expiry_date);
    });
  const best = matching[0];
  if (!best) return "missing";
  return computeStatus(best.expiry_date, today);
}

export async function handleGetStaffComplianceStatus(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const staffName = ((args.staff_member_name as string) ?? "").trim();

  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_staff_compliance_status",
      success: false,
      content: "No school context available.",
    };
  }

  const today = new Date();

  // 1. Get active staff
  const { data: staffRows, error: staffErr } = await supabase
    .from("tenant_users")
    .select("user_id, users!inner(id, first_name, last_name, email)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .neq("status", "suspended");

  if (staffErr || !staffRows?.length) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_staff_compliance_status",
      success: false,
      content: staffErr
        ? `Database error: ${staffErr.message}`
        : "No active staff found.",
    };
  }

  // 2. Optionally filter by name
  let filtered = staffRows;
  if (staffName) {
    const q = staffName.toLowerCase();
    filtered = staffRows.filter((r) => {
      const rawU = r.users as unknown as
        | { first_name: string | null; last_name: string | null }
        | Array<{ first_name: string | null; last_name: string | null }>;
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      const full = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
      return full.includes(q);
    });
    if (filtered.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_staff_compliance_status",
        success: false,
        content: `No staff member matching "${staffName}" found.`,
      };
    }
  }

  const userIds = filtered.map((r) => r.user_id);

  // 3. Fetch compliance profiles + certificates in parallel
  const [profilesRes, certsRes] = await Promise.all([
    supabase
      .from("staff_compliance_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("user_id", userIds)
      .is("deleted_at", null),
    supabase
      .from("staff_certificates")
      .select("user_id, cert_type, expiry_date, deleted_at")
      .eq("tenant_id", tenantId)
      .in("user_id", userIds)
      .is("deleted_at", null),
  ]);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p]),
  );
  const certMap = new Map<string, typeof certsRes.data>();
  for (const c of certsRes.data ?? []) {
    const arr = certMap.get(c.user_id) ?? [];
    arr.push(c);
    certMap.set(c.user_id, arr);
  }

  // 4. Build per-staff summaries
  let compliant = 0;
  let expiring = 0;
  let nonCompliant = 0;

  const lines: string[] = [];
  const structuredMembers: Array<{
    user_id: string;
    display_name: string;
    email: string;
    position_title: string | null;
    wwcc_status: string;
    first_aid_status: string;
    cpr_status: string;
    anaphylaxis_status: string;
    asthma_status: string;
    food_safety_status: string;
    geccko_status: string;
    overall: "compliant" | "expiring" | "non_compliant";
  }> = [];

  for (const row of filtered) {
    const rawU = row.users as unknown as
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }
      | Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }>;
    const u = Array.isArray(rawU) ? rawU[0] : rawU;
    const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
    const profile = profileMap.get(row.user_id);
    const certs = (certMap.get(row.user_id) ?? []) as Array<{
      cert_type: string;
      expiry_date: string | null;
      deleted_at: string | null;
    }>;

    const wwcc = computeStatus(profile?.wwcc_expiry ?? null, today);
    const firstAid = certStatus(certs, "first_aid", today);
    const cpr = certStatus(certs, "cpr", today);
    const anaphylaxis = certStatus(certs, "anaphylaxis", today);
    const asthma = certStatus(certs, "asthma", today);
    const foodSafety = certStatus(certs, "food_safety", today);
    const geccko = profile?.geccko_completion_date ? "complete" : "missing";

    const allStatuses = [wwcc, firstAid, cpr, anaphylaxis, asthma, foodSafety];
    const hasExpired =
      allStatuses.includes("expired") || allStatuses.includes("missing");
    const hasExpiring = allStatuses.includes("expiring_soon");
    let overall: "compliant" | "expiring" | "non_compliant";
    if (hasExpired || geccko === "missing") {
      overall = "non_compliant";
      nonCompliant++;
    } else if (hasExpiring) {
      overall = "expiring";
      expiring++;
    } else {
      overall = "compliant";
      compliant++;
    }

    const issues: string[] = [];
    if (wwcc === "expired") issues.push("WWCC expired");
    if (wwcc === "missing") issues.push("WWCC missing");
    if (wwcc === "expiring_soon") issues.push("WWCC expiring soon");
    if (firstAid === "expired") issues.push("First Aid expired");
    if (firstAid === "missing") issues.push("First Aid missing");
    if (cpr === "expired") issues.push("CPR expired");
    if (cpr === "missing") issues.push("CPR missing");
    if (anaphylaxis === "expired") issues.push("Anaphylaxis expired");
    if (anaphylaxis === "missing") issues.push("Anaphylaxis missing");
    if (asthma === "expired") issues.push("Asthma expired");
    if (asthma === "missing") issues.push("Asthma missing");
    if (foodSafety === "expired") issues.push("Food Safety expired");
    if (foodSafety === "missing") issues.push("Food Safety missing");
    if (foodSafety === "expiring_soon")
      issues.push("Food Safety expiring soon");
    if (geccko === "missing") issues.push("Geccko training missing");

    const statusIcon =
      overall === "compliant" ? "✅" : overall === "expiring" ? "⚠️" : "❌";
    lines.push(
      `${statusIcon} ${name}${issues.length > 0 ? `: ${issues.join(", ")}` : " - fully compliant"}`,
    );

    structuredMembers.push({
      user_id: u.id,
      display_name: name,
      email: u.email,
      position_title: profile?.position_title ?? null,
      wwcc_status: wwcc,
      first_aid_status: firstAid,
      cpr_status: cpr,
      anaphylaxis_status: anaphylaxis,
      asthma_status: asthma,
      food_safety_status: foodSafety,
      geccko_status: geccko,
      overall,
    });
  }

  const total = filtered.length;
  const header = staffName
    ? `Compliance status for "${staffName}":`
    : `Staff compliance overview (${total} staff):`;
  const summary = `Summary: ${compliant} compliant, ${expiring} expiring soon, ${nonCompliant} non-compliant`;

  return {
    tool_call_id: toolCallId,
    tool_name: "get_staff_compliance_status",
    success: true,
    content: `${header}\n\n${lines.join("\n")}\n\n${summary}`,
    structured: {
      type: "staff_compliance_status",
      data: {
        staff_members: structuredMembers,
        summary: {
          total_staff: total,
          fully_compliant: compliant,
          expiring_soon: expiring,
          non_compliant: nonCompliant,
        },
      },
    },
  };
}

// ============================================================
// Module D: Ratio Monitoring (Reg 123)
// ============================================================

const RATIO_BRACKETS_TOOL = [
  { label: "0–24m", maxMonths: 24, ratio: 4 },
  { label: "24–36m", maxMonths: 36, ratio: 5 },
  { label: "3y–school", maxMonths: 60, ratio: 11 },
  { label: "school OSHC", maxMonths: Infinity, ratio: 15 },
] as const;

function ageInMonthsTool(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

function computeRequiredEducatorsTool(ages: number[]): {
  required: number;
  denominator: number;
  youngest: number | null;
} {
  if (ages.length === 0) return { required: 0, denominator: 0, youngest: null };
  const youngest = Math.min(...ages);
  let totalRequired = 0;
  let prevMax = 0;
  let denominator = 0;
  for (const bracket of RATIO_BRACKETS_TOOL) {
    const count = ages.filter(
      (a) => a >= prevMax && a < bracket.maxMonths,
    ).length;
    if (count > 0) {
      totalRequired += Math.ceil(count / bracket.ratio);
      if (denominator === 0) denominator = bracket.ratio;
    }
    prevMax = bracket.maxMonths;
  }
  return { required: totalRequired, denominator, youngest };
}

/**
 * get_current_ratios - returns per-room ratio status
 */
export async function handleGetCurrentRatios(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_current_ratios",
      success: false,
      content: "No tenant context available.",
    };
  }

  const className = (args.class_name as string) ?? "";
  const today = getTodayDate();

  // 1. Get active classes
  let classQuery = supabase
    .from("classes")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (className) {
    classQuery = classQuery.ilike("name", `%${className}%`);
  }

  const { data: classes, error: classErr } = await classQuery;

  if (classErr || !classes?.length) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_current_ratios",
      success: false,
      content: className
        ? `No class matching "${className}" found.`
        : "No active classes found.",
    };
  }

  const classIds = classes.map((c) => c.id);

  // 2. Batch fetch floor sign-ins
  const { data: floorRows } = await supabase
    .from("floor_sign_ins")
    .select("class_id, user_id, users!inner(id, first_name, last_name)")
    .eq("tenant_id", tenantId)
    .in("class_id", classIds)
    .eq("is_active", true);

  // 3. Batch fetch enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("class_id, student_id")
    .in("class_id", classIds)
    .eq("status", "active")
    .is("deleted_at", null);

  const enrolledByClass = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const arr = enrolledByClass.get(e.class_id) ?? [];
    arr.push(e.student_id);
    enrolledByClass.set(e.class_id, arr);
  }

  const allStudentIds = [
    ...new Set((enrollments ?? []).map((e) => e.student_id)),
  ];

  // 4. Batch fetch attendance
  let attendanceSet = new Set<string>();
  if (allStudentIds.length > 0) {
    const { data: attRows } = await supabase
      .from("attendance_records")
      .select("student_id")
      .eq("date", today)
      .in("student_id", allStudentIds)
      .in("status", ["present", "late", "half_day"])
      .not("check_in_at", "is", null)
      .is("check_out_at", null)
      .is("deleted_at", null);

    attendanceSet = new Set((attRows ?? []).map((a) => a.student_id));
  }

  // 5. Batch fetch DOBs
  let dobMap = new Map<string, string | null>();
  if (allStudentIds.length > 0) {
    const { data: students } = await supabase
      .from("students")
      .select("id, dob")
      .in("id", allStudentIds);

    dobMap = new Map((students ?? []).map((s) => [s.id, s.dob]));
  }

  // 6. Build per-class results
  const lines: string[] = [];
  const structuredRooms: Array<{
    class_id: string;
    class_name: string;
    children_present: number;
    educators_on_floor: number;
    required_educators: number;
    required_ratio_denominator: number;
    youngest_child_months: number | null;
    is_compliant: boolean;
    educator_names: string[];
  }> = [];

  let compliantCount = 0;
  let breachedCount = 0;

  for (const cls of classes) {
    const classFloor = (floorRows ?? []).filter((r) => r.class_id === cls.id);
    const educatorNames = classFloor.map((row) => {
      const rawU = row.users as unknown as
        | { id: string; first_name: string | null; last_name: string | null }
        | Array<{
            id: string;
            first_name: string | null;
            last_name: string | null;
          }>;
      const u = Array.isArray(rawU) ? rawU[0] : rawU;
      return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
    });

    const enrolledIds = enrolledByClass.get(cls.id) ?? [];
    const presentIds = enrolledIds.filter((id) => attendanceSet.has(id));
    const childAges = presentIds
      .map((id) => {
        const dob = dobMap.get(id);
        return dob ? ageInMonthsTool(dob) : null;
      })
      .filter((a): a is number => a !== null);

    const ratioResult = computeRequiredEducatorsTool(childAges);
    const childrenPresent = childAges.length;
    const educatorsOnFloor = classFloor.length;
    const isCompliant =
      childrenPresent === 0 || educatorsOnFloor >= ratioResult.required;

    if (isCompliant) compliantCount++;
    else breachedCount++;

    const statusIcon = isCompliant ? "✅" : "🔴";
    const ratioStr =
      childrenPresent === 0
        ? "no children present"
        : `${educatorsOnFloor}:${childrenPresent} (required 1:${ratioResult.denominator})`;

    lines.push(
      `${statusIcon} **${cls.name}** - ${ratioStr}` +
        (educatorNames.length > 0
          ? `\n   Educators on floor: ${educatorNames.join(", ")}`
          : "\n   No educators on floor"),
    );

    structuredRooms.push({
      class_id: cls.id,
      class_name: cls.name,
      children_present: childrenPresent,
      educators_on_floor: educatorsOnFloor,
      required_educators: ratioResult.required,
      required_ratio_denominator: ratioResult.denominator,
      youngest_child_months: ratioResult.youngest,
      is_compliant: isCompliant,
      educator_names: educatorNames,
    });
  }

  const summary =
    `**Ratio Summary** - ${classes.length} room${classes.length !== 1 ? "s" : ""}` +
    ` | ${compliantCount} compliant | ${breachedCount} breached\n\n` +
    lines.join("\n\n");

  return {
    tool_call_id: toolCallId,
    tool_name: "get_current_ratios",
    success: true,
    content: summary,
    structured: {
      type: "ratio_status",
      data: {
        rooms: structuredRooms,
        summary: {
          total_rooms: classes.length,
          compliant_rooms: compliantCount,
          breached_rooms: breachedCount,
        },
      },
    },
  };
}

/**
 * get_ratio_breach_history - returns breach log entries
 */
export async function handleGetRatioBreachHistory(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_ratio_breach_history",
      success: false,
      content: "No tenant context available.",
    };
  }

  const className = (args.class_name as string) ?? "";
  const days = Math.min(Math.max(Number(args.days) || 7, 1), 90);

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const fromStr = fromDate.toISOString();

  // Build query
  let query = supabase
    .from("ratio_logs")
    .select("*, classes!inner(name)")
    .eq("tenant_id", tenantId)
    .eq("is_breached", true)
    .gte("logged_at", fromStr)
    .order("logged_at", { ascending: false })
    .limit(50);

  if (className) {
    query = query.ilike("classes.name", `%${className}%`);
  }

  const { data: breaches, error } = await query;

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_ratio_breach_history",
      success: false,
      content: `Database error: ${error.message}`,
    };
  }

  if (!breaches?.length) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_ratio_breach_history",
      success: true,
      content: `No ratio breaches found in the last ${days} days.${className ? ` (filtered to "${className}")` : ""}`,
      structured: {
        type: "ratio_breach_history",
        data: { breaches: [], total_breaches: 0 },
      },
    };
  }

  // Get acknowledger names if any
  const acknowledgerIds = breaches
    .filter((b) => b.breach_acknowledged_by)
    .map((b) => b.breach_acknowledged_by!);

  let ackNameMap = new Map<string, string>();
  if (acknowledgerIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", [...new Set(acknowledgerIds)]);

    ackNameMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
      ]),
    );
  }

  const lines: string[] = [];
  const structuredBreaches: Array<{
    id: string;
    class_name: string;
    logged_at: string;
    children_present: number;
    educators_on_floor: number;
    required_ratio_denominator: number;
    acknowledged: boolean;
    acknowledged_by_name: string | null;
  }> = [];

  for (const b of breaches) {
    const rawC = b.classes as unknown as
      | { name: string }
      | Array<{ name: string }>;
    const c = Array.isArray(rawC) ? rawC[0] : rawC;
    const classN = c.name;

    const dt = new Date(b.logged_at);
    const dateStr = dt.toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = dt.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const ack = b.breach_acknowledged_by
      ? (ackNameMap.get(b.breach_acknowledged_by) ?? "Unknown")
      : null;
    const ackStr = ack
      ? ` - acknowledged by ${ack}`
      : " - **not acknowledged**";

    lines.push(
      `🔴 **${classN}** on ${dateStr} at ${timeStr} - ` +
        `${b.educators_on_floor} educators, ${b.children_present} children ` +
        `(required 1:${b.required_ratio_denominator})${ackStr}`,
    );

    structuredBreaches.push({
      id: b.id,
      class_name: classN,
      logged_at: b.logged_at,
      children_present: b.children_present,
      educators_on_floor: b.educators_on_floor,
      required_ratio_denominator: b.required_ratio_denominator,
      acknowledged: !!b.breach_acknowledged_at,
      acknowledged_by_name: ack,
    });
  }

  const content =
    `**Ratio Breaches** - ${breaches.length} breach${breaches.length !== 1 ? "es" : ""} ` +
    `in the last ${days} days\n\n` +
    lines.join("\n\n");

  return {
    tool_call_id: toolCallId,
    tool_name: "get_ratio_breach_history",
    success: true,
    content,
    structured: {
      type: "ratio_breach_history",
      data: {
        breaches: structuredBreaches,
        total_breaches: breaches.length,
      },
    },
  };
}

// ============================================================
// Module F: Immunisation Compliance
// ============================================================

export async function handleGetImmunisationCompliance(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_immunisation_compliance",
      success: false,
      content: "No tenant context available.",
    };
  }

  const studentName = (args.student_name as string) ?? "";
  const today = new Date().toISOString().split("T")[0];

  // If a specific student is requested, resolve and return their record
  if (studentName) {
    const matches = await resolveStudentByName(supabase, studentName);
    if (!matches || matches.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_immunisation_compliance",
        success: true,
        content: `I couldn't find a student matching "${studentName}". Please check the spelling and try again.`,
      };
    }

    const resolved = matches[0];

    const { data: record } = await supabase
      .from("immunisation_records")
      .select(
        "id, student_id, ihs_date, status, support_period_start, support_period_end, next_air_check_due, exemption_noted_at, notes",
      )
      .eq("tenant_id", tenantId)
      .eq("student_id", resolved.id)
      .is("deleted_at", null)
      .maybeSingle();

    const name = `${resolved.first_name} ${resolved.last_name}`;

    if (!record) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_immunisation_compliance",
        success: true,
        content: `**${name}** has no immunisation record on file. An IHS record needs to be created.`,
        structured: {
          type: "immunisation_compliance",
          data: { student: name, record: null },
        },
      };
    }

    const statusLabel: Record<string, string> = {
      up_to_date: "Up to Date ✅",
      catch_up_schedule: "Catch-up Schedule ⏳",
      medical_exemption: "Medical Exemption 🏥",
      pending: "Pending ⚠️",
    };

    let details = `**${name}** - ${statusLabel[record.status] ?? record.status}`;
    if (record.ihs_date) {
      details += `\nIHS Date: ${new Date(record.ihs_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (record.status === "catch_up_schedule") {
      if (record.support_period_end) {
        const endDate = new Date(record.support_period_end);
        const daysLeft = Math.max(
          0,
          Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        );
        details += `\nSupport period: ${daysLeft} days remaining (ends ${endDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })})`;
      }
      if (record.next_air_check_due) {
        const isOverdue = record.next_air_check_due < today;
        details += `\nNext AIR check: ${new Date(record.next_air_check_due).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}${isOverdue ? " **OVERDUE**" : ""}`;
      }
    }
    if (record.notes) details += `\nNotes: ${record.notes}`;

    return {
      tool_call_id: toolCallId,
      tool_name: "get_immunisation_compliance",
      success: true,
      content: details,
      structured: {
        type: "immunisation_compliance",
        data: { student: name, record },
      },
    };
  }

  // Full compliance summary
  const { count: totalEnrolled } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("enrollment_status", "active")
    .is("deleted_at", null);

  const { data: records } = await supabase
    .from("immunisation_records")
    .select(
      "id, student_id, status, ihs_date, next_air_check_due, support_period_end, students!inner(first_name, last_name)",
    )
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  const counts = {
    up_to_date: 0,
    catch_up_schedule: 0,
    medical_exemption: 0,
    pending: 0,
  };
  const overdueChecks: string[] = [];
  const endingSoon: string[] = [];

  for (const r of records ?? []) {
    const s = r.status as keyof typeof counts;
    if (s in counts) counts[s]++;

    const student = r.students as unknown as {
      first_name: string;
      last_name: string;
    };
    const name = `${student.first_name} ${student.last_name}`;

    if (r.next_air_check_due && r.next_air_check_due < today) {
      overdueChecks.push(name);
    }
    if (r.support_period_end) {
      const daysLeft = Math.ceil(
        (new Date(r.support_period_end).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysLeft >= 0 && daysLeft <= 14) {
        endingSoon.push(`${name} (${daysLeft} days)`);
      }
    }
  }

  const total = totalEnrolled ?? 0;
  const withRecord = (records ?? []).length;
  const noRecord = total - withRecord;
  const compliant = counts.up_to_date + counts.medical_exemption;
  const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;

  let content = `**Immunisation Compliance Summary**\n\n`;
  content += `Total enrolled: ${total}\n`;
  content += `✅ Up to Date: ${counts.up_to_date}\n`;
  content += `⏳ Catch-up: ${counts.catch_up_schedule}\n`;
  content += `🏥 Exemption: ${counts.medical_exemption}\n`;
  content += `⚠️ Pending: ${counts.pending}\n`;
  if (noRecord > 0) content += `❌ No record: ${noRecord}\n`;
  content += `\n**Compliance rate: ${pct}%**`;

  if (overdueChecks.length > 0) {
    content += `\n\n🔴 **Overdue AIR checks (${overdueChecks.length}):**\n`;
    content += overdueChecks.map((n) => `  - ${n}`).join("\n");
  }

  if (endingSoon.length > 0) {
    content += `\n\n🟡 **Support periods ending soon (${endingSoon.length}):**\n`;
    content += endingSoon.map((n) => `  - ${n}`).join("\n");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_immunisation_compliance",
    success: true,
    content,
    structured: {
      type: "immunisation_compliance",
      data: {
        total_enrolled: total,
        with_record: withRecord,
        no_record: noRecord,
        counts,
        compliance_percent: pct,
        overdue_air_checks: overdueChecks,
        support_periods_ending_soon: endingSoon,
      },
    },
  };
}

// ============================================================
// get_ccs_reporting_summary
// ============================================================

const CCS_ANNUAL_CAP = 42;
const CCS_WARN_THRESHOLD = 35;

export async function handleGetCcsReportingSummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_ccs_reporting_summary",
      success: false,
      content: "No tenant context available.",
    };
  }

  const studentName = (args.student_name as string) ?? "";

  // If a specific student is requested, show their absence cap usage
  if (studentName) {
    const matches = await resolveStudentByName(supabase, studentName);
    if (!matches || matches.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_ccs_reporting_summary",
        success: true,
        content: `I couldn't find a student matching "${studentName}". Please check the spelling and try again.`,
      };
    }

    const resolved = matches[0];
    const name = `${resolved.first_name} ${resolved.last_name}`;

    // Get current FY
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const fyStart = month >= 6 ? `${year}-07-01` : `${year - 1}-07-01`;
    const fyEnd = month >= 6 ? `${year + 1}-06-30` : `${year}-06-30`;
    const fyLabel =
      month >= 6
        ? `${year}-${String(year + 1).slice(2)}`
        : `${year - 1}-${String(year).slice(2)}`;

    // Count absences
    const { data: absences } = await supabase
      .from("ccs_session_reports")
      .select(
        "absence_type_code, ccs_absence_type_codes!left(annual_cap_applies)",
      )
      .eq("tenant_id", tenantId)
      .eq("student_id", resolved.id)
      .eq("absence_flag", true)
      .gte("session_date", fyStart)
      .lte("session_date", fyEnd)
      .is("deleted_at", null);

    let capped = 0;
    let uncapped = 0;
    for (const a of absences ?? []) {
      const r = a as Record<string, unknown>;
      const codeInfo = r.ccs_absence_type_codes as {
        annual_cap_applies: boolean;
      } | null;
      if (codeInfo?.annual_cap_applies) {
        capped++;
      } else {
        uncapped++;
      }
    }

    const isAtCap = capped >= CCS_ANNUAL_CAP;
    const remaining = Math.max(0, CCS_ANNUAL_CAP - capped);

    let content = `**${name} - CCS Absence Cap (${fyLabel})**\n\n`;
    content += `Capped absences: ${capped} / ${CCS_ANNUAL_CAP}`;
    if (uncapped > 0) content += ` (+ ${uncapped} uncapped)`;
    content += `\nRemaining: ${remaining} days`;
    if (isAtCap) {
      content += `\n\n🔴 **This child has reached the 42-day annual absence cap.** Further absences will not attract CCS.`;
    } else if (capped >= CCS_WARN_THRESHOLD) {
      content += `\n\n🟡 **Approaching cap** - only ${remaining} capped absence days remain.`;
    }

    return {
      tool_call_id: toolCallId,
      tool_name: "get_ccs_reporting_summary",
      success: true,
      content,
      structured: {
        type: "ccs_reporting_summary",
        data: {
          student: name,
          financial_year: fyLabel,
          capped_days_used: capped,
          uncapped_days: uncapped,
          cap_limit: CCS_ANNUAL_CAP,
          is_at_cap: isAtCap,
        },
      },
    };
  }

  // Full CCS summary
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(mondayOffset);
  const weekStart = monday.toISOString().split("T")[0];

  // Current week bundle
  const { data: currentBundle } = await supabase
    .from("ccs_weekly_bundles")
    .select("id, status, week_start_date, week_end_date")
    .eq("tenant_id", tenantId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  let currentReportCount = 0;
  if (currentBundle) {
    const { count } = await supabase
      .from("ccs_session_reports")
      .select("id", { count: "exact", head: true })
      .eq("bundle_id", currentBundle.id)
      .is("deleted_at", null);
    currentReportCount = count ?? 0;
  }

  // Unbundled reports
  const { count: unbundledCount } = await supabase
    .from("ccs_session_reports")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("bundle_id", null)
    .is("deleted_at", null);

  // Recent bundles
  const { data: recentBundles } = await supabase
    .from("ccs_weekly_bundles")
    .select("id, status, week_start_date, week_end_date")
    .eq("tenant_id", tenantId)
    .order("week_start_date", { ascending: false })
    .limit(5);

  const recentFormatted: Array<{
    week: string;
    status: string;
    reports: number;
  }> = [];
  for (const b of recentBundles ?? []) {
    const { count: rc } = await supabase
      .from("ccs_session_reports")
      .select("id", { count: "exact", head: true })
      .eq("bundle_id", b.id)
      .is("deleted_at", null);
    recentFormatted.push({
      week: `${b.week_start_date} – ${b.week_end_date}`,
      status: b.status,
      reports: rc ?? 0,
    });
  }

  // Children near cap (FY)
  const month = now.getMonth();
  const year = now.getFullYear();
  const fyStart = month >= 6 ? `${year}-07-01` : `${year - 1}-07-01`;
  const fyEnd = month >= 6 ? `${year + 1}-06-30` : `${year}-06-30`;

  const { data: absenceData } = await supabase
    .from("ccs_session_reports")
    .select("student_id, ccs_absence_type_codes!left(annual_cap_applies)")
    .eq("tenant_id", tenantId)
    .eq("absence_flag", true)
    .gte("session_date", fyStart)
    .lte("session_date", fyEnd)
    .is("deleted_at", null);

  const cappedMap = new Map<string, number>();
  for (const a of absenceData ?? []) {
    const r = a as Record<string, unknown>;
    const codeInfo = r.ccs_absence_type_codes as {
      annual_cap_applies: boolean;
    } | null;
    if (codeInfo?.annual_cap_applies) {
      const sid = r.student_id as string;
      cappedMap.set(sid, (cappedMap.get(sid) ?? 0) + 1);
    }
  }
  const nearCapCount = Array.from(cappedMap.values()).filter(
    (c) => c >= CCS_WARN_THRESHOLD,
  ).length;

  let content = `**CCS Session Reporting Summary**\n\n`;

  if (currentBundle) {
    content += `📋 **This week** (${currentBundle.week_start_date} – ${currentBundle.week_end_date}): ${currentBundle.status} - ${currentReportCount} reports\n`;
  } else {
    content += `📋 **This week**: No bundle created yet\n`;
  }

  content += `📂 Unbundled reports: ${unbundledCount ?? 0}\n`;

  if (nearCapCount > 0) {
    content += `\n⚠️ **${nearCapCount} child${nearCapCount !== 1 ? "ren" : ""} approaching/at the 42-day absence cap**\n`;
  }

  if (recentFormatted.length > 0) {
    content += `\n**Recent bundles:**\n`;
    for (const b of recentFormatted) {
      const statusEmoji: Record<string, string> = {
        draft: "📝",
        ready: "🔵",
        submitted: "🟣",
        accepted: "✅",
        rejected: "❌",
      };
      content += `  ${statusEmoji[b.status] ?? "•"} ${b.week}: ${b.status} (${b.reports} reports)\n`;
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_ccs_reporting_summary",
    success: true,
    content,
    structured: {
      type: "ccs_reporting_summary",
      data: {
        current_week_status: currentBundle?.status ?? null,
        current_week_reports: currentReportCount,
        unbundled_reports: unbundledCount ?? 0,
        children_near_cap: nearCapCount,
        recent_bundles: recentFormatted,
      },
    },
  };
}

// ============================================================
// get_emergency_drill_compliance
// ============================================================

const DRILL_OVERDUE_DAYS = 31;
const DRILL_AT_RISK_DAYS = 25;

const DRILL_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
};

export async function handleGetEmergencyDrillCompliance(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_drill_compliance",
      success: false,
      content: "No tenant context available.",
    };
  }

  const drillTypeFilter = (args.drill_type as string) ?? "";
  const today = getTodayDate();
  const yearStart = `${today.slice(0, 4)}-01-01`;

  // Fetch all completed drills for the tenant
  let query = supabase
    .from("emergency_drills")
    .select(
      "id, drill_type, status, scheduled_date, actual_start_at, actual_end_at, evacuation_time_seconds, effectiveness_rating, follow_up_required, follow_up_completed_at",
    )
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("scheduled_date", { ascending: false });

  if (drillTypeFilter) {
    query = query.eq("drill_type", drillTypeFilter);
  }

  const { data: drills } = await query;

  // Also get upcoming scheduled drills
  const { data: upcoming } = await supabase
    .from("emergency_drills")
    .select("id, drill_type, scheduled_date, scheduled_time")
    .eq("tenant_id", tenantId)
    .eq("status", "scheduled")
    .is("deleted_at", null)
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(5);

  // Count follow-ups pending
  const { count: followUpsPending } = await supabase
    .from("emergency_drills")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .eq("follow_up_required", true)
    .is("follow_up_completed_at", null)
    .is("deleted_at", null);

  // Build compliance-by-type
  const drillTypes = drillTypeFilter
    ? [drillTypeFilter]
    : ["fire_evacuation", "lockdown", "shelter_in_place", "medical_emergency"];

  const complianceByType: Array<{
    drill_type: string;
    label: string;
    last_drill_date: string | null;
    days_since_last: number | null;
    drills_this_year: number;
    average_evacuation_seconds: number | null;
    is_overdue: boolean;
    is_at_risk: boolean;
  }> = [];

  const nowMs = new Date(today + "T00:00:00").getTime();

  for (const dt of drillTypes) {
    const typeDrills = (drills ?? []).filter((d) => d.drill_type === dt);
    const lastDrill = typeDrills[0];
    const lastDate = lastDrill?.scheduled_date as string | null;

    let daysSince: number | null = null;
    if (lastDate) {
      const lastMs = new Date(lastDate + "T00:00:00").getTime();
      daysSince = Math.floor((nowMs - lastMs) / (1000 * 60 * 60 * 24));
    }

    const thisYearDrills = typeDrills.filter(
      (d) => (d.scheduled_date as string) >= yearStart,
    );

    const evacTimes = typeDrills
      .map((d) => d.evacuation_time_seconds as number | null)
      .filter((t): t is number => t != null);
    const avgEvac =
      evacTimes.length > 0
        ? Math.round(evacTimes.reduce((a, b) => a + b, 0) / evacTimes.length)
        : null;

    complianceByType.push({
      drill_type: dt,
      label: DRILL_TYPE_LABELS[dt] ?? dt,
      last_drill_date: lastDate,
      days_since_last: daysSince,
      drills_this_year: thisYearDrills.length,
      average_evacuation_seconds: avgEvac,
      is_overdue: daysSince === null || daysSince > DRILL_OVERDUE_DAYS,
      is_at_risk:
        daysSince !== null &&
        daysSince > DRILL_AT_RISK_DAYS &&
        daysSince <= DRILL_OVERDUE_DAYS,
    });
  }

  // Overall status
  const anyOverdue = complianceByType.some((c) => c.is_overdue);
  const anyAtRisk = complianceByType.some((c) => c.is_at_risk);
  const overallStatus = anyOverdue
    ? "overdue"
    : anyAtRisk
      ? "at_risk"
      : "compliant";

  const totalThisYear = (drills ?? []).filter(
    (d) => (d.scheduled_date as string) >= yearStart,
  ).length;

  // Build content string for GPT
  let content = `**Emergency Drill Compliance**\n\n`;
  content += `Overall: ${overallStatus === "overdue" ? "OVERDUE" : overallStatus === "at_risk" ? "AT RISK" : "Compliant"}\n`;
  content += `Total drills this year: ${totalThisYear}\n`;

  if ((followUpsPending ?? 0) > 0) {
    content += `Follow-ups pending: ${followUpsPending}\n`;
  }

  content += `\n**By type:**\n`;
  for (const c of complianceByType) {
    const status = c.is_overdue ? "OVERDUE" : c.is_at_risk ? "AT RISK" : "OK";
    content += `\n${c.label}: ${status}`;
    if (c.last_drill_date) {
      content += ` (last: ${c.last_drill_date}, ${c.days_since_last}d ago)`;
    } else {
      content += ` (never conducted)`;
    }
    content += ` - ${c.drills_this_year} this year`;
    if (c.average_evacuation_seconds != null) {
      const m = Math.floor(c.average_evacuation_seconds / 60);
      const s = c.average_evacuation_seconds % 60;
      content += `, avg time ${m}:${String(s).padStart(2, "0")}`;
    }
  }

  if ((upcoming ?? []).length > 0) {
    content += `\n\n**Upcoming scheduled:**\n`;
    for (const u of upcoming ?? []) {
      const label =
        DRILL_TYPE_LABELS[u.drill_type as string] ?? (u.drill_type as string);
      content += `  ${u.scheduled_date}${u.scheduled_time ? ` at ${u.scheduled_time}` : ""}: ${label}\n`;
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_emergency_drill_compliance",
    success: true,
    content,
    structured: {
      type: "emergency_drill_compliance",
      data: {
        overall_status: overallStatus,
        total_this_year: totalThisYear,
        follow_ups_pending: followUpsPending ?? 0,
        compliance_by_type: complianceByType,
        upcoming_scheduled: (upcoming ?? []).map((u) => ({
          drill_type: u.drill_type as string,
          scheduled_date: u.scheduled_date as string,
          scheduled_time: (u.scheduled_time as string) ?? null,
        })),
      },
    },
  };
}

// ============================================================
// get_emergency_coordination_status
// ============================================================

const EMERGENCY_EVENT_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

const EMERGENCY_STATUS_LABELS: Record<string, string> = {
  activated: "Activated",
  responding: "Responding",
  all_clear: "All Clear",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export async function handleGetEmergencyCoordinationStatus(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_emergency_coordination_status",
      success: false,
      content: "No tenant context available.",
    };
  }

  // Check for active event
  const { data: activeEvent } = await supabase
    .from("emergency_events")
    .select(
      "id, event_type, severity, status, activated_at, all_clear_at, resolved_at, instructions, assembly_point, activated_by_user:users!emergency_events_activated_by_fkey(first_name, last_name)",
    )
    .eq("tenant_id", tenantId)
    .in("status", ["activated", "responding"])
    .is("deleted_at", null)
    .maybeSingle();

  const lines: string[] = [];

  if (activeEvent) {
    const typeLabel =
      EMERGENCY_EVENT_TYPE_LABELS[activeEvent.event_type as string] ??
      (activeEvent.event_type as string);
    const statusLabel =
      EMERGENCY_STATUS_LABELS[activeEvent.status as string] ??
      (activeEvent.status as string);
    const activatedAt = new Date(activeEvent.activated_at as string);
    const elapsed = Math.floor((Date.now() - activatedAt.getTime()) / 1000);
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const activatorArr = activeEvent.activated_by_user as unknown as
      | { first_name: string; last_name: string }[]
      | null;
    const activator = activatorArr?.[0] ?? null;

    lines.push(`🚨 **ACTIVE EMERGENCY: ${typeLabel}**`);
    lines.push(
      `Status: ${statusLabel} | Severity: ${(activeEvent.severity as string).toUpperCase()}`,
    );
    lines.push(
      `Activated: ${activatedAt.toLocaleString("en-AU")} (${elapsedMin}m ${elapsedSec}s ago)`,
    );
    if (activator)
      lines.push(
        `Activated by: ${activator.first_name} ${activator.last_name}`,
      );
    if (activeEvent.instructions)
      lines.push(`Instructions: ${activeEvent.instructions}`);
    if (activeEvent.assembly_point)
      lines.push(`Assembly point: ${activeEvent.assembly_point}`);

    // Get accountability counts
    const [studentResult, staffResult, zoneResult] = await Promise.all([
      supabase
        .from("emergency_student_accountability")
        .select("accounted_for")
        .eq("tenant_id", tenantId)
        .eq("event_id", activeEvent.id as string)
        .is("deleted_at", null),
      supabase
        .from("emergency_staff_accountability")
        .select("status")
        .eq("tenant_id", tenantId)
        .eq("event_id", activeEvent.id as string)
        .is("deleted_at", null),
      supabase
        .from("emergency_event_zones")
        .select("status")
        .eq("tenant_id", tenantId)
        .eq("event_id", activeEvent.id as string)
        .is("deleted_at", null),
    ]);

    const students = studentResult.data ?? [];
    const studentsAccounted = students.filter((s) => s.accounted_for).length;
    const staff = staffResult.data ?? [];
    const staffAccounted = staff.filter(
      (s) => s.status === "at_assembly" || s.status === "assisting",
    ).length;
    const zones = zoneResult.data ?? [];
    const zonesClear = zones.filter((z) => z.status === "clear").length;
    const zonesNeedHelp = zones.filter(
      (z) => z.status === "needs_assistance" || z.status === "blocked",
    ).length;

    lines.push("");
    lines.push("**Accountability:**");
    lines.push(
      `- Students: ${studentsAccounted}/${students.length} accounted for`,
    );
    lines.push(`- Staff: ${staffAccounted}/${staff.length} checked in`);
    lines.push(
      `- Zones: ${zonesClear}/${zones.length} clear${zonesNeedHelp > 0 ? ` (${zonesNeedHelp} need assistance)` : ""}`,
    );
  } else {
    lines.push("✅ **No active emergency** - all clear.");
  }

  // Recent events
  const { data: recentEvents } = await supabase
    .from("emergency_events")
    .select("event_type, severity, status, activated_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("activated_at", { ascending: false })
    .limit(5);

  if (recentEvents && recentEvents.length > 0) {
    lines.push("");
    lines.push("**Recent Events:**");
    for (const evt of recentEvents) {
      const typeLabel =
        EMERGENCY_EVENT_TYPE_LABELS[evt.event_type as string] ??
        (evt.event_type as string);
      const statusLabel =
        EMERGENCY_STATUS_LABELS[evt.status as string] ?? (evt.status as string);
      const date = new Date(evt.activated_at as string).toLocaleDateString(
        "en-AU",
      );
      lines.push(`- ${date}: ${typeLabel} (${statusLabel})`);
    }
  }

  // Zone config
  const { data: zones } = await supabase
    .from("emergency_zones")
    .select("name, zone_type, is_active")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("sort_order");

  if (zones && zones.length > 0) {
    const activeZones = zones.filter((z) => z.is_active);
    lines.push("");
    lines.push(
      `**Zones Configured:** ${activeZones.length} active out of ${zones.length} total`,
    );
  } else {
    lines.push("");
    lines.push("⚠️ No emergency zones configured yet.");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_emergency_coordination_status",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "emergency_coordination_status",
      data: {
        has_active_event: !!activeEvent,
        active_event_type: activeEvent
          ? (activeEvent.event_type as string)
          : null,
        active_event_severity: activeEvent
          ? (activeEvent.severity as string)
          : null,
        recent_event_count: recentEvents?.length ?? 0,
        zones_configured: zones?.length ?? 0,
      },
    },
  };
}

// ============================================================
// get_pending_excursion_consents (Module H)
// ============================================================

export async function handleGetPendingExcursionConsents(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const excursionName = (args.excursion_name as string) ?? "";

  // If no name given, show upcoming excursions with pending consents
  if (!excursionName.trim()) {
    const today = getTodayDate();
    const { data: upcoming } = await supabase
      .from("excursions")
      .select("id, name, excursion_date, destination, status")
      .gte("excursion_date", today)
      .is("deleted_at", null)
      .in("status", ["consents_pending", "planning", "risk_assessed"])
      .order("excursion_date", { ascending: true })
      .limit(10);

    if (!upcoming || upcoming.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_pending_excursion_consents",
        success: true,
        content: "No upcoming excursions with pending consents found.",
      };
    }

    const lines = ["Upcoming excursions needing consent:"];
    for (const e of upcoming) {
      const { count } = await supabase
        .from("excursion_consents")
        .select("id", { count: "exact", head: true })
        .eq("excursion_id", e.id)
        .eq("consent_status", "pending");
      lines.push(
        `- ${e.name} (${e.excursion_date}, ${e.destination}): ${count ?? 0} pending`,
      );
    }
    return {
      tool_call_id: toolCallId,
      tool_name: "get_pending_excursion_consents",
      success: true,
      content: lines.join("\n"),
    };
  }

  // Find the specific excursion
  const { data: excursions } = await supabase
    .from("excursions")
    .select("id, name, excursion_date, destination, status")
    .ilike("name", `%${excursionName}%`)
    .is("deleted_at", null)
    .order("excursion_date", { ascending: false })
    .limit(1);

  if (!excursions || excursions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_pending_excursion_consents",
      success: false,
      content: `No excursion found matching "${excursionName}".`,
    };
  }

  const excursion = excursions[0] as {
    id: string;
    name: string;
    excursion_date: string;
    destination: string;
    status: string;
  };

  // Get consents with student names
  const { data: consents } = await supabase
    .from("excursion_consents")
    .select(
      "consent_status, student:students(first_name, last_name, preferred_name)",
    )
    .eq("excursion_id", excursion.id);

  const consentList = (consents ?? []).map((c) => {
    const r = c as Record<string, unknown>;
    const student = r.student as {
      first_name: string;
      last_name: string;
      preferred_name: string | null;
    } | null;
    const name = student
      ? student.preferred_name
        ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
        : `${student.first_name} ${student.last_name}`
      : "Unknown";
    return { name, status: r.consent_status as string };
  });

  const total = consentList.length;
  const consented = consentList.filter((c) => c.status === "consented").length;
  const declined = consentList.filter((c) => c.status === "declined").length;
  const pending = consentList.filter((c) => c.status === "pending").length;
  const pendingNames = consentList
    .filter((c) => c.status === "pending")
    .map((c) => c.name);
  const declinedNames = consentList
    .filter((c) => c.status === "declined")
    .map((c) => c.name);

  let content = `**${excursion.name}** - ${excursion.excursion_date} at ${excursion.destination}\n`;
  content += `Status: ${excursion.status}\n`;
  content += `Consents: ${consented}/${total} consented, ${pending} pending, ${declined} declined\n`;
  if (pendingNames.length > 0)
    content += `\nPending: ${pendingNames.join(", ")}`;
  if (declinedNames.length > 0)
    content += `\nDeclined: ${declinedNames.join(", ")}`;

  return {
    tool_call_id: toolCallId,
    tool_name: "get_pending_excursion_consents",
    success: true,
    content,
    structured: {
      type: "excursion_consent_status",
      data: {
        excursion_name: excursion.name,
        excursion_date: excursion.excursion_date,
        destination: excursion.destination,
        status: excursion.status,
        consents: { total, consented, declined, pending },
        pending_students: pendingNames,
        declined_students: declinedNames,
      },
    },
  };
}

// ============================================================
// get_lesson_history (Module J)
// ============================================================

const AREA_LABELS: Record<string, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const STAGE_LABELS: Record<string, string> = {
  introduction: "Introduction",
  practice: "Practice",
  mastery: "Mastery",
};

export async function handleGetLessonHistory(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const areaFilter = (args.area as string) ?? null;

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_lesson_history",
      success: false,
      content: "Please specify a student name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_lesson_history",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_lesson_history",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}": ${matches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  let query = supabase
    .from("lesson_records")
    .select(
      "id, presentation_date, stage, child_response, notes, educator_id, material:montessori_materials(name, area, age_level)",
    )
    .eq("student_id", student.id)
    .order("presentation_date", { ascending: false })
    .limit(30);

  const { data: records, error } = await query;

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_lesson_history",
      success: false,
      content: `Failed to fetch lesson records: ${error.message}`,
    };
  }

  const allRows = (records ?? []).map((r) => {
    const rec = r as Record<string, unknown>;
    const material = rec.material as {
      name: string;
      area: string;
      age_level: string;
    } | null;
    return {
      material_name: material?.name ?? "Unknown",
      area: material?.area ?? "unknown",
      presentation_date: rec.presentation_date as string,
      stage: rec.stage as string,
      child_response: rec.child_response as string | null,
      educator_name: null as string | null,
    };
  });

  // Filter by area client-side if specified
  const rows = areaFilter
    ? allRows.filter((r) => r.area === areaFilter)
    : allRows;

  // Build summary
  const byArea: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  for (const row of rows) {
    byArea[row.area] = (byArea[row.area] ?? 0) + 1;
    byStage[row.stage] = (byStage[row.stage] ?? 0) + 1;
  }

  let content = `**Lesson history for ${displayName}**${areaFilter ? ` (${AREA_LABELS[areaFilter] ?? areaFilter})` : ""}\n`;
  content += `Total: ${rows.length} lessons\n`;

  if (rows.length > 0) {
    content += `\nBy area: ${Object.entries(byArea)
      .map(([a, n]) => `${AREA_LABELS[a] ?? a}: ${n}`)
      .join(", ")}`;
    content += `\nBy stage: ${Object.entries(byStage)
      .map(([s, n]) => `${STAGE_LABELS[s] ?? s}: ${n}`)
      .join(", ")}`;
    content += `\n\nRecent lessons:\n`;
    for (const row of rows.slice(0, 10)) {
      content += `- ${row.presentation_date}: ${row.material_name} (${STAGE_LABELS[row.stage] ?? row.stage})`;
      if (row.child_response) content += ` - ${row.child_response}`;
      content += "\n";
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_lesson_history",
    success: true,
    content,
    structured: {
      type: "lesson_history",
      data: {
        student_name: displayName,
        area_filter: areaFilter,
        records: rows,
        summary: {
          total_lessons: rows.length,
          by_area: byArea,
          by_stage: byStage,
        },
      },
    },
  };
}

// ============================================================
// suggest_next_lesson (Module J)
// ============================================================

export async function handleSuggestNextLesson(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const area = (args.area as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "suggest_next_lesson",
      success: false,
      content: "Please specify a student name.",
    };
  }
  if (!area.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "suggest_next_lesson",
      success: false,
      content:
        "Please specify a Montessori area (practical_life, sensorial, language, mathematics, cultural).",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "suggest_next_lesson",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "suggest_next_lesson",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}". Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Get all materials in this area ordered by sequence
  const { data: materials } = await supabase
    .from("montessori_materials")
    .select(
      "id, name, area, age_level, prerequisite_material_id, sequence_order, eylf_outcome_codes",
    )
    .eq("area", area)
    .eq("is_active", true)
    .order("sequence_order", { ascending: true });

  if (!materials || materials.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "suggest_next_lesson",
      success: false,
      content: `No materials found for area "${AREA_LABELS[area] ?? area}".`,
    };
  }

  // Get the student's lesson history for this area
  const { data: lessonRecords } = await supabase
    .from("lesson_records")
    .select("material_id, stage, child_response")
    .eq("student_id", student.id);

  // Build a map of material_id → best stage reached
  const progressMap = new Map<
    string,
    { stage: string; response: string | null }
  >();
  for (const lr of lessonRecords ?? []) {
    const rec = lr as Record<string, unknown>;
    const materialId = rec.material_id as string;
    const stage = rec.stage as string;
    const existing = progressMap.get(materialId);

    const stageRank: Record<string, number> = {
      introduction: 1,
      practice: 2,
      mastery: 3,
    };
    if (
      !existing ||
      (stageRank[stage] ?? 0) > (stageRank[existing.stage] ?? 0)
    ) {
      progressMap.set(materialId, {
        stage,
        response: rec.child_response as string | null,
      });
    }
  }

  // Build mastered set for prerequisite checking
  const masteredIds = new Set<string>();
  for (const [matId, progress] of progressMap) {
    if (progress.stage === "mastery") masteredIds.add(matId);
  }

  // Find suggestions: materials not yet mastered, prerequisites met
  const suggestions: Array<{
    material_name: string;
    material_id: string;
    reason: string;
    prerequisite_met: boolean;
    age_level: string;
    eylf_outcomes: string[];
  }> = [];

  for (const mat of materials as Array<Record<string, unknown>>) {
    const matId = mat.id as string;
    const progress = progressMap.get(matId);

    // Skip already mastered materials
    if (progress?.stage === "mastery") continue;

    const prereqId = mat.prerequisite_material_id as string | null;
    const prerequisiteMet = !prereqId || masteredIds.has(prereqId);

    let reason: string;
    if (!progress) {
      reason = "Not yet introduced - ready for first presentation";
    } else if (progress.stage === "introduction") {
      reason = `Introduced but needs practice${progress.response === "struggled" ? " (struggled previously)" : ""}`;
    } else if (progress.stage === "practice") {
      reason = `Practicing - ${progress.response === "mastered" ? "ready to confirm mastery" : "continue practice"}`;
    } else {
      reason = "Revisit recommended";
    }

    if (!prerequisiteMet) {
      const prereqMat = (materials as Array<Record<string, unknown>>).find(
        (m) => m.id === prereqId,
      );
      reason += ` (prerequisite: ${(prereqMat?.name as string) ?? "unknown"} not yet mastered)`;
    }

    suggestions.push({
      material_name: mat.name as string,
      material_id: matId,
      reason,
      prerequisite_met: prerequisiteMet,
      age_level: mat.age_level as string,
      eylf_outcomes: (mat.eylf_outcome_codes as string[]) ?? [],
    });

    if (suggestions.length >= 5) break;
  }

  if (suggestions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "suggest_next_lesson",
      success: true,
      content: `${displayName} has mastered all materials in ${AREA_LABELS[area] ?? area}!`,
    };
  }

  let content = `**Next lesson suggestions for ${displayName}** - ${AREA_LABELS[area] ?? area}\n\n`;
  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    content += `${i + 1}. **${s.material_name}** (${s.age_level})\n`;
    content += `   ${s.reason}\n`;
    if (!s.prerequisite_met) content += `   ⚠️ Prerequisite not yet met\n`;
    if (s.eylf_outcomes.length > 0)
      content += `   EYLF: ${s.eylf_outcomes.join(", ")}\n`;
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "suggest_next_lesson",
    success: true,
    content,
    structured: {
      type: "next_lesson_suggestion",
      data: {
        student_name: displayName,
        area: AREA_LABELS[area] ?? area,
        suggestions,
      },
    },
  };
}

// ============================================================
// get_mqap_readiness (Module K)
// ============================================================

export async function handleGetMqapReadiness(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  // Get total criteria count
  const { count: totalCriteria } = await supabase
    .from("mqap_criteria")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const total = totalCriteria ?? 0;

  // Get all assessments (no deleted_at column on this table)
  const { data: assessments } = await supabase
    .from("mqap_assessments")
    .select("criteria_id, rating");

  const ratedCriteria = new Set<string>();
  const byRating: Record<string, number> = {
    working_towards: 0,
    meeting: 0,
    exceeding: 0,
  };

  for (const a of assessments ?? []) {
    const rec = a as Record<string, unknown>;
    if (rec.rating) {
      ratedCriteria.add(rec.criteria_id as string);
      const rating = rec.rating as string;
      byRating[rating] = (byRating[rating] ?? 0) + 1;
    }
  }

  const assessed = ratedCriteria.size;
  const unassessed = total - assessed;

  // Get goals
  const { data: goals } = await supabase
    .from("mqap_goals")
    .select("id, status, due_date")
    .is("deleted_at", null);

  const today = getTodayDate();
  const activeGoals = (goals ?? []).filter(
    (g) => (g as Record<string, unknown>).status !== "achieved",
  ).length;
  const overdueGoals = (goals ?? []).filter((g) => {
    const rec = g as Record<string, unknown>;
    return (
      rec.status !== "achieved" &&
      rec.due_date &&
      (rec.due_date as string) < today
    );
  }).length;

  const readinessPercent = total > 0 ? Math.round((assessed / total) * 100) : 0;

  // Build gap analysis
  const gaps: string[] = [];
  if (unassessed > 0) {
    gaps.push(`${unassessed} criteria still unassessed`);
  }
  if (byRating.working_towards > 0) {
    gaps.push(`${byRating.working_towards} criteria rated "Working Towards"`);
  }
  if (overdueGoals > 0) {
    gaps.push(`${overdueGoals} overdue improvement goals`);
  }
  if (activeGoals === 0 && byRating.working_towards > 0) {
    gaps.push("No active improvement goals for criteria needing work");
  }

  let content = `**MQ:AP Self-Assessment Readiness**\n\n`;
  content += `📊 **${readinessPercent}% assessed** (${assessed}/${total} criteria)\n`;
  content += `- Exceeding: ${byRating.exceeding}\n`;
  content += `- Meeting: ${byRating.meeting}\n`;
  content += `- Working Towards: ${byRating.working_towards}\n`;
  content += `- Unassessed: ${unassessed}\n\n`;
  content += `🎯 Goals: ${activeGoals} active${overdueGoals > 0 ? `, ${overdueGoals} overdue` : ""}\n`;

  if (gaps.length > 0) {
    content += `\n⚠️ **Gaps:**\n`;
    for (const gap of gaps) {
      content += `- ${gap}\n`;
    }
  } else {
    content += `\n✅ Looking good - ready for Montessori Australia submission!`;
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_mqap_readiness",
    success: true,
    content,
    structured: {
      type: "mqap_readiness",
      data: {
        total_criteria: total,
        assessed,
        unassessed,
        by_rating: byRating,
        active_goals: activeGoals,
        overdue_goals: overdueGoals,
        readiness_percent: readinessPercent,
        gaps,
      },
    },
  };
}

// ============================================================
// draft_observation (Module L - AI Enhancement)
// ============================================================
// Context-gathering tool: fetches child info, recent observations,
// and mastery data so the LLM can compose a polished EYLF-mapped
// observation narrative.

export async function handleDraftObservation(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const roughNotes = (args.rough_notes as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_observation",
      success: false,
      content: "Please specify a student name.",
    };
  }
  if (!roughNotes.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_observation",
      success: false,
      content: "Please provide rough notes about the learning moment.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_observation",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_observation",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}": ${matches.map((m) => `${m.first_name} ${m.last_name}`).join(", ")}. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Get recent observations for context
  const { data: recentObs } = await supabase
    .from("observations")
    .select("content, status, created_at")
    .eq("student_id", student.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  // Get mastery data for context
  const { data: masteryData } = await supabase
    .from("mastery_records")
    .select("outcome:curriculum_outcomes(code, description), status")
    .eq("student_id", student.id)
    .in("status", ["mastered", "practicing"])
    .limit(10);

  // Get EYLF outcomes for reference
  const { data: eylf } = await supabase
    .from("curriculum_outcomes")
    .select("code, description")
    .ilike("code", "EYLF%")
    .eq("is_active", true)
    .limit(30);

  const recentObsLines = (recentObs ?? []).map((o) => {
    const rec = o as Record<string, unknown>;
    const content = ((rec.content as string) ?? "").substring(0, 200);
    const date = new Date(rec.created_at as string).toLocaleDateString("en-AU");
    return `  ${date}: ${content}...`;
  });

  const masteryLines = (masteryData ?? [])
    .map((m) => {
      const rec = m as Record<string, unknown>;
      const outcome = rec.outcome as {
        code: string;
        description: string;
      } | null;
      return outcome
        ? `  ${outcome.code}: ${outcome.description} (${rec.status})`
        : null;
    })
    .filter(Boolean);

  const eylfLines = (eylf ?? []).map((e) => {
    const rec = e as Record<string, unknown>;
    return `${rec.code}: ${rec.description}`;
  });

  let content = `**Context for drafting observation for ${displayName}:**\n\n`;
  content += `**Educator's rough notes:** ${roughNotes}\n\n`;

  if (recentObsLines.length > 0) {
    content += `**Recent observations:**\n${recentObsLines.join("\n")}\n\n`;
  }

  if (masteryLines.length > 0) {
    content += `**Current mastery areas:**\n${masteryLines.join("\n")}\n\n`;
  }

  if (eylfLines.length > 0) {
    content += `**EYLF Learning Outcomes for reference:**\n${eylfLines.join("\n")}\n\n`;
  }

  content += `\nPlease draft a professional observation narrative for ${displayName} based on the rough notes above. Include:\n`;
  content += `- What was observed (objective language)\n`;
  content += `- Learning analysis (what this tells us about the child's development)\n`;
  content += `- EYLF outcome connections (cite relevant LO codes)\n`;
  content += `- Extension ideas (what could come next)`;

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_observation",
    success: true,
    content,
  };
}

// ============================================================
// get_qip_suggestions (Module L - AI Enhancement)
// ============================================================
// Analyses attendance, incidents, observations, and lesson data
// to surface actionable QIP improvement ideas.

export async function handleGetQipSuggestions(
  toolCallId: string,
  _args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split("T")[0];
  const suggestions: string[] = [];

  // 1. Attendance patterns - high absence classes
  const { data: attendanceData } = await supabase
    .from("attendance_records")
    .select("class_id, status")
    .gte("date", thirtyDaysAgo)
    .lte("date", today);

  if (attendanceData && attendanceData.length > 0) {
    const classCounts = new Map<string, { total: number; absent: number }>();
    for (const a of attendanceData) {
      const rec = a as Record<string, unknown>;
      const classId = rec.class_id as string;
      const existing = classCounts.get(classId) ?? { total: 0, absent: 0 };
      existing.total++;
      if (rec.status === "absent") existing.absent++;
      classCounts.set(classId, existing);
    }

    for (const [classId, counts] of classCounts) {
      const absentRate =
        counts.total > 0 ? (counts.absent / counts.total) * 100 : 0;
      if (absentRate > 15) {
        // Resolve class name
        const { data: cls } = await supabase
          .from("classes")
          .select("name")
          .eq("id", classId)
          .maybeSingle();
        const className = cls ? (cls as { name: string }).name : classId;
        suggestions.push(
          `QA6 (Collaborative partnerships): ${className} has ${absentRate.toFixed(0)}% absence rate over the last 30 days - consider family engagement strategies`,
        );
      }
    }
  }

  // 2. Incident frequency
  const { count: incidentCount } = await supabase
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .gte("incident_date", thirtyDaysAgo)
    .is("deleted_at", null);

  if ((incidentCount ?? 0) > 10) {
    suggestions.push(
      `QA2 (Children's health and safety): ${incidentCount} incidents in the last 30 days - review risk environments and supervision strategies`,
    );
  }

  // 3. Observation coverage - find under-observed children
  const { data: recentObs } = await supabase
    .from("observations")
    .select("student_id")
    .gte("created_at", thirtyDaysAgo)
    .is("deleted_at", null);

  const { data: activeStudents } = await supabase
    .from("students")
    .select("id")
    .eq("enrollment_status", "active")
    .is("deleted_at", null);

  if (activeStudents && recentObs) {
    const observedIds = new Set(
      (recentObs ?? []).map((o) => (o as { student_id: string }).student_id),
    );
    const unobserved = (activeStudents ?? []).filter(
      (s) => !observedIds.has((s as { id: string }).id),
    );
    if (unobserved.length > 3) {
      suggestions.push(
        `QA1 (Educational program): ${unobserved.length} active children have no observations in the last 30 days - ensure equitable documentation`,
      );
    }
  }

  // 4. Lesson tracking - areas with low activity
  const { data: recentLessons } = await supabase
    .from("lesson_records")
    .select("material:montessori_materials(area)")
    .gte("presentation_date", thirtyDaysAgo);

  if (recentLessons) {
    const areaCounts: Record<string, number> = {};
    for (const l of recentLessons) {
      const rec = l as Record<string, unknown>;
      const material = rec.material as { area: string } | null;
      if (material) {
        areaCounts[material.area] = (areaCounts[material.area] ?? 0) + 1;
      }
    }
    const allAreas = [
      "practical_life",
      "sensorial",
      "language",
      "mathematics",
      "cultural",
    ];
    for (const area of allAreas) {
      if ((areaCounts[area] ?? 0) < 3) {
        suggestions.push(
          `QA1 (Educational program): Few lessons recorded in ${AREA_LABELS[area] ?? area} over the last 30 days - review curriculum balance`,
        );
      }
    }
  }

  // 5. Staff compliance - upcoming expiries
  const twoWeeksFromNow = new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .split("T")[0];
  const { data: expiringDocs } = await supabase
    .from("staff_compliance_records")
    .select("user_id, document_type, expiry_date")
    .lte("expiry_date", twoWeeksFromNow)
    .gte("expiry_date", today);

  if (expiringDocs && expiringDocs.length > 0) {
    suggestions.push(
      `QA4 (Staffing arrangements): ${expiringDocs.length} staff compliance documents expire within 14 days - action required`,
    );
  }

  // 6. QIP progress gaps
  const { data: qipAssessments } = await supabase
    .from("qip_element_assessments")
    .select("element_id, rating")
    .is("deleted_at", null);

  const workingTowards = (qipAssessments ?? []).filter(
    (a) => (a as Record<string, unknown>).rating === "working_towards",
  );
  if (workingTowards.length > 0) {
    const { count: qipGoalCount } = await supabase
      .from("qip_goals")
      .select("id", { count: "exact", head: true })
      .in("status", ["not_started", "in_progress"])
      .is("deleted_at", null);

    if ((qipGoalCount ?? 0) < workingTowards.length) {
      suggestions.push(
        `QA7 (Governance and leadership): ${workingTowards.length} NQS elements rated "Working Towards" but only ${qipGoalCount ?? 0} active goals - ensure each gap has an improvement plan`,
      );
    }
  }

  if (suggestions.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_qip_suggestions",
      success: true,
      content:
        "Great news - no significant data-driven concerns identified. Your service appears well-balanced across all Quality Areas based on the last 30 days of data.",
    };
  }

  let content = `**Data-Driven QIP Suggestions** (based on last 30 days)\n\n`;
  for (let i = 0; i < suggestions.length; i++) {
    content += `${i + 1}. ${suggestions[i]}\n`;
  }
  content += `\nThese are data-informed suggestions - review with your team before adding to your QIP.`;

  return {
    tool_call_id: toolCallId,
    tool_name: "get_qip_suggestions",
    success: true,
    content,
  };
}

// ============================================================
// draft_incident_report (Module L - AI Enhancement)
// ============================================================

export async function handleDraftIncidentReport(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const description = (args.description as string) ?? "";
  const incidentType = (args.incident_type as string) ?? "incident";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_incident_report",
      success: false,
      content: "Please specify the child's name.",
    };
  }
  if (!description.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_incident_report",
      success: false,
      content: "Please describe what happened.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_incident_report",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_incident_report",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}". Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Get child's medical conditions for context
  const { data: medicalData } = await supabase
    .from("medical_conditions")
    .select(
      "condition_name, severity, action_plan, requires_medication, medication_name",
    )
    .eq("student_id", student.id)
    .is("deleted_at", null);

  // Get recent incidents for this child
  const { data: recentIncidents } = await supabase
    .from("incidents")
    .select("incident_type, description, incident_date")
    .eq("student_id", student.id)
    .is("deleted_at", null)
    .order("incident_date", { ascending: false })
    .limit(3);

  const medicalLines = (medicalData ?? []).map((m) => {
    const rec = m as Record<string, unknown>;
    let line = `  ${rec.condition_name} (${rec.severity})`;
    if (rec.requires_medication)
      line += ` - medication: ${rec.medication_name}`;
    return line;
  });

  const recentLines = (recentIncidents ?? []).map((i) => {
    const rec = i as Record<string, unknown>;
    return `  ${rec.incident_date}: ${rec.incident_type} - ${((rec.description as string) ?? "").substring(0, 100)}`;
  });

  let content = `**Context for drafting ${incidentType} report for ${displayName}:**\n\n`;
  content += `**What happened:** ${description}\n`;
  content += `**Type:** ${incidentType}\n`;
  content += `**Date/Time:** ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}\n\n`;

  if (medicalLines.length > 0) {
    content += `**Known medical conditions:**\n${medicalLines.join("\n")}\n\n`;
  }

  if (recentLines.length > 0) {
    content += `**Recent incidents for this child:**\n${recentLines.join("\n")}\n\n`;
  }

  content += `Please draft a formal incident report (Reg 85-87) including:\n`;
  content += `- Factual description of the incident (objective, non-judgemental language)\n`;
  content += `- Time, location, and circumstances\n`;
  content += `- First aid or action taken\n`;
  content += `- Any witnesses\n`;
  content += `- Immediate follow-up steps\n`;
  content += `- Whether parent notification is required (serious incidents must notify within 24 hours)`;

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_incident_report",
    success: true,
    content,
  };
}

// ============================================================
// draft_policy (Module L - AI Enhancement)
// ============================================================

export async function handleDraftPolicy(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const policyTopic = (args.policy_topic as string) ?? "";
  const intent = (args.intent as string) ?? "";

  if (!policyTopic.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_policy",
      success: false,
      content: "Please specify the policy topic.",
    };
  }

  // Check for existing policies on similar topics
  const { data: existingPolicies } = await supabase
    .from("policies")
    .select("title, status, category, review_due_date")
    .ilike("title", `%${policyTopic}%`)
    .is("deleted_at", null)
    .limit(5);

  const existingLines = (existingPolicies ?? []).map((p) => {
    const rec = p as Record<string, unknown>;
    return `  "${rec.title}" (${rec.status}) - review due: ${rec.review_due_date ?? "not set"}`;
  });

  // Reg 168 mandatory policy areas for context
  const reg168Areas = [
    "Health and safety (including hygiene, sun protection, water safety, nutrition)",
    "Incident, injury, trauma, and illness (Reg 85-87)",
    "Infectious diseases",
    "Dealing with medical conditions (including asthma, anaphylaxis, diabetes)",
    "Emergency and evacuation",
    "Delivery and collection of children",
    "Excursions (Reg 100-102)",
    "Providing a child-safe environment",
    "Sleep and rest",
    "Administration of first aid",
    "Interactions with children (behaviour guidance)",
    "Enrolment and orientation",
    "Governance and management of service",
    "Confidentiality of records",
    "Payment of fees and fee schedules",
    "Dealing with complaints",
    "Staffing arrangements (including Code of Conduct)",
  ];

  let content = `**Context for drafting policy on "${policyTopic}":**\n\n`;

  if (intent) {
    content += `**Intent:** ${intent}\n\n`;
  }

  if (existingLines.length > 0) {
    content += `**Existing policies on similar topics:**\n${existingLines.join("\n")}\n\n`;
  }

  content += `**Regulation 168 mandatory policy areas for reference:**\n`;
  for (const area of reg168Areas) {
    content += `- ${area}\n`;
  }

  content += `\nPlease draft a professional policy document including:\n`;
  content += `- Purpose and scope\n`;
  content += `- Regulatory context (cite relevant NQF regulations)\n`;
  content += `- Policy statement\n`;
  content += `- Procedures / implementation steps\n`;
  content += `- Roles and responsibilities\n`;
  content += `- Review date (annual review recommended)\n`;
  content += `- Related policies and legislation`;

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_policy",
    success: true,
    content,
  };
}

// ============================================================
// draft_risk_assessment (Module L - AI Enhancement)
// ============================================================

export async function handleDraftRiskAssessment(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const excursionName = (args.excursion_name as string) ?? "";

  if (!excursionName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_risk_assessment",
      success: false,
      content: "Please specify the excursion name or destination.",
    };
  }

  // Find the excursion
  const { data: excursions } = await supabase
    .from("excursions")
    .select(
      "id, name, excursion_date, destination, transport_type, attending_student_ids, supervising_educator_ids, description",
    )
    .ilike("name", `%${excursionName}%`)
    .is("deleted_at", null)
    .order("excursion_date", { ascending: false })
    .limit(1);

  // Also try destination search
  let excursion: Record<string, unknown> | null = null;
  if (excursions && excursions.length > 0) {
    excursion = excursions[0] as Record<string, unknown>;
  } else {
    const { data: byDest } = await supabase
      .from("excursions")
      .select(
        "id, name, excursion_date, destination, transport_type, attending_student_ids, supervising_educator_ids, description",
      )
      .ilike("destination", `%${excursionName}%`)
      .is("deleted_at", null)
      .order("excursion_date", { ascending: false })
      .limit(1);
    if (byDest && byDest.length > 0) {
      excursion = byDest[0] as Record<string, unknown>;
    }
  }

  // Get past risk assessments for similar destinations
  const { data: pastAssessments } = await supabase
    .from("excursion_risk_assessments")
    .select(
      "hazards, overall_risk_rating, excursion:excursions(name, destination)",
    )
    .not("approved_at", "is", null)
    .limit(3);

  let content = `**Context for drafting excursion risk assessment:**\n\n`;

  if (excursion) {
    const studentCount =
      (excursion.attending_student_ids as string[])?.length ?? 0;
    const educatorCount =
      (excursion.supervising_educator_ids as string[])?.length ?? 0;

    content += `**Excursion details:**\n`;
    content += `- Name: ${excursion.name}\n`;
    content += `- Date: ${excursion.excursion_date}\n`;
    content += `- Destination: ${excursion.destination}\n`;
    content += `- Transport: ${excursion.transport_type}\n`;
    content += `- Children: ${studentCount}\n`;
    content += `- Educators: ${educatorCount}\n`;
    if (excursion.description)
      content += `- Description: ${excursion.description}\n`;
    content += "\n";
  } else {
    content += `No excursion found matching "${excursionName}" - drafting a generic risk assessment for this destination.\n\n`;
  }

  if (pastAssessments && pastAssessments.length > 0) {
    content += `**Past risk assessments for reference:**\n`;
    for (const pa of pastAssessments) {
      const rec = pa as Record<string, unknown>;
      const exc = rec.excursion as { name: string; destination: string } | null;
      const hazards = (rec.hazards as Array<Record<string, unknown>>) ?? [];
      content += `- ${exc?.name ?? "Unknown"} (${exc?.destination ?? ""}): ${hazards.length} hazards identified, overall: ${rec.overall_risk_rating}\n`;
    }
    content += "\n";
  }

  content += `**Standard hazard categories for excursions (Reg 100-102):**\n`;
  content += `- Transport risks (vehicle safety, seatbelts, loading/unloading)\n`;
  content += `- Water safety (if near water bodies)\n`;
  content += `- Sun exposure and weather\n`;
  content += `- Terrain and physical environment\n`;
  content += `- Stranger danger / supervision ratios\n`;
  content += `- Allergies and medical conditions\n`;
  content += `- Lost child procedures\n`;
  content += `- Communication (mobile coverage, emergency contacts)\n\n`;

  content += `Please draft a risk assessment with a hazard table including:\n`;
  content += `- Hazard description\n`;
  content += `- Likelihood (low/medium/high)\n`;
  content += `- Consequence (low/medium/high)\n`;
  content += `- Control measures\n`;
  content += `- Residual risk rating`;

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_risk_assessment",
    success: true,
    content,
  };
}

// ============================================================
// draft_parent_comms (Module L - AI Enhancement)
// ============================================================

export async function handleDraftParentComms(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const commsType = (args.comms_type as string) ?? "general_notice";
  const context = (args.context as string) ?? "";
  const studentName = (args.student_name as string) ?? "";

  if (!context.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_parent_comms",
      success: false,
      content: "Please describe what the communication is about.",
    };
  }

  // Get service name for letterhead
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .limit(1)
    .maybeSingle();
  const serviceName = tenant
    ? (tenant as { name: string }).name
    : "our service";

  let studentContext = "";
  if (studentName.trim()) {
    const matches = await resolveStudentByName(supabase, studentName);
    if (matches.length === 1) {
      const student = matches[0];
      const displayName = student.preferred_name
        ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
        : `${student.first_name} ${student.last_name}`;

      if (
        commsType === "injury_notification" ||
        commsType === "incident_summary"
      ) {
        // Get the most recent incident for this child
        const { data: incidents } = await supabase
          .from("incidents")
          .select(
            "incident_type, description, incident_date, severity, first_aid_given",
          )
          .eq("student_id", student.id)
          .is("deleted_at", null)
          .order("incident_date", { ascending: false })
          .limit(1);

        if (incidents && incidents.length > 0) {
          const inc = incidents[0] as Record<string, unknown>;
          studentContext += `\n**Most recent incident for ${displayName}:**\n`;
          studentContext += `- Type: ${inc.incident_type}\n`;
          studentContext += `- Date: ${inc.incident_date}\n`;
          studentContext += `- Description: ${inc.description}\n`;
          if (inc.first_aid_given)
            studentContext += `- First aid: ${inc.first_aid_given}\n`;
        }
      }

      studentContext += `\n**Child:** ${displayName}\n`;
    }
  }

  const typeLabels: Record<string, string> = {
    injury_notification: "Injury Notification Letter",
    incident_summary: "Incident Summary Letter",
    policy_change: "Policy Change Notification",
    general_notice: "General Notice to Families",
  };

  let content = `**Context for drafting ${typeLabels[commsType] ?? commsType}:**\n\n`;
  content += `**Service:** ${serviceName}\n`;
  content += `**What this is about:** ${context}\n`;
  content += studentContext;

  content += `\nPlease draft a professional, empathetic parent communication including:\n`;

  if (commsType === "injury_notification") {
    content += `- Clear factual account of what happened\n`;
    content += `- First aid or medical treatment provided\n`;
    content += `- The child's current condition\n`;
    content += `- Any follow-up actions or monitoring\n`;
    content += `- Contact details for questions\n`;
    content += `- Empathetic and reassuring tone`;
  } else if (commsType === "incident_summary") {
    content += `- Summary of the incident (appropriate details for parents)\n`;
    content += `- Actions taken by the service\n`;
    content += `- Steps to prevent recurrence\n`;
    content += `- Contact details for further discussion`;
  } else if (commsType === "policy_change") {
    content += `- What is changing and why\n`;
    content += `- When the change takes effect\n`;
    content += `- How it affects families\n`;
    content += `- Where to find the full policy\n`;
    content += `- How to provide feedback (14-day consultation period per Reg 172)`;
  } else {
    content += `- Clear purpose and key information\n`;
    content += `- Any actions required from families\n`;
    content += `- Relevant dates and deadlines\n`;
    content += `- Contact details for questions`;
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_parent_comms",
    success: true,
    content,
  };
}

// ============================================================
// Module O: Daily Care Log Tools
// ============================================================

export async function handleGetDailyCareSummary(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;

  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_daily_care_summary",
      success: false,
      content: "No tenant context available.",
    };
  }

  const dateArg = (args.date as string) ?? getTodayDate();
  const studentName = (args.student_name as string) ?? "";
  const dateDisplay = formatDateForDisplay(dateArg);

  // If a specific child was named, resolve to student ID first
  let studentFilter: string | null = null;
  let resolvedStudentName: string | null = null;

  if (studentName.trim()) {
    const matches = await resolveStudentByName(supabase, studentName);
    if (matches.length === 0) {
      return {
        tool_call_id: toolCallId,
        tool_name: "get_daily_care_summary",
        success: false,
        content: `No child found matching "${studentName}".`,
      };
    }
    if (matches.length > 1) {
      // Try exact first-name match to narrow
      const exact = matches.filter(
        (m) =>
          m.first_name.toLowerCase() === studentName.toLowerCase() ||
          (m.preferred_name &&
            m.preferred_name.toLowerCase() === studentName.toLowerCase()),
      );
      if (exact.length === 1) {
        studentFilter = exact[0].id;
        resolvedStudentName = exact[0].preferred_name
          ? `${exact[0].first_name} "${exact[0].preferred_name}" ${exact[0].last_name}`
          : `${exact[0].first_name} ${exact[0].last_name}`;
      } else {
        const names = matches.map((m) =>
          m.preferred_name
            ? `${m.first_name} "${m.preferred_name}" ${m.last_name}`
            : `${m.first_name} ${m.last_name}`,
        );
        return {
          tool_call_id: toolCallId,
          tool_name: "get_daily_care_summary",
          success: false,
          content: `Multiple children match "${studentName}": ${names.join(", ")}. Please be more specific.`,
        };
      }
    } else {
      studentFilter = matches[0].id;
      resolvedStudentName = matches[0].preferred_name
        ? `${matches[0].first_name} "${matches[0].preferred_name}" ${matches[0].last_name}`
        : `${matches[0].first_name} ${matches[0].last_name}`;
    }
  }

  // Query daily_care_logs for the given date
  let logsQuery = supabase
    .from("daily_care_logs")
    .select(
      "id, student_id, log_date, status, students!inner(id, first_name, last_name, preferred_name)",
    )
    .eq("tenant_id", tenantId)
    .eq("log_date", dateArg)
    .is("deleted_at", null);

  if (studentFilter) {
    logsQuery = logsQuery.eq("student_id", studentFilter);
  }

  const { data: logs, error: logError } = await logsQuery;

  if (logError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_daily_care_summary",
      success: false,
      content: `Database error: ${logError.message}`,
    };
  }

  if (!logs || logs.length === 0) {
    const whom = resolvedStudentName ? ` for ${resolvedStudentName}` : "";
    return {
      tool_call_id: toolCallId,
      tool_name: "get_daily_care_summary",
      success: true,
      content: `No daily care logs found${whom} on ${dateDisplay}.`,
    };
  }

  // Fetch all entries for these logs
  const logIds = logs.map((l) => (l as Record<string, unknown>).id as string);

  const { data: entries, error: entryError } = await supabase
    .from("daily_care_entries")
    .select("id, log_id, entry_type, recorded_at, notes")
    .in("log_id", logIds)
    .is("deleted_at", null)
    .order("recorded_at", { ascending: true });

  if (entryError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_daily_care_summary",
      success: false,
      content: `Database error: ${entryError.message}`,
    };
  }

  const allEntries = (entries ?? []) as Array<Record<string, unknown>>;

  // Aggregate counts
  let nappyChanges = 0;
  let meals = 0;
  let bottles = 0;
  let sleeps = 0;
  let sunscreen = 0;
  let wellbeingNotes = 0;

  for (const e of allEntries) {
    switch (e.entry_type) {
      case "nappy_change":
        nappyChanges++;
        break;
      case "meal":
        meals++;
        break;
      case "bottle":
        bottles++;
        break;
      case "sleep_start":
        sleeps++;
        break;
      case "sunscreen":
        sunscreen++;
        break;
      case "wellbeing_note":
        wellbeingNotes++;
        break;
    }
  }

  // Build per-child info
  const logEntryCount: Record<string, number> = {};
  for (const e of allEntries) {
    const logId = e.log_id as string;
    logEntryCount[logId] = (logEntryCount[logId] ?? 0) + 1;
  }

  const children: Array<{
    student_name: string;
    entry_count: number;
    status: string;
  }> = [];
  for (const log of logs as Array<Record<string, unknown>>) {
    const student = Array.isArray(log.students)
      ? log.students[0]
      : log.students;
    const s = student as {
      first_name: string;
      last_name: string;
      preferred_name: string | null;
    } | null;
    const name = s
      ? s.preferred_name
        ? `${s.first_name} "${s.preferred_name}" ${s.last_name}`
        : `${s.first_name} ${s.last_name}`
      : "Unknown";
    children.push({
      student_name: name,
      entry_count: logEntryCount[log.id as string] ?? 0,
      status: log.status as string,
    });
  }

  // Build human-readable summary
  const whom = resolvedStudentName ? ` for ${resolvedStudentName}` : "";
  const lines: string[] = [
    `**Daily Care Summary${whom} - ${dateDisplay}**`,
    "",
    `Children with logs: ${logs.length}`,
    "",
    "**Entry counts:**",
  ];

  if (nappyChanges > 0) lines.push(`- Nappy changes: ${nappyChanges}`);
  if (meals > 0) lines.push(`- Meals: ${meals}`);
  if (bottles > 0) lines.push(`- Bottles: ${bottles}`);
  if (sleeps > 0) lines.push(`- Sleep periods: ${sleeps}`);
  if (sunscreen > 0) lines.push(`- Sunscreen applications: ${sunscreen}`);
  if (wellbeingNotes > 0) lines.push(`- Wellbeing notes: ${wellbeingNotes}`);

  if (
    nappyChanges + meals + bottles + sleeps + sunscreen + wellbeingNotes ===
    0
  ) {
    lines.push("- No entries recorded yet");
  }

  if (!studentFilter && children.length > 0) {
    lines.push("", "**Per child:**");
    for (const c of children) {
      const statusLabel =
        c.status === "shared" ? " (shared)" : " (in progress)";
      lines.push(`- ${c.student_name}: ${c.entry_count} entries${statusLabel}`);
    }
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_daily_care_summary",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "daily_care_summary",
      data: {
        date: dateArg,
        date_display: dateDisplay,
        total_children: logs.length,
        summary: {
          nappy_changes: nappyChanges,
          meals,
          bottles,
          sleeps,
          sunscreen,
          wellbeing_notes: wellbeingNotes,
        },
        children,
      },
    },
  };
}

export async function handleGetChildCareLogToday(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;

  if (!tenantId) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_care_log_today",
      success: false,
      content: "No tenant context available.",
    };
  }

  const studentName = (args.student_name as string) ?? "";
  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_care_log_today",
      success: false,
      content: "Please specify a child's name.",
    };
  }

  // Resolve student
  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_care_log_today",
      success: false,
      content: `No child found matching "${studentName}".`,
    };
  }

  let student = matches[0];
  if (matches.length > 1) {
    const exact = matches.filter(
      (m) =>
        m.first_name.toLowerCase() === studentName.toLowerCase() ||
        (m.preferred_name &&
          m.preferred_name.toLowerCase() === studentName.toLowerCase()),
    );
    if (exact.length === 1) {
      student = exact[0];
    } else {
      const names = matches.map((m) =>
        m.preferred_name
          ? `${m.first_name} "${m.preferred_name}" ${m.last_name}`
          : `${m.first_name} ${m.last_name}`,
      );
      return {
        tool_call_id: toolCallId,
        tool_name: "get_child_care_log_today",
        success: false,
        content: `Multiple children match "${studentName}": ${names.join(", ")}. Please be more specific.`,
      };
    }
  }

  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const today = getTodayDate();
  const todayDisplay = formatDateForDisplay(today);

  // Query the log for today
  const { data: log, error: logError } = await supabase
    .from("daily_care_logs")
    .select("id, log_date, status, general_notes")
    .eq("tenant_id", tenantId)
    .eq("student_id", student.id)
    .eq("log_date", today)
    .is("deleted_at", null)
    .maybeSingle();

  if (logError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_care_log_today",
      success: false,
      content: `Database error: ${logError.message}`,
    };
  }

  if (!log) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_care_log_today",
      success: true,
      content: `No daily care log found for ${displayName} today (${todayDisplay}).`,
    };
  }

  const logRow = log as Record<string, unknown>;
  const logId = logRow.id as string;
  const logStatus = logRow.status as string;
  const generalNotes = logRow.general_notes as string | null;

  // Fetch all entries for this log
  const { data: entries, error: entryError } = await supabase
    .from("daily_care_entries")
    .select(
      "id, entry_type, recorded_at, notes, nappy_type, nappy_cream_applied, meal_type, food_offered, food_consumed, bottle_contents, bottle_amount_ml, sunscreen_type, wellbeing_mood, wellbeing_description",
    )
    .eq("log_id", logId)
    .is("deleted_at", null)
    .order("recorded_at", { ascending: true });

  if (entryError) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_child_care_log_today",
      success: false,
      content: `Database error: ${entryError.message}`,
    };
  }

  const allEntries = (entries ?? []) as Array<Record<string, unknown>>;

  // Format each entry
  const entryTypeLabels: Record<string, string> = {
    nappy_change: "Nappy Change",
    meal: "Meal",
    bottle: "Bottle",
    sleep_start: "Sleep Start",
    sleep_end: "Sleep End",
    sunscreen: "Sunscreen",
    wellbeing_note: "Wellbeing Note",
  };

  const structuredEntries: Array<{
    time: string;
    type: string;
    details: string;
    notes: string | null;
  }> = [];

  const lines: string[] = [
    `**${displayName}'s Care Log - ${todayDisplay}**`,
    `Status: ${logStatus === "shared" ? "Shared with family" : "In progress"}`,
    "",
  ];

  for (const e of allEntries) {
    const recordedAt = e.recorded_at as string;
    const time = new Date(recordedAt).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const entryType = e.entry_type as string;
    const label = entryTypeLabels[entryType] ?? entryType;
    const notes = (e.notes as string | null) || null;

    // Build details string based on entry type
    let details = "";
    switch (entryType) {
      case "nappy_change": {
        const nappyType = e.nappy_type as string | null;
        const cream = e.nappy_cream_applied as boolean | null;
        details = nappyType
          ? nappyType.charAt(0).toUpperCase() + nappyType.slice(1)
          : "Changed";
        if (cream) details += ", cream applied";
        break;
      }
      case "meal": {
        const mealType = e.meal_type as string | null;
        const offered = e.food_offered as string | null;
        const consumed = e.food_consumed as string | null;
        const parts: string[] = [];
        if (mealType)
          parts.push(
            mealType.charAt(0).toUpperCase() +
              mealType.slice(1).replace("_", " "),
          );
        if (offered) parts.push(offered);
        if (consumed) parts.push(`(${consumed.replace("_", " ")})`);
        details = parts.join(" - ") || "Recorded";
        break;
      }
      case "bottle": {
        const contents = e.bottle_contents as string | null;
        const amountMl = e.bottle_amount_ml as number | null;
        const parts: string[] = [];
        if (contents)
          parts.push(contents.charAt(0).toUpperCase() + contents.slice(1));
        if (amountMl) parts.push(`${amountMl}ml`);
        details = parts.join(", ") || "Recorded";
        break;
      }
      case "sleep_start":
        details = "Went to sleep";
        break;
      case "sleep_end":
        details = "Woke up";
        break;
      case "sunscreen": {
        const sunType = e.sunscreen_type as string | null;
        details = sunType ? `Applied (${sunType})` : "Applied";
        break;
      }
      case "wellbeing_note": {
        const mood = e.wellbeing_mood as string | null;
        const desc = e.wellbeing_description as string | null;
        const parts: string[] = [];
        if (mood) parts.push(mood.charAt(0).toUpperCase() + mood.slice(1));
        if (desc) parts.push(desc);
        details = parts.join(" - ") || "Noted";
        break;
      }
      default:
        details = "Recorded";
    }

    lines.push(
      `**${time}** - ${label}: ${details}${notes ? ` (${notes})` : ""}`,
    );

    structuredEntries.push({
      time,
      type: label,
      details,
      notes,
    });
  }

  if (allEntries.length === 0) {
    lines.push("No entries recorded yet today.");
  }

  if (generalNotes) {
    lines.push("", `**Educator notes:** ${generalNotes}`);
  }

  lines.push("", `Total entries: ${allEntries.length}`);

  return {
    tool_call_id: toolCallId,
    tool_name: "get_child_care_log_today",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "daily_care_log_detail",
      data: {
        student_name: displayName,
        date: today,
        date_display: todayDisplay,
        status: logStatus,
        entries: structuredEntries,
      },
    },
  };
}

// ============================================================
// School Photos (Module R) - Photo Coverage Handler
// ============================================================

export async function handleGetPhotoCoverage(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  // Student coverage
  const { count: totalStudents } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .in("enrollment_status", ["active", "enrolled"])
    .is("deleted_at", null);

  const { count: studentsWithPhoto } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .in("enrollment_status", ["active", "enrolled"])
    .not("photo_url", "is", null)
    .is("deleted_at", null);

  // Staff coverage
  const { count: totalStaff } = await supabase
    .from("tenant_members")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active");

  const { count: staffWithPhoto } = await supabase
    .from("tenant_members")
    .select("user_id, users!inner(avatar_url)", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("status", "active")
    .not("users.avatar_url", "is", null);

  // Last session
  const { data: lastSession } = await supabase
    .from("photo_sessions")
    .select("name, session_date, status")
    .eq("tenant_id", ctx.tenantId)
    .is("deleted_at", null)
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const studentTotal = totalStudents ?? 0;
  const studentWithPhoto = studentsWithPhoto ?? 0;
  const staffTotal = totalStaff ?? 0;
  const staffWithPhotoCount = staffWithPhoto ?? 0;

  const studentPct =
    studentTotal > 0 ? Math.round((studentWithPhoto / studentTotal) * 100) : 0;
  const staffPct =
    staffTotal > 0 ? Math.round((staffWithPhotoCount / staffTotal) * 100) : 0;

  const lines: string[] = [
    "## Photo Coverage Report",
    "",
    `**Students:** ${studentWithPhoto} of ${studentTotal} have photos (${studentPct}%)`,
    `**Staff:** ${staffWithPhotoCount} of ${staffTotal} have photos (${staffPct}%)`,
  ];

  if (lastSession) {
    lines.push(
      "",
      `**Last session:** ${lastSession.name} on ${new Date(lastSession.session_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} (${lastSession.status})`,
    );
  } else {
    lines.push("", "No photo sessions have been created yet.");
  }

  if (studentTotal - studentWithPhoto > 0) {
    lines.push(
      "",
      `**${studentTotal - studentWithPhoto} students** still need photos.`,
    );
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_photo_coverage",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "photo_coverage" as const,
      data: {
        student_total: studentTotal,
        student_with_photo: studentWithPhoto,
        student_percentage: studentPct,
        staff_total: staffTotal,
        staff_with_photo: staffWithPhotoCount,
        staff_percentage: staffPct,
        last_session: lastSession
          ? {
              name: lastSession.name as string,
              session_date: lastSession.session_date as string,
              status: lastSession.status as string,
            }
          : null,
      },
    },
  };
}

// ============================================================
// draft_medication_plan (Module B - Medical Plans)
// ============================================================

export async function handleDraftMedicationPlan(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const studentName = (args.student_name as string) ?? "";
  const conditionType = (args.condition_type as string) ?? "other";
  const roughNotes = (args.rough_notes as string) ?? "";

  if (!studentName.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_medication_plan",
      success: false,
      content: "Please specify the child's name.",
    };
  }

  const matches = await resolveStudentByName(supabase, studentName);
  if (matches.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_medication_plan",
      success: false,
      content: `No student found matching "${studentName}".`,
    };
  }
  if (matches.length > 1) {
    const names = matches
      .map((s) => `${s.first_name} ${s.last_name}`)
      .join(", ");
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_medication_plan",
      success: false,
      content: `Found ${matches.length} students matching "${studentName}": ${names}. Please be more specific.`,
    };
  }

  const student = matches[0];
  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  // Fetch student DOB separately (not included in resolveStudentByName)
  const { data: studentDetail } = await supabase
    .from("students")
    .select("dob")
    .eq("id", student.id)
    .single();
  const dob = (studentDetail as { dob?: string | null } | null)?.dob
    ? `DOB: ${(studentDetail as { dob: string }).dob}`
    : "Date of birth: not recorded";

  // Fetch existing medical conditions for this child
  const { data: conditions } = await supabase
    .from("medical_conditions")
    .select(
      "condition_name, condition_type, severity, symptoms, triggers, action_plan, requires_medication, medication_name, medication_dose, medication_route",
    )
    .eq("student_id", student.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  // Fetch existing management plans
  const { data: existingPlans } = await supabase
    .from("medical_management_plans")
    .select("plan_type, expiry_date, is_active, plan_summary")
    .eq("student_id", student.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Fetch active medication authorisations
  const { data: authorisations } = await supabase
    .from("medication_authorisations")
    .select("medication_name, dose, route, frequency, reason, valid_until")
    .eq("student_id", student.id)
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .is("deleted_at", null);

  const conditionLines = (conditions ?? []).map((c) => {
    const rec = c as Record<string, unknown>;
    let line = `  - ${rec.condition_name} (${rec.condition_type}, ${rec.severity} severity)`;
    if (rec.triggers) line += `\n    Triggers: ${rec.triggers}`;
    if (rec.symptoms) line += `\n    Symptoms: ${rec.symptoms}`;
    if (rec.requires_medication && rec.medication_name) {
      line += `\n    Medication: ${rec.medication_name} ${rec.medication_dose ?? ""} via ${rec.medication_route ?? ""}`;
    }
    if (rec.action_plan) line += `\n    Action plan: ${rec.action_plan}`;
    return line;
  });

  const planLines = (existingPlans ?? []).map((p) => {
    const rec = p as Record<string, unknown>;
    const status = rec.is_active ? "Active" : "Inactive";
    const expiry = rec.expiry_date
      ? `expires ${rec.expiry_date}`
      : "no expiry recorded";
    return `  - ${rec.plan_type} plan - ${status}, ${expiry}`;
  });

  const authLines = (authorisations ?? []).map((a) => {
    const rec = a as Record<string, unknown>;
    const validUntil = rec.valid_until
      ? ` (valid until ${rec.valid_until})`
      : "";
    return `  - ${rec.medication_name} ${rec.dose ?? ""} ${rec.route ?? ""} ${rec.frequency ?? ""}${validUntil} - reason: ${rec.reason ?? "not specified"}`;
  });

  let content = `**Context for drafting a ${conditionType} medical management plan for ${displayName}:**\n\n`;
  content += `**${dob}**\n\n`;
  content += `**Plan type requested:** ${conditionType} management plan\n`;
  content += `**Educator notes:** ${roughNotes}\n\n`;

  if (conditionLines.length > 0) {
    content += `**Existing medical conditions on file:**\n${conditionLines.join("\n")}\n\n`;
  } else {
    content += `**Existing medical conditions:** None recorded - you may need to add a medical condition first.\n\n`;
  }

  if (planLines.length > 0) {
    content += `**Existing management plans:**\n${planLines.join("\n")}\n\n`;
  } else {
    content += `**Existing management plans:** None on file - this will be the first plan.\n\n`;
  }

  if (authLines.length > 0) {
    content += `**Active medication authorisations:**\n${authLines.join("\n")}\n\n`;
  }

  const planTypeGuidance: Record<string, string> = {
    anaphylaxis:
      "ASCIA Anaphylaxis Action Plan - include: trigger allergens, early warning signs, emergency response steps (position, EpiPen administration, call 000), hospital transport instructions, and parent/guardian emergency contacts. The plan must be reviewed and signed annually by an ASCIA-credentialed allergist or GP.",
    asthma:
      "Asthma Australia Action Plan - include: preventer medication details, reliever medication (Blue Puffer), early symptom signs, moderate/severe episode response steps, when to call 000, and GP or specialist contact. Review annually.",
    diabetes:
      "Diabetes Australia Management Plan - include: target blood glucose ranges, hypoglycaemia signs and treatment (fast-acting carbohydrates), hyperglycaemia response, insulin administration procedures (if applicable), meal/snack schedule, and emergency contacts including endocrinologist.",
    other:
      "Medical Management Plan - include: condition description, symptoms to monitor, step-by-step emergency response, medications to administer, when to call 000, and authorised GP/specialist contact for this plan.",
  };

  content += `**Plan requirements (${conditionType}):**\n${planTypeGuidance[conditionType] ?? planTypeGuidance.other}\n\n`;
  content += `Please draft a complete medical management plan for ${displayName} covering the above requirements. The plan should be suitable for printing and signing by the treating clinician.`;

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_medication_plan",
    success: true,
    content,
  };
}

// ============================================================
// draft_staff_compliance_action (Module C - Staff Compliance)
// ============================================================

export async function handleDraftStaffComplianceAction(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const staffNameOrEmail = (args.staff_name_or_email as string) ?? "";
  const urgencyContext = (args.urgency_context as string) ?? "";

  if (!staffNameOrEmail.trim()) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_staff_compliance_action",
      success: false,
      content: "Please specify the staff member's name or email.",
    };
  }

  // Resolve staff member - search by name or email within tenant
  const { data: members } = await supabase
    .from("tenant_members")
    .select("user_id, users(id, first_name, last_name, email)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!members || members.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_staff_compliance_action",
      success: false,
      content: "No staff members found in this service.",
    };
  }

  // Filter by name or email
  const searchTerm = staffNameOrEmail.toLowerCase().trim();
  const matched = members.filter((m) => {
    const rawU = m.users as unknown as
      | {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }
      | Array<{
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string;
        }>;
    const u = Array.isArray(rawU) ? rawU[0] : rawU;
    if (!u) return false;
    const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase();
    return (
      fullName.includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm)
    );
  });

  if (matched.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_staff_compliance_action",
      success: false,
      content: `No staff member found matching "${staffNameOrEmail}".`,
    };
  }
  if (matched.length > 1) {
    const names = matched.map((m) => {
      const rawU = m.users as unknown as Array<{
        first_name: string | null;
        last_name: string | null;
      }>;
      const u = Array.isArray(rawU)
        ? rawU[0]
        : (rawU as unknown as {
            first_name: string | null;
            last_name: string | null;
          } | null);
      return `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
    });
    return {
      tool_call_id: toolCallId,
      tool_name: "draft_staff_compliance_action",
      success: false,
      content: `Found ${matched.length} staff matching "${staffNameOrEmail}": ${names.join(", ")}. Please be more specific.`,
    };
  }

  const member = matched[0];
  const rawU = member.users as unknown as
    | {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
      }
    | Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
      }>;
  const u = Array.isArray(rawU) ? rawU[0] : rawU;
  const displayName =
    `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
  const userId = member.user_id;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const warningDate = new Date(today);
  warningDate.setDate(today.getDate() + 60);
  const warningStr = warningDate.toISOString().split("T")[0];

  // Fetch compliance profile + certificates in parallel
  const [profileRes, certsRes] = await Promise.all([
    supabase
      .from("staff_compliance_profiles")
      .select(
        "wwcc_number, wwcc_state, wwcc_expiry, wwcc_last_verified, highest_qualification, geccko_completion_date, position_title, employment_start_date",
      )
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("staff_certificates")
      .select("cert_type, cert_name, expiry_date")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
  ]);

  const profile = profileRes.data;
  const certs = certsRes.data ?? [];

  const gaps: string[] = [];
  const actions: string[] = [];

  // WWCC check
  if (!profile?.wwcc_number) {
    gaps.push("WWCC: **Not recorded**");
    actions.push(
      "1. Obtain WWCC details from staff member and record in their compliance profile.",
    );
  } else if (profile.wwcc_expiry && profile.wwcc_expiry < todayStr) {
    gaps.push(
      `WWCC: **EXPIRED** (${profile.wwcc_expiry}, ${profile.wwcc_state ?? "unknown state"})`,
    );
    actions.push(
      `1. WWCC for ${profile.wwcc_state ?? "their state"} has expired. Staff member must renew immediately via ${profile.wwcc_state === "VIC" ? "Working with Children Check (Service Victoria)" : "their state's relevant authority"} before returning to direct supervision.`,
    );
  } else if (profile.wwcc_expiry && profile.wwcc_expiry <= warningStr) {
    const daysLeft = Math.ceil(
      (new Date(profile.wwcc_expiry).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    gaps.push(
      `WWCC: **Expiring soon** (${profile.wwcc_expiry} - ${daysLeft} days, ${profile.wwcc_state ?? "unknown state"})`,
    );
    actions.push(
      `1. WWCC expires in ${daysLeft} days. Initiate renewal now via ${profile.wwcc_state === "VIC" ? "Service Victoria (service.vic.gov.au)" : "their state's relevant authority"}.`,
    );
  }

  // Geccko check
  if (!profile?.geccko_completion_date) {
    gaps.push("Geccko child safety training: **Not completed**");
    actions.push(
      `${actions.length + 1}. Geccko child safety training is mandatory from 27 February 2026. Enrol at: geccko.com.au - staff must complete the online module and record the completion date.`,
    );
  }

  // Certificate checks
  const certTypes = [
    "first_aid",
    "cpr",
    "anaphylaxis",
    "asthma",
    "food_safety",
  ] as const;
  const certLabels: Record<string, string> = {
    first_aid: "First Aid (HLTAID011)",
    cpr: "CPR (HLTAID009)",
    anaphylaxis: "Anaphylaxis Management (HLTAID014)",
    asthma: "Asthma First Aid",
    food_safety: "Food Safety Supervisor (SITXFSA005)",
  };

  for (const certType of certTypes) {
    const matching = certs.filter((c) => c.cert_type === certType);
    const active = matching.filter(
      (c) => !c.expiry_date || c.expiry_date >= todayStr,
    );

    if (active.length === 0) {
      const expired = matching.filter(
        (c) => c.expiry_date && c.expiry_date < todayStr,
      );
      if (expired.length > 0) {
        const expiredDate = expired.sort((a, b) =>
          (b.expiry_date ?? "").localeCompare(a.expiry_date ?? ""),
        )[0].expiry_date;
        gaps.push(`${certLabels[certType]}: **EXPIRED** (${expiredDate})`);
        actions.push(
          `${actions.length + 1}. Book a ${certLabels[certType]} refresher course. Providers: St John Ambulance (stjohnvic.com.au), Australian Red Cross, or registered RTO. Update certificate record once renewed.`,
        );
      } else {
        gaps.push(`${certLabels[certType]}: **Not on file**`);
        actions.push(
          `${actions.length + 1}. Obtain ${certLabels[certType]} certificate and upload to staff compliance record. Book at a registered RTO if not yet completed.`,
        );
      }
    } else {
      // Check for expiring within 60 days
      const expiringSoon = active.filter(
        (c) => c.expiry_date && c.expiry_date <= warningStr,
      );
      if (expiringSoon.length > 0) {
        const soonest = expiringSoon.sort((a, b) =>
          (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""),
        )[0].expiry_date;
        const daysLeft = Math.ceil(
          (new Date(soonest!).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        gaps.push(
          `${certLabels[certType]}: **Expiring soon** (${soonest} - ${daysLeft} days)`,
        );
        actions.push(
          `${actions.length + 1}. Book ${certLabels[certType]} renewal - expires in ${daysLeft} days. Book now to avoid lapsing.`,
        );
      }
    }
  }

  let content = `**Compliance Action Plan for ${displayName}**\n\n`;
  if (urgencyContext) content += `**Context:** ${urgencyContext}\n\n`;
  content += `**Position:** ${profile?.position_title ?? "Not recorded"}\n`;
  content += `**Qualification:** ${profile?.highest_qualification ?? "Not recorded"}\n\n`;

  if (gaps.length === 0) {
    content += `**Status: Fully compliant** - no gaps identified within the next 60 days.\n\n`;
    content += `Verification date: ${todayStr}. Recommend re-checking at next annual compliance review.`;
  } else {
    content += `**Compliance Gaps (${gaps.length}):**\n`;
    content += gaps.map((g) => `- ${g}`).join("\n");
    content += `\n\n**Recommended Actions:**\n`;
    content += actions.join("\n");
    content += `\n\n**Timeline:** Address all gaps as a matter of urgency. Regulation 136 requires all staff to hold current WWCC, and Regulation 145 requires relevant qualifications to be maintained.`;
    content += `\n\nView the full compliance record at: /admin/staff-compliance/${userId}`;
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "draft_staff_compliance_action",
    success: true,
    content,
  };
}

// ============================================================
// get_volunteer_roster
// ============================================================

export async function handleGetVolunteerRoster(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const today = getTodayDate();
  const soonDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [volunteersRes, assignmentsRes] = await Promise.all([
    supabase
      .from("volunteers")
      .select(
        "id, first_name, last_name, wwcc_number, wwcc_expiry_date, wwcc_state, status",
      )
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("last_name"),
    supabase
      .from("volunteer_assignments")
      .select(
        "id, event_name, event_date, role, status, volunteer:volunteers(first_name, last_name)",
      )
      .eq("tenant_id", tenantId)
      .gte("event_date", today)
      .in("status", ["invited", "confirmed"])
      .order("event_date")
      .limit(20),
  ]);

  const lines: string[] = ["**Volunteer Roster**", ""];

  const volunteers = (volunteersRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    wwcc_number: string | null;
    wwcc_expiry_date: string | null;
    wwcc_state: string | null;
    status: string;
  }>;

  // Compute WWCC status
  const expired = volunteers.filter(
    (v) => v.wwcc_expiry_date && v.wwcc_expiry_date < today,
  );
  const expiringSoon = volunteers.filter(
    (v) =>
      v.wwcc_expiry_date &&
      v.wwcc_expiry_date >= today &&
      v.wwcc_expiry_date <= soonDate,
  );
  const missing = volunteers.filter(
    (v) => !v.wwcc_number || !v.wwcc_expiry_date,
  );

  lines.push(`**Active volunteers:** ${volunteers.length}`);
  if (expired.length > 0) {
    lines.push(`⚠ **WWCC EXPIRED (${expired.length}):**`);
    for (const v of expired) {
      lines.push(
        `  - ${v.first_name} ${v.last_name} - expired ${v.wwcc_expiry_date}${v.wwcc_state ? ` (${v.wwcc_state})` : ""}`,
      );
    }
  }
  if (expiringSoon.length > 0) {
    lines.push(`⚠ **WWCC Expiring within 30 days (${expiringSoon.length}):**`);
    for (const v of expiringSoon) {
      lines.push(
        `  - ${v.first_name} ${v.last_name} - expires ${v.wwcc_expiry_date}`,
      );
    }
  }
  if (missing.length > 0) {
    lines.push(`⚠ **No WWCC on file (${missing.length}):**`);
    for (const v of missing) {
      lines.push(`  - ${v.first_name} ${v.last_name}`);
    }
  }
  if (
    expired.length === 0 &&
    expiringSoon.length === 0 &&
    missing.length === 0
  ) {
    lines.push("✓ All active volunteers have current WWCC on file.");
  }

  lines.push("");
  const assignments = (assignmentsRes.data ?? []) as Array<{
    id: string;
    event_name: string;
    event_date: string;
    role: string;
    status: string;
    volunteer:
      | { first_name: string; last_name: string }
      | Array<{ first_name: string; last_name: string }>
      | null;
  }>;

  if (assignments.length === 0) {
    lines.push("No upcoming volunteer assignments.");
  } else {
    lines.push(`**Upcoming assignments (${assignments.length}):**`);
    // Group by event
    const byEvent = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const key = `${a.event_date}|${a.event_name}`;
      if (!byEvent.has(key)) byEvent.set(key, []);
      byEvent.get(key)!.push(a);
    }
    for (const [key, group] of byEvent.entries()) {
      const [date, name] = key.split("|");
      lines.push(
        `\n*${name}* - ${formatDateForDisplay(date)} (${group.length} volunteer${group.length !== 1 ? "s" : ""})`,
      );
      for (const a of group) {
        const vol = Array.isArray(a.volunteer) ? a.volunteer[0] : a.volunteer;
        const volName = vol ? `${vol.first_name} ${vol.last_name}` : "Unknown";
        lines.push(`  - ${volName}: ${a.role} [${a.status}]`);
      }
    }
  }

  lines.push("\nManage volunteers at: /admin/volunteers");

  return {
    tool_call_id: toolCallId,
    tool_name: "get_volunteer_roster",
    success: true,
    content: lines.join("\n"),
  };
}

// ============================================================
// get_unexplained_absences (Absence Follow-up Module)
// ============================================================

export async function handleGetUnexplainedAbsences(
  toolCallId: string,
  args: Record<string, unknown>,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase, tenantId } = ctx;
  const date = ((args.date as string) ?? "") || getTodayDate();

  // Fetch config to check if module is enabled
  const { data: config } = await supabase
    .from("absence_followup_config")
    .select("enabled, cutoff_time")
    .eq("tenant_id", tenantId)
    .single();

  const moduleEnabled = config?.enabled ?? true;

  // Fetch alerts for the given date with student join
  const { data: alerts, error } = await supabase
    .from("absence_followup_alerts")
    .select(
      "id, status, student:students(id, first_name, last_name, preferred_name)",
    )
    .eq("tenant_id", tenantId)
    .eq("alert_date", date);

  if (error) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_unexplained_absences",
      success: false,
      content: `Failed to fetch absence alerts: ${error.message}`,
    };
  }

  const rows = alerts ?? [];

  // Tally by status
  const summary = {
    pending: 0,
    notified: 0,
    escalated: 0,
    explained: 0,
    dismissed: 0,
    total: rows.length,
  };
  for (const row of rows) {
    const s = row.status as keyof typeof summary;
    if (s in summary) (summary[s] as number)++;
  }

  // Pending student list
  const pendingStudents = rows
    .filter(
      (r) =>
        r.status === "pending" ||
        r.status === "notified" ||
        r.status === "escalated",
    )
    .map((r) => {
      const student = Array.isArray(r.student) ? r.student[0] : r.student;
      const displayName = student
        ? `${student.preferred_name ?? student.first_name} ${student.last_name}`
        : "Unknown";
      return {
        student_id: student?.id ?? "",
        student_name: displayName,
        status: r.status as string,
      };
    });

  // Build text content
  const displayDate = formatDateForDisplay(date);
  const lines: string[] = [
    `**Unexplained Absence Alerts - ${displayDate}**`,
    "",
  ];

  if (!moduleEnabled) {
    lines.push("⚠️ The Absence Follow-up module is currently disabled.");
    lines.push("");
  }

  if (rows.length === 0) {
    lines.push("No absence alerts for this date.");
    lines.push(
      "Generate alerts from the Absence Follow-up dashboard at /attendance/absence-followup",
    );
  } else {
    lines.push(`**Total alerts: ${rows.length}**`);
    if (summary.pending > 0) lines.push(`- Pending: ${summary.pending}`);
    if (summary.notified > 0)
      lines.push(`- Notified (awaiting response): ${summary.notified}`);
    if (summary.escalated > 0)
      lines.push(`- ⚠️ Escalated: ${summary.escalated}`);
    if (summary.explained > 0) lines.push(`- Explained: ${summary.explained}`);
    if (summary.dismissed > 0) lines.push(`- Dismissed: ${summary.dismissed}`);
    lines.push("");

    const unresolved = summary.pending + summary.notified + summary.escalated;
    if (unresolved > 0) {
      lines.push(`**Students still needing follow-up (${unresolved}):**`);
      for (const s of pendingStudents) {
        const statusLabel =
          s.status === "escalated"
            ? " ⚠️ ESCALATED"
            : s.status === "notified"
              ? " (notified)"
              : "";
        lines.push(`- ${s.student_name}${statusLabel}`);
      }
      lines.push("");
    }

    if (config?.cutoff_time) {
      lines.push(`**Alert cutoff time:** ${config.cutoff_time.slice(0, 5)}`);
    }
    lines.push("Manage alerts at /attendance/absence-followup");
  }

  return {
    tool_call_id: toolCallId,
    tool_name: "get_unexplained_absences",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "unexplained_absences_summary",
      data: {
        date,
        summary,
        pending_students: pendingStudents,
        module_enabled: moduleEnabled,
      },
    },
  };
}

// ============================================================
// get_fee_notice_summary
// ============================================================

export async function handleGetFeeNoticeSummary(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;
  const today = getTodayDate();

  // Pending approval count
  const { count: pendingCount } = await supabase
    .from("fee_notices")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("deleted_at", null);

  // Sent in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { count: sentCount } = await supabase
    .from("fee_notices")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", thirtyDaysAgo.toISOString())
    .is("deleted_at", null);

  // Failed count
  const { count: failedCount } = await supabase
    .from("fee_notices")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .is("deleted_at", null);

  // Overdue invoices without notice
  const { count: overdueWithout } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .in("status", ["sent", "overdue", "partially_paid"])
    .lt("due_date", today)
    .is("deleted_at", null);

  // Config
  const { data: config } = await supabase
    .from("fee_notice_configs")
    .select("auto_send, enabled_channels, enabled_triggers")
    .maybeSingle();

  // Recent notices (last 5)
  const { data: recentRaw } = await supabase
    .from("fee_notices")
    .select(
      `
      trigger_type, status, invoice_number, amount_cents, due_date, sent_at,
      student:students(first_name, last_name)
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const lines: string[] = [
    "**Fee Notice Communications Summary**",
    "",
    `Pending approval: ${pendingCount ?? 0}`,
    `Sent (last 30 days): ${sentCount ?? 0}`,
    `Failed: ${failedCount ?? 0}`,
    `Overdue invoices without notice: ${overdueWithout ?? 0}`,
    "",
  ];

  if (config) {
    lines.push(
      `**Config:** Auto-send ${(config.auto_send as boolean) ? "ON" : "OFF"}, channels: ${((config.enabled_channels ?? []) as string[]).join(", ")}`,
    );
  } else {
    lines.push(
      "**Config:** Not configured yet - visit /admin/fee-notice-comms/settings",
    );
  }

  if (recentRaw && recentRaw.length > 0) {
    lines.push("", "**Recent Notices:**");
    for (const n of recentRaw) {
      const studentArr = Array.isArray(n.student) ? n.student : [n.student];
      const student = studentArr[0] as {
        first_name: string;
        last_name: string;
      } | null;
      const name = student
        ? `${student.first_name} ${student.last_name}`
        : "Unknown";
      const amount = `$${((n.amount_cents as number) / 100).toFixed(2)}`;
      lines.push(
        `- ${n.trigger_type} | ${n.invoice_number} | ${name} | ${amount} | ${n.status}`,
      );
    }
  }

  lines.push("", "Manage at /admin/fee-notice-comms");

  return {
    tool_call_id: toolCallId,
    tool_name: "get_fee_notice_summary",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "fee_notice_summary",
      data: {
        pending_count: pendingCount ?? 0,
        sent_30d: sentCount ?? 0,
        failed_count: failedCount ?? 0,
        overdue_without_notice: overdueWithout ?? 0,
        configured: !!config,
      },
    },
  };
}

// ── Recurring Billing / Direct Debit ──────────────────────────

export async function handleGetRecurringBillingStatus(
  toolCallId: string,
  ctx: WattleToolContext,
): Promise<WattleToolResult> {
  const { supabase } = ctx;

  // All setups
  const { data: setups, error: setupErr } = await supabase
    .from("recurring_billing_setups")
    .select(
      "id, status, collection_method, is_ccs_gap_fee_setup, ccs_program_name, mandate_id, auto_retry_enabled, created_at, family:family_id(id, display_name)",
    )
    .order("created_at", { ascending: false });

  if (setupErr) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_recurring_billing_status",
      success: false,
      content: `Error fetching recurring billing data: ${setupErr.message}`,
    };
  }

  const all = setups ?? [];

  if (all.length === 0) {
    return {
      tool_call_id: toolCallId,
      tool_name: "get_recurring_billing_status",
      success: true,
      content:
        "No recurring billing setups have been created yet. Set one up at /admin/recurring-billing/new",
    };
  }

  const active = all.filter((s) => s.status === "active");
  const paused = all.filter((s) => s.status === "paused");
  const failed = all.filter((s) => s.status === "failed");
  const becs = all.filter((s) => s.collection_method === "stripe_becs");
  const card = all.filter((s) => s.collection_method === "stripe_card");
  const ccsSetups = all.filter((s) => s.is_ccs_gap_fee_setup);
  const pendingMandate = all.filter(
    (s) =>
      s.status !== "cancelled" &&
      !s.mandate_id &&
      s.collection_method === "stripe_becs",
  );

  // Recent failed payments (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: failedAttempts } = await supabase
    .from("billing_payment_attempts")
    .select(
      "id, amount_cents, failure_reason, failure_message, created_at, setup:recurring_billing_setup_id(family:family_id(display_name))",
    )
    .eq("status", "failed")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  // Pending retries
  const { count: pendingRetries } = await supabase
    .from("billing_payment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("status", "retry_scheduled");

  // Unresolved failures
  const { count: unresolvedFailures } = await supabase
    .from("billing_failures")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);

  const lines: string[] = [
    "**Recurring Billing Summary**",
    "",
    `Total setups: ${all.length} (${active.length} active, ${paused.length} paused, ${failed.length} failed)`,
    `Methods: ${becs.length} BECS Direct Debit, ${card.length} Card`,
    `CCS gap fee setups: ${ccsSetups.length}`,
  ];

  if (pendingMandate.length > 0) {
    lines.push(
      `⚠️ ${pendingMandate.length} setup(s) awaiting BECS mandate acceptance`,
    );
  }

  if ((pendingRetries ?? 0) > 0) {
    lines.push(`⏳ ${pendingRetries} payment retries scheduled`);
  }

  if ((unresolvedFailures ?? 0) > 0) {
    lines.push(`❌ ${unresolvedFailures} unresolved billing failures`);
  }

  // Active setups detail
  if (active.length > 0) {
    lines.push("", "**Active Setups:**");
    for (const s of active.slice(0, 10)) {
      const familyArr = Array.isArray(s.family) ? s.family : [s.family];
      const family = familyArr[0] as { display_name: string } | null;
      const name = family?.display_name ?? "Unknown";
      const method =
        s.collection_method === "stripe_becs"
          ? "BECS"
          : s.collection_method === "stripe_card"
            ? "Card"
            : "Manual";
      const ccsLabel = s.is_ccs_gap_fee_setup
        ? ` (CCS: ${s.ccs_program_name})`
        : "";
      lines.push(`- ${name} - ${method}${ccsLabel}`);
    }
  }

  // Failed payments
  if (failedAttempts && failedAttempts.length > 0) {
    lines.push("", "**Recent Failed Payments (last 30 days):**");
    for (const a of failedAttempts) {
      const setupArr = Array.isArray(a.setup) ? a.setup : [a.setup];
      const setup = setupArr[0] as {
        family: { display_name: string } | { display_name: string }[] | null;
      } | null;
      const familyObj = setup?.family;
      const fam = Array.isArray(familyObj) ? familyObj[0] : familyObj;
      const name =
        (fam as { display_name: string } | null)?.display_name ?? "Unknown";
      const amount = `$${(a.amount_cents / 100).toFixed(2)}`;
      const reason = a.failure_reason ?? "unknown";
      lines.push(
        `- ${name} | ${amount} | ${reason} | ${new Date(a.created_at).toLocaleDateString()}`,
      );
    }
  }

  lines.push("", "Manage at /admin/recurring-billing");

  return {
    tool_call_id: toolCallId,
    tool_name: "get_recurring_billing_status",
    success: true,
    content: lines.join("\n"),
    structured: {
      type: "recurring_billing_status",
      data: {
        total: all.length,
        active: active.length,
        paused: paused.length,
        failed: failed.length,
        becs: becs.length,
        card: card.length,
        ccs: ccsSetups.length,
        pending_mandate: pendingMandate.length,
        pending_retries: pendingRetries ?? 0,
        unresolved_failures: unresolvedFailures ?? 0,
      },
    },
  };
}
