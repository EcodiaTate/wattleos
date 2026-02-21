'use server';

// src/lib/actions/reports/student-reports.ts
//
// ============================================================
// WattleOS V2 - Student Report Server Actions
// ============================================================
// CRUD for individual student reports, plus:
//   - Data aggregation (mastery, attendance, observations)
//   - Report generation from a template
//   - Workflow transitions (draft → review → approved → published)
//
// WHY separate from templates: Templates define structure;
// reports are the filled-in instances for specific students.
// This separation mirrors the curriculum template → instance
// pattern used throughout WattleOS.
//
// AUDIT: Uses centralized logAudit() for consistent metadata
// enrichment (IP, user agent, sensitivity, user identity).
//
// All actions return ActionResponse<T> - never throw.
// RLS enforces tenant isolation at the database level.
// ============================================================

"use server";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  type ActionResponse,
  type PaginatedResponse,
  success,
  failure,
  paginated,
  paginatedFailure,
  ErrorCodes,
} from "@/types/api";
import type {
  StudentReport,
  ReportStatus,
  Student,
  User,
  ReportTemplate,
  MasteryStatus,
} from "@/types/domain";
import { validatePagination } from "@/lib/utils";
import type {
  TemplateContent,
  TemplateSection,
  ReportContent,
  ReportSectionContent,
  ReportAutoData,
} from "@/lib/reports/types";
import { validateTemplateContent } from "@/lib/reports/types";
import { logAudit, AuditActions } from "@/lib/utils/audit";


// ============================================================
// Input Types
// ============================================================

export interface GenerateReportInput {
  studentId: string;
  templateId: string;
  term: string;
  /** Start of the reporting period (ISO date) */
  periodStart: string;
  /** End of the reporting period (ISO date) */
  periodEnd: string;
}

export interface BulkGenerateReportsInput {
  studentIds: string[];
  templateId: string;
  term: string;
  periodStart: string;
  periodEnd: string;
}

export interface UpdateReportContentInput {
  /** Updated section contents (partial - only changed sections) */
  sections: Array<{
    templateSectionId: string;
    narrative?: string;
    completed?: boolean;
  }>;
}

export interface ListReportsParams {
  page?: number;
  per_page?: number;
  term?: string;
  status?: ReportStatus;
  studentId?: string;
  authorId?: string;
}

// ============================================================
// Compound types for UI
// ============================================================

/** Report with student and author details for list views */
export interface ReportWithDetails extends StudentReport {
  student: Pick<
    Student,
    "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
  >;
  author: Pick<User, "id" | "first_name" | "last_name">;
  templateName: string | null;
}

/** Completion stats for a report */
export interface ReportCompletionStats {
  totalSections: number;
  completedSections: number;
  editableSections: number;
  completedEditable: number;
  percentComplete: number;
}

// ============================================================
// LIST STUDENT REPORTS
// ============================================================

export async function listStudentReports(
  params: ListReportsParams = {}
): Promise<PaginatedResponse<ReportWithDetails>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();
    const { page, perPage, offset } = validatePagination(
      params.page,
      params.per_page
    );

    // Build count query
    let countQuery = supabase
      .from("student_reports")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    // Build data query with joins
    let dataQuery = supabase
      .from("student_reports")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url), author:users!student_reports_author_id_fkey(id, first_name, last_name), template:report_templates(name)"
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    // Apply filters to both queries
    if (params.term) {
      countQuery = countQuery.eq("term", params.term);
      dataQuery = dataQuery.eq("term", params.term);
    }
    if (params.status) {
      countQuery = countQuery.eq("status", params.status);
      dataQuery = dataQuery.eq("status", params.status);
    }
    if (params.studentId) {
      countQuery = countQuery.eq("student_id", params.studentId);
      dataQuery = dataQuery.eq("student_id", params.studentId);
    }
    if (params.authorId) {
      countQuery = countQuery.eq("author_id", params.authorId);
      dataQuery = dataQuery.eq("author_id", params.authorId);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return paginatedFailure(countError.message, ErrorCodes.DATABASE_ERROR);
    }

    const { data, error: dataError } = await dataQuery;
    if (dataError) {
      return paginatedFailure(dataError.message, ErrorCodes.DATABASE_ERROR);
    }

    // Map to ReportWithDetails
    const reports: ReportWithDetails[] = (
      (data ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const student = row.student as Pick<
        Student,
        "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
      >;
      const author = row.author as Pick<User, "id" | "first_name" | "last_name">;
      const template = row.template as { name: string } | null;

      return {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        student_id: row.student_id as string,
        template_id: (row.template_id as string) ?? null,
        author_id: row.author_id as string,
        term: (row.term as string) ?? null,
        content: (row.content as Record<string, unknown>) ?? {},
        status: row.status as unknown as StudentReport["status"],
        published_at: (row.published_at as string) ?? null,
        google_doc_id: (row.google_doc_id as string) ?? null,
        pdf_storage_path: (row.pdf_storage_path as string) ?? null,
        student,
        author,
        templateName: template?.name ?? null,
      };
    });

    return paginated(reports, count ?? 0, page, perPage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list student reports";
    return paginatedFailure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// GET SINGLE STUDENT REPORT (with details)
// ============================================================

export async function getStudentReport(
  reportId: string
): Promise<ActionResponse<ReportWithDetails>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_reports")
      .select(
        "*, student:students(id, first_name, last_name, preferred_name, photo_url), author:users!student_reports_author_id_fkey(id, first_name, last_name), template:report_templates(name)"
      )
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return failure("Report not found", ErrorCodes.NOT_FOUND);
    }

    const row = data as Record<string, unknown>;
    const student = row.student as Pick<
      Student,
      "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
    >;
    const author = row.author as Pick<User, "id" | "first_name" | "last_name">;
    const template = row.template as { name: string } | null;

    const report: ReportWithDetails = {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      student_id: row.student_id as string,
      template_id: (row.template_id as string) ?? null,
      author_id: row.author_id as string,
      term: (row.term as string) ?? null,
      content: (row.content as Record<string, unknown>) ?? {},
      status: row.status as unknown as StudentReport["status"],
      published_at: (row.published_at as string) ?? null,
      google_doc_id: (row.google_doc_id as string) ?? null,
      pdf_storage_path: (row.pdf_storage_path as string) ?? null,
      student,
      author,
      templateName: template?.name ?? null,
    };

    return success(report);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get student report";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// GENERATE REPORT FROM TEMPLATE
// ============================================================

export async function generateStudentReport(
  input: GenerateReportInput
): Promise<ActionResponse<StudentReport>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // 1. Fetch the template
    const { data: templateRow, error: templateError } = await supabase
      .from("report_templates")
      .select("*")
      .eq("id", input.templateId)
      .is("deleted_at", null)
      .single();

    if (templateError || !templateRow) {
      return failure("Report template not found", ErrorCodes.NOT_FOUND);
    }

    const template = templateRow as ReportTemplate;
    const templateContent = template.content as unknown as TemplateContent;

    if (!validateTemplateContent(templateContent)) {
      return failure(
        "Template has invalid content structure",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // 2. Check for duplicate (same student + term + template)
    const { count: existingCount } = await supabase
      .from("student_reports")
      .select("id", { count: "exact", head: true })
      .eq("student_id", input.studentId)
      .eq("template_id", input.templateId)
      .eq("term", input.term)
      .is("deleted_at", null);

    if (existingCount && existingCount > 0) {
      return failure(
        "A report already exists for this student, template, and term",
        ErrorCodes.ALREADY_EXISTS
      );
    }

    // 3. Aggregate data for auto-populated sections
    const autoData = await aggregateStudentData(
      supabase,
      input.studentId,
      input.periodStart,
      input.periodEnd,
      templateContent
    );

    // 4. Build report content
    const reportContent: ReportContent = {
      version: 1,
      templateSnapshot: templateContent,
      sections: templateContent.sections.map((section) =>
        buildReportSection(section, autoData)
      ),
      reportingPeriod: {
        startDate: input.periodStart,
        endDate: input.periodEnd,
        termLabel: input.term,
      },
    };

    // 5. Insert the report
    const { data, error } = await supabase
      .from("student_reports")
      .insert({
        tenant_id: context.tenant.id,
        student_id: input.studentId,
        template_id: input.templateId,
        author_id: context.user.id,
        term: input.term,
        content: reportContent as unknown as Record<string, unknown>,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // WHY audit: Report generation pulls sensitive student data
    // (mastery, attendance, observations) into a single document.
    // Schools need to track who generated which reports and when.
    await logAudit({
      context,
      action: AuditActions.REPORT_CREATED,
      entityType: "student_report",
      entityId: (data as StudentReport).id,
      metadata: {
        student_id: input.studentId,
        template_id: input.templateId,
        term: input.term,
        generation_method: "template",
      },
    });

    return success(data as StudentReport);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate student report";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// BULK GENERATE REPORTS
// ============================================================

export async function bulkGenerateReports(
  input: BulkGenerateReportsInput
): Promise<
  ActionResponse<{ generated: number; skipped: number; errors: string[] }>
> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);

    const results = { generated: 0, skipped: 0, errors: [] as string[] };

    for (const studentId of input.studentIds) {
      const result = await generateStudentReport({
        studentId,
        templateId: input.templateId,
        term: input.term,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      });

      if (result.error) {
        if (result.error.code === ErrorCodes.ALREADY_EXISTS) {
          results.skipped += 1;
        } else {
          results.errors.push(`Student ${studentId}: ${result.error.message}`);
        }
      } else {
        results.generated += 1;
      }
    }

    return success(results);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to bulk generate reports";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// UPDATE REPORT CONTENT (teacher edits)
// ============================================================

export async function updateReportContent(
  reportId: string,
  input: UpdateReportContentInput
): Promise<ActionResponse<StudentReport>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Fetch existing report
    const { data: existing, error: fetchError } = await supabase
      .from("student_reports")
      .select("*")
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Report not found", ErrorCodes.NOT_FOUND);
    }

    const report = existing as StudentReport;

    // ✅ widen locally (prevents TS narrowing that excludes "published")
    const status: ReportStatus = report.status as unknown as ReportStatus;

    if (status === "approved" || status === "published") {
      return failure(
        'Cannot edit an approved or published report. Change status to "review" first.',
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Parse existing content
    const content = report.content as unknown as ReportContent;
    if (!content?.sections) {
      return failure(
        "Report has invalid content structure",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Apply section updates
    const updatedSections = content.sections.map((section) => {
      const update = input.sections.find(
        (s) => s.templateSectionId === section.templateSectionId
      );
      if (!update) return section;

      return {
        ...section,
        narrative:
          update.narrative !== undefined ? update.narrative : section.narrative,
        completed:
          update.completed !== undefined ? update.completed : section.completed,
      };
    });

    const updatedContent: ReportContent = {
      ...content,
      sections: updatedSections,
    };

    const { data, error } = await supabase
      .from("student_reports")
      .update({
        content: updatedContent as unknown as Record<string, unknown>,
      })
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as StudentReport);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update report content";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}


const VALID_TRANSITIONS: Record<
  ReportStatus,
  readonly ReportStatus[]
> = {
  draft: ["review"],
  review: ["draft", "approved"],
  approved: ["review", "published"],
  published: ["approved"],
} as const;
export async function updateReportStatus(
  reportId: string,
  newStatus: ReportStatus
): Promise<ActionResponse<StudentReport>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data: existing, error: fetchError } = await supabase
      .from("student_reports")
      .select("*")
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existing) {
      return failure("Report not found", ErrorCodes.NOT_FOUND);
    }

    const report = existing as StudentReport;

    // ✅ hard cast to the workflow union (cannot narrow away "published")
    const currentStatus = (report as any).status as ReportStatus;

    const validNext = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!validNext.includes(newStatus)) {
      return failure(
        `Cannot transition from "${currentStatus}" to "${newStatus}". Valid transitions: ${
          validNext.join(", ") || "none"
        }`,
        ErrorCodes.INVALID_STATUS_TRANSITION
      );
    }

    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === "published") {
      updateData.published_at = new Date().toISOString();
    } else if (currentStatus === "published" && newStatus !== "published") {
      updateData.published_at = null;
    }

    const { data, error } = await supabase
      .from("student_reports")
      .update(updateData)
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // WHY audit: Report status transitions are a compliance checkpoint.
    // Publishing makes reports visible to parents — schools need to know
    // who approved and who published each report.
    await logAudit({
      context,
      action: newStatus === "published"
        ? AuditActions.REPORT_PUBLISHED
        : AuditActions.REPORT_CREATED, // Re-use for generic status changes
      entityType: "student_report",
      entityId: reportId,
      metadata: {
        from: currentStatus,
        to: newStatus,
        student_id: report.student_id,
      },
    });

    return success(data as StudentReport);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update report status";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// SOFT DELETE STUDENT REPORT
// ============================================================

export async function deleteStudentReport(
  reportId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    // Don't allow deleting published reports
    const { data: existing } = await supabase
      .from("student_reports")
      .select("status")
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();
      const existingStatus = String(
        (existing as Record<string, unknown> | null)?.status ?? "",
      );
  
      if (existingStatus === "published") {
      return failure(
        "Cannot delete a published report. Unpublish it first.",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const { error } = await supabase
      .from("student_reports")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", reportId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success({ id: reportId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete student report";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// GET COMPLETION STATS FOR A REPORT
// ============================================================
// ============================================================
// GET COMPLETION STATS FOR A REPORT
// ============================================================

export async function getReportCompletionStats(
  reportContent: Record<string, unknown>
): Promise<ReportCompletionStats> {
  const content = reportContent as unknown as ReportContent;

  if (!content?.sections) {
    return {
      totalSections: 0,
      completedSections: 0,
      editableSections: 0,
      completedEditable: 0,
      percentComplete: 0,
    };
  }

  const editableTypes = new Set([
    "narrative",
    "custom_text",
    "goals",
    "observation_highlights",
  ]);

  const totalSections = content.sections.length;
  const completedSections = content.sections.filter((s) => s.completed).length;

  const editableSections = content.sections.filter((s) =>
    editableTypes.has(s.type)
  ).length;

  const completedEditable = content.sections.filter(
    (s) => editableTypes.has(s.type) && s.completed
  ).length;

  return {
    totalSections,
    completedSections,
    editableSections,
    completedEditable,
    percentComplete:
      editableSections > 0
        ? Math.round((completedEditable / editableSections) * 100)
        : 100,
  };
}


// ============================================================
// GET DISTINCT TERMS
// ============================================================

export async function getReportTerms(): Promise<ActionResponse<string[]>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("student_reports")
      .select("term")
      .is("deleted_at", null)
      .not("term", "is", null)
      .order("term", { ascending: false });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Deduplicate
    const terms = [
      ...new Set(
        ((data ?? []) as Array<{ term: string | null }>)
          .map((r) => r.term)
          .filter((t): t is string => t !== null)
      ),
    ];

    return success(terms);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get report terms";
    return failure(message, ErrorCodes.UNKNOWN_ERROR);
  }
}

// ============================================================
// PRIVATE: Aggregate student data for report generation
// ============================================================

interface AggregatedStudentData {
  studentInfo: ReportAutoData["studentInfo"];
  masterySummary: ReportAutoData["masterySummary"];
  masteryGrid: ReportAutoData["masteryGrid"];
  attendanceSummary: ReportAutoData["attendanceSummary"];
  observationHighlights: ReportAutoData["observationHighlights"];
}

type CurriculumNodeRow = {
  id: string;
  title: string;
  level: string;
  parent_id: string | null;
};

function toSingleCurriculumNode(v: unknown): CurriculumNodeRow | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0] ?? null) as CurriculumNodeRow | null;
  return v as CurriculumNodeRow;
}

function getCurriculumNodeTitle(v: unknown): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return (v[0]?.title as string) ?? null;
  return ((v as any).title as string) ?? null;
}

async function aggregateStudentData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  templateContent: TemplateContent
): Promise<AggregatedStudentData> {
  // Determine which data types we actually need
  const sectionTypes = new Set(templateContent.sections.map((s) => s.type));

  const result: AggregatedStudentData = {
    studentInfo: undefined,
    masterySummary: undefined,
    masteryGrid: undefined,
    attendanceSummary: undefined,
    observationHighlights: undefined,
  };

  // ── Student Info ──────────────────────────────────────
  if (sectionTypes.has("student_info")) {
    const { data: student } = await supabase
      .from("students")
      .select(
        "id, first_name, last_name, preferred_name, dob, photo_url, enrollment_status"
      )
      .eq("id", studentId)
      .single();

    if (student) {
      const s = student as Record<string, unknown>;

      // Get current class
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("class:classes(name, cycle_level)")
        .eq("student_id", studentId)
        .eq("status", "active")
        .is("deleted_at", null)
        .limit(1)
        .single();

      const classData = (enrollment as Record<string, unknown>)?.class as {
        name: string;
        cycle_level: string | null;
      } | null;

      result.studentInfo = {
        firstName: s.first_name as string,
        lastName: s.last_name as string,
        preferredName: (s.preferred_name as string) ?? null,
        dob: (s.dob as string) ?? null,
        photoUrl: (s.photo_url as string) ?? null,
        className: classData?.name ?? null,
        cycleLevelName: classData?.cycle_level ?? null,
        enrollmentStatus: s.enrollment_status as string,
      };
    }
  }

  // ── Mastery Data ──────────────────────────────────────
  if (sectionTypes.has("mastery_grid") || sectionTypes.has("mastery_summary")) {
    const { data: masteryRows } = await supabase
      .from("student_mastery")
      .select(
        "curriculum_node_id, status, curriculum_node:curriculum_nodes(id, title, level, parent_id)"
      )
      .eq("student_id", studentId)
      .is("deleted_at", null);

    if (masteryRows && masteryRows.length > 0) {
      // Normalise curriculum_node which Supabase may return as [] instead of object|null
      const rows = (masteryRows as Array<Record<string, unknown>>).map((r) => ({
        curriculum_node_id: r.curriculum_node_id as string,
        status: r.status as MasteryStatus,
        curriculum_node: toSingleCurriculumNode((r as any).curriculum_node),
      }));

      // Grid data
      result.masteryGrid = rows
        .filter((r) => r.curriculum_node)
        .map((r) => ({
          nodeId: r.curriculum_node_id,
          nodeTitle: r.curriculum_node!.title,
          nodeLevel: r.curriculum_node!.level,
          parentTitle: null, // Could resolve parent titles if needed
          status: r.status,
        }));

      // Summary data
      const total = rows.length;
      const notStarted = rows.filter((r) => r.status === "not_started").length;
      const presented = rows.filter((r) => r.status === "presented").length;
      const practicing = rows.filter((r) => r.status === "practicing").length;
      const mastered = rows.filter((r) => r.status === "mastered").length;

      result.masterySummary = {
        total,
        notStarted,
        presented,
        practicing,
        mastered,
        percentMastered: total > 0 ? Math.round((mastered / total) * 100) : 0,
      };
    }
  }

  // ── Attendance Data ───────────────────────────────────
  if (sectionTypes.has("attendance_summary")) {
    const { data: attendanceRows } = await supabase
      .from("attendance_records")
      .select("status")
      .eq("student_id", studentId)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .is("deleted_at", null);

    if (attendanceRows) {
      const rows = attendanceRows as Array<{ status: string }>;
      const totalDays = rows.length;
      const present = rows.filter((r) => r.status === "present").length;
      const absent = rows.filter((r) => r.status === "absent").length;
      const late = rows.filter((r) => r.status === "late").length;
      const excused = rows.filter((r) => r.status === "excused").length;
      const halfDay = rows.filter((r) => r.status === "half_day").length;

      result.attendanceSummary = {
        totalDays,
        present,
        absent,
        late,
        excused,
        halfDay,
        attendanceRate:
          totalDays > 0 ? Math.round((present / totalDays) * 100) : 0,
      };
    }
  }

  // ── Observation Highlights ────────────────────────────
  if (sectionTypes.has("observation_highlights")) {
    // Get max count from template config
    const obsSection = templateContent.sections.find(
      (s) => s.type === "observation_highlights"
    );
    const maxObs = obsSection?.config?.maxObservations ?? 5;

    // Find observations tagged to this student in the period
    const { data: obsLinks } = await supabase
      .from("observation_students")
      .select("observation_id")
      .eq("student_id", studentId);

    const obsIds = ((obsLinks ?? []) as Array<{ observation_id: string }>).map(
      (r) => r.observation_id
    );

    if (obsIds.length > 0) {
      const { data: observations } = await supabase
        .from("observations")
        .select(
          "id, content, created_at, author_id, author:users!observations_author_id_fkey(first_name, last_name)"
        )
        .in("id", obsIds)
        .eq("status", "published")
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(maxObs);

      if (observations) {
        // Get outcome titles for each observation
        const observationIds = (observations as Array<{ id: string }>).map(
          (o) => o.id
        );

        const { data: outcomeLinks } = await supabase
          .from("observation_outcomes")
          .select("observation_id, curriculum_node:curriculum_nodes(title)")
          .in("observation_id", observationIds);

        const outcomeMap = new Map<string, string[]>();
        for (const link of (outcomeLinks ?? []) as Array<
          Record<string, unknown>
        >) {
          const obsId = link.observation_id as string;
          const title = getCurriculumNodeTitle((link as any).curriculum_node);

          if (!outcomeMap.has(obsId)) outcomeMap.set(obsId, []);
          if (title) outcomeMap.get(obsId)!.push(title);
        }

        // Get media counts
        const { data: mediaCounts } = await supabase
          .from("observation_media")
          .select("observation_id")
          .in("observation_id", observationIds);

        const mediaCountMap = new Map<string, number>();
        for (const m of (mediaCounts ?? []) as Array<{ observation_id: string }>) {
          mediaCountMap.set(
            m.observation_id,
            (mediaCountMap.get(m.observation_id) ?? 0) + 1
          );
        }

        result.observationHighlights = (
          observations as Array<Record<string, unknown>>
        ).map((obs) => {
          const author = obs.author as
            | { first_name: string | null; last_name: string | null }
            | null;
          const authorName = author
            ? [author.first_name, author.last_name].filter(Boolean).join(" ")
            : "Unknown";

          return {
            id: obs.id as string,
            content: (obs.content as string) ?? null,
            createdAt: obs.created_at as string,
            authorName,
            outcomes: outcomeMap.get(obs.id as string) ?? [],
            mediaCount: mediaCountMap.get(obs.id as string) ?? 0,
          };
        });
      }
    }
  }

  return result;
}

// ============================================================
// PRIVATE: Build a single report section from a template section
// ============================================================

function buildReportSection(
  templateSection: TemplateSection,
  data: AggregatedStudentData
): ReportSectionContent {
  const section: ReportSectionContent = {
    templateSectionId: templateSection.id,
    type: templateSection.type,
    title: templateSection.title,
    order: templateSection.order,
    completed: false,
  };

  // Auto-populated sections get their data and are marked complete
  switch (templateSection.type) {
    case "student_info":
      if (data.studentInfo) {
        section.autoData = { studentInfo: data.studentInfo };
        section.completed = true;
      }
      break;

    case "mastery_grid":
      if (data.masteryGrid) {
        // Filter by curriculum area if configured
        let grid = data.masteryGrid;
        const areaFilter = (templateSection as any).config?.curriculumAreaFilter;
        if (areaFilter && areaFilter !== "all") {
          grid = grid.filter((item) => item.parentTitle === areaFilter);
        }
        section.autoData = { masteryGrid: grid };
        section.completed = true;
      }
      break;

    case "mastery_summary":
      if (data.masterySummary) {
        section.autoData = { masterySummary: data.masterySummary };
        section.completed = true;
      }
      break;

    case "attendance_summary":
      if (data.attendanceSummary) {
        section.autoData = { attendanceSummary: data.attendanceSummary };
        section.completed = true;
      }
      break;

    case "observation_highlights":
      if (data.observationHighlights) {
        section.autoData = { observationHighlights: data.observationHighlights };
        // Semi-auto: teacher should review/curate, so not marked complete
        section.completed = false;
      }
      break;

    // Manual sections start empty
    case "narrative":
    case "custom_text":
    case "goals":
      section.narrative = "";
      section.completed = false;
      break;
  }

  return section;
}