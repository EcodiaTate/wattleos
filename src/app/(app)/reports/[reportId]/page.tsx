// src/app/(app)/reports/[reportId]/page.tsx
//
// ============================================================
// WattleOS V2 - Report Editor Page
// ============================================================
// Server Component. Fetches a single student report with all
// details, then hands off to the ReportEditor client component
// for interactive editing.
//
// WHY server wrapper: Single fetch on the server, instant page
// load. The editor component handles all interactive state
// (editing narratives, toggling completion, status changes).
// ============================================================

import { ReportEditor } from "@/components/domain/reports/ReportEditor";
import { ReportPdfActions } from "@/components/domain/reports/report-pdf-actions";
import {
  getReportCompletionStats,
  getStudentReport,
} from "@/lib/actions/reports";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import type { ReportContent } from "@/lib/reports/types";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export default async function ReportEditorPage({ params }: PageProps) {
  const { reportId } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect("/dashboard");
  }

  const result = await getStudentReport(reportId);

  if (result.error || !result.data) {
    redirect("/reports");
  }

  const report = result.data;
  const content = report.content as unknown as ReportContent;
  const stats = getReportCompletionStats(report.content);
  const studentName = `${report.student.preferred_name ?? report.student.first_name} ${report.student.last_name}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-[var(--density-card-padding)]">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground">{studentName}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {studentName}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {report.term && <span>{report.term}</span>}
            {report.templateName && (
              <>
                <span>&middot;</span>
                <span>{report.templateName}</span>
              </>
            )}
          </div>
        </div>

        {/* PDF Export / Download */}
        <div className="shrink-0 pt-6">
          <ReportPdfActions
            reportId={reportId}
            reportStatus={report.status}
            hasPdf={!!report.pdf_storage_path}
          />
        </div>
      </div>

      <ReportEditor
        reportId={reportId}
        reportStatus={report.status}
        reportContent={content}
        completionStats={stats}
        studentName={studentName}
        studentPhotoUrl={report.student.photo_url}
        authorName={
          [report.author.first_name, report.author.last_name]
            .filter(Boolean)
            .join(" ") || "Unknown"
        }
        term={report.term}
      />
    </div>
  );
}
