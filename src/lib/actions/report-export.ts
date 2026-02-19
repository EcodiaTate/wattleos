// src/lib/actions/report-export.ts
//
// ============================================================
// WattleOS V2 - Report Export Server Actions
// ============================================================
// Handles PDF export for student reports. The pipeline:
//   1. Fetch the student report (must be approved or published)
//   2. Render to PDF via @react-pdf/renderer
//   3. Upload PDF to Supabase Storage
//   4. Update student_reports.pdf_storage_path
//   5. Return a signed download URL
//
// WHY separate from reports.ts: Export is an integration concern
// (PDF generation + storage upload), not a CRUD concern. Keeps
// the core reporting actions clean.
// ============================================================

"use server";

import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { ReportContent } from "@/lib/integrations/pdf/client";
import {
  generateReportFilename,
  generateReportStoragePath,
  renderReportPdf,
} from "@/lib/integrations/pdf/client";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ActionResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { StudentReport } from "@/types/domain";

// ============================================================
// Types
// ============================================================

interface PdfExportResult {
  /** Supabase Storage path of the uploaded PDF */
  storage_path: string;
  /** Signed download URL (valid for 1 hour) */
  download_url: string;
  /** Human-readable filename */
  filename: string;
  /** PDF file size in bytes */
  size_bytes: number;
}

type StudentJoin = {
  id?: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob?: string | null;
};

type TemplateJoin = { id: string; name: string };
type AuthorJoin = { id: string; first_name: string; last_name: string };

/**
 * Supabase/PostgREST sometimes returns joined relations as arrays
 * even when logically 1:1. This normalizes "object | object[] | null"
 * into "object | null".
 */
function firstOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ============================================================
// EXPORT: Generate PDF and upload to storage
// ============================================================

export async function exportReportToPdf(
  reportId: string,
): Promise<ActionResponse<PdfExportResult>> {
  try {
    const context = await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    // 1. Fetch the report with joined details
    const { data: report, error: fetchError } = await supabase
      .from("student_reports")
      .select(
        `
        *,
        student:students(id, first_name, last_name, preferred_name, dob),
        template:report_templates(id, name),
        author:users!student_reports_author_id_fkey(id, first_name, last_name)
      `,
      )
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !report) {
      return failure("Report not found", "NOT_FOUND");
    }

    // Normalize joins (student/template/author can come back as object or array)
    const student = firstOrNull(
      report.student as unknown as StudentJoin | StudentJoin[] | null,
    );
    const template = firstOrNull(
      report.template as unknown as TemplateJoin | TemplateJoin[] | null,
    );
    const author = firstOrNull(
      report.author as unknown as AuthorJoin | AuthorJoin[] | null,
    );

    // Keep base report strongly typed
    const typedReport = report as StudentReport;

    // 2. Validate status - only approved or published reports get PDFs
    if (
      typedReport.status !== "approved" &&
      typedReport.status !== "published"
    ) {
      return failure(
        `Cannot export a report in '${typedReport.status}' status. Report must be approved or published.`,
        "VALIDATION_ERROR",
      );
    }

    // 3. Build the ReportContent from the JSONB content + joined data
    const studentName = student
      ? `${student.preferred_name ?? student.first_name} ${student.last_name}`
      : "Unknown Student";

    const authorName = author
      ? `${author.first_name} ${author.last_name}`
      : "Unknown Author";

    const rawContent = typedReport.content as Record<string, unknown>;

    const reportContent: ReportContent = {
      student_name: (rawContent.student_name as string) ?? studentName,
      student_dob:
        (rawContent.student_dob as string) ??
        student?.dob ??
        undefined ??
        undefined,
      class_name: (rawContent.class_name as string) ?? undefined,
      term: (rawContent.term as string) ?? typedReport.term ?? "Unknown Term",
      school_name: (rawContent.school_name as string) ?? "School",
      author_name: (rawContent.author_name as string) ?? authorName,
      report_date:
        (rawContent.report_date as string) ??
        new Date().toLocaleDateString("en-AU"),
      narrative: (rawContent.narrative as string) ?? undefined,
      sections: (rawContent.sections as ReportContent["sections"]) ?? undefined,
      observations:
        (rawContent.observations as ReportContent["observations"]) ?? undefined,
      mastery_summary:
        (rawContent.mastery_summary as ReportContent["mastery_summary"]) ??
        undefined,
      attendance:
        (rawContent.attendance as ReportContent["attendance"]) ?? undefined,
      teacher_comments: (rawContent.teacher_comments as string) ?? undefined,
      goals: (rawContent.goals as string) ?? undefined,
    };

    // 4. Render the PDF
    const pdfBuffer = await renderReportPdf(reportContent);

    // 5. Upload to Supabase Storage
    const storagePath = generateReportStoragePath({
      tenantId: context.tenant.id,
      studentId: typedReport.student_id,
      reportId: typedReport.id,
    });

    const { error: uploadError } = await adminClient.storage
      .from("reports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return failure(
        `Failed to upload PDF: ${uploadError.message}`,
        "STORAGE_ERROR",
      );
    }

    // 6. Update the report record with the storage path
    const { error: updateError } = await supabase
      .from("student_reports")
      .update({ pdf_storage_path: storagePath })
      .eq("id", reportId);

    if (updateError) {
      console.error(
        `[report-export] PDF uploaded but failed to update record: ${updateError.message}`,
      );
    }

    // 7. Generate a signed download URL (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } =
      await adminClient.storage
        .from("reports")
        .createSignedUrl(storagePath, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return failure(
        "PDF generated but failed to create download URL",
        "STORAGE_ERROR",
      );
    }

    const filename = generateReportFilename(reportContent);

    return success({
      storage_path: storagePath,
      download_url: signedUrlData.signedUrl,
      filename,
      size_bytes: pdfBuffer.byteLength,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to export report to PDF";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// GET: Download URL for an existing PDF (staff)
// ============================================================

export async function getReportPdfUrl(
  reportId: string,
): Promise<ActionResponse<{ download_url: string; filename: string }>> {
  try {
    await requirePermission(Permissions.MANAGE_REPORTS);
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const { data: report, error: fetchError } = await supabase
      .from("student_reports")
      .select(
        `
        id, pdf_storage_path, term,
        student:students(first_name, last_name, preferred_name)
      `,
      )
      .eq("id", reportId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !report) {
      return failure("Report not found", "NOT_FOUND");
    }

    const student = firstOrNull(
      report.student as unknown as
        | {
            first_name: string;
            last_name: string;
            preferred_name: string | null;
          }
        | {
            first_name: string;
            last_name: string;
            preferred_name: string | null;
          }[]
        | null,
    );

    const pdf_storage_path = (report as any).pdf_storage_path as
      | string
      | null
      | undefined;

    if (!pdf_storage_path) {
      return failure(
        'This report has not been exported to PDF yet. Use "Export PDF" first.',
        "NOT_FOUND",
      );
    }

    const { data: signedUrlData, error: signedUrlError } =
      await adminClient.storage
        .from("reports")
        .createSignedUrl(pdf_storage_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return failure("Failed to generate download URL", "STORAGE_ERROR");
    }

    const studentName = student
      ? `${student.preferred_name ?? student.first_name} ${student.last_name}`
      : "Student";
    const term = (report as any).term ?? "Report";
    const filename = `${studentName.replace(/\s+/g, "_")}_${String(
      term,
    ).replace(/\s+/g, "_")}_Report.pdf`;

    return success({
      download_url: signedUrlData.signedUrl,
      filename,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get PDF download URL";
    return failure(message, "UNEXPECTED_ERROR");
  }
}

// ============================================================
// PARENT: Download URL for a published report
// ============================================================

export async function getParentReportPdfUrl(
  reportId: string,
): Promise<ActionResponse<{ download_url: string; filename: string }>> {
  try {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const { data: report, error: fetchError } = await supabase
      .from("student_reports")
      .select(
        `
        id, pdf_storage_path, term, status,
        student:students(first_name, last_name, preferred_name)
      `,
      )
      .eq("id", reportId)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (fetchError || !report) {
      return failure("Report not found or not available", "NOT_FOUND");
    }

    const student = firstOrNull(
      report.student as unknown as
        | {
            first_name: string;
            last_name: string;
            preferred_name: string | null;
          }
        | {
            first_name: string;
            last_name: string;
            preferred_name: string | null;
          }[]
        | null,
    );

    const pdf_storage_path = (report as any).pdf_storage_path as
      | string
      | null
      | undefined;

    if (!pdf_storage_path) {
      return failure("PDF is not yet available for this report", "NOT_FOUND");
    }

    const { data: signedUrlData, error: signedUrlError } =
      await adminClient.storage
        .from("reports")
        .createSignedUrl(pdf_storage_path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return failure("Failed to generate download URL", "STORAGE_ERROR");
    }

    const studentName = student
      ? `${student.preferred_name ?? student.first_name} ${student.last_name}`
      : "Student";
    const term = (report as any).term ?? "Report";
    const filename = `${studentName.replace(/\s+/g, "_")}_${String(
      term,
    ).replace(/\s+/g, "_")}_Report.pdf`;

    return success({
      download_url: signedUrlData.signedUrl,
      filename,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get PDF download URL";
    return failure(message, "UNEXPECTED_ERROR");
  }
}
