// src/app/(app)/parent/[studentId]/reports/[reportId]/page.tsx
//
// ============================================================
// WattleOS V2 - Report Viewer (Parent View)
// ============================================================
// Server Component. Read-only display of a published student
// report. Shows all sections - auto data and teacher narratives.
//
// WHY separate from staff editor: No editing, no workflow
// buttons, no status transitions. Just clean reading.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { isGuardianOf, getMyChildren, getChildReport } from "@/lib/actions/parent";
import type {
  ReportContent,
  ReportSectionContent,
  ReportAutoData,
  TemplateSectionType,
} from "@/lib/reports/types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReportPdfActions } from "@/components/domain/reports/report-pdf-actions";

interface PageProps {
  params: Promise<{ studentId: string; reportId: string }>;
}

export default async function ReportViewerPage({ params }: PageProps) {
  const { studentId, reportId } = await params;
  await getTenantContext();

  const isGuardian = await isGuardianOf(studentId);
  if (!isGuardian) redirect("/parent");

  const childrenResult = await getMyChildren();
  const child = (childrenResult.data ?? []).find((c) => c.id === studentId);
  if (!child) redirect("/parent");
  const displayName = child.preferredName ?? child.firstName;

  const reportResult = await getChildReport(reportId, studentId);
  if (reportResult.error || !reportResult.data) {
    redirect(`/parent/${studentId}/reports`);
  }

  const report = reportResult.data;

  // Parent view is published-only. If you ever allow other statuses here,
  // switch this to a real field from the API response.
  const reportStatus: string =
    (report as any).status ?? ((report as any).publishedAt ? "published" : "published");

  // Parent report detail types vary (camel vs snake). Support both.
  const pdfStoragePath =
    (report as any).pdfStoragePath ??
    (report as any).pdf_storage_path ??
    (report as any).pdf_storage_path; // duplicate ok, explicit

  const hasPdf = Boolean(pdfStoragePath);

  const content: ReportContent = (report as any).content;
  const sections = content?.sections ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/parent" className="hover:text-gray-700">
            My Children
          </Link>
          <span className="text-gray-400">/</span>
          <Link href={`/parent/${studentId}`} className="hover:text-gray-700">
            {displayName}
          </Link>
          <span className="text-gray-400">/</span>
          <Link href={`/parent/${studentId}/reports`} className="hover:text-gray-700">
            Reports
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{(report as any).term ?? "Report"}</span>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {(report as any).term ?? "Student Report"} - {displayName} {child.lastName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {(report as any).templateName && <span>{(report as any).templateName}</span>}
                <span>&middot;</span>
                <span>By {(report as any).authorName}</span>
                {(report as any).publishedAt && (
                  <>
                    <span>&middot;</span>
                    <span>
                      Published{" "}
                      {new Date((report as any).publishedAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
              {content?.reportingPeriod && (
                <p className="mt-1 text-xs text-gray-400">
                  Reporting period: {formatDate(content.reportingPeriod.startDate)} —{" "}
                  {formatDate(content.reportingPeriod.endDate)}
                </p>
              )}
            </div>

            {/* PDF Download Button */}
            <div className="shrink-0">
              <ReportPdfActions
                reportId={reportId}
                reportStatus={reportStatus}
                hasPdf={hasPdf}
                isParentView={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <ReportSectionView key={section.templateSectionId} section={section} />
        ))}
      </div>

      {/* Back link */}
      <div className="pb-8">
        <Link
          href={`/parent/${studentId}/reports`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          ← Back to reports
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Section renderer (read-only)
// ============================================================

function ReportSectionView({ section }: { section: ReportSectionContent }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
      </div>
      <div className="px-6 py-4">
        {/* Auto data */}
        {section.autoData && <AutoDataView autoData={section.autoData} type={section.type} />}

        {/* Narrative */}
        {section.narrative && (
          <div className={section.autoData ? "mt-4" : ""}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {section.narrative}
            </p>
          </div>
        )}

        {/* Empty editable section with no content */}
        {!section.autoData && !section.narrative && (
          <p className="text-sm italic text-gray-400">No content for this section.</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Auto data renderer (read-only, simplified from staff editor)
// ============================================================

function AutoDataView({
  autoData,
  type,
}: {
  autoData: ReportAutoData;
  type: TemplateSectionType;
}) {
  // Student info
  if (type === "student_info" && autoData.studentInfo) {
    const info = autoData.studentInfo;
    return (
      <div className="flex items-start gap-4">
        {info.photoUrl ? (
          <img src={info.photoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-lg font-medium text-gray-400">
            {info.firstName[0]}
            {info.lastName[0]}
          </div>
        )}
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-900">
            {info.preferredName
              ? `${info.preferredName} (${info.firstName} ${info.lastName})`
              : `${info.firstName} ${info.lastName}`}
          </p>
          {info.className && <p className="text-gray-600">Class: {info.className}</p>}
          {info.dob && <p className="text-gray-500">Date of Birth: {formatDate(info.dob)}</p>}
        </div>
      </div>
    );
  }

  // Mastery summary
  if (type === "mastery_summary" && autoData.masterySummary) {
    const ms = autoData.masterySummary;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total", value: ms.total, color: "text-gray-700" },
            { label: "Not Started", value: ms.notStarted, color: "text-gray-500" },
            { label: "Presented", value: ms.presented, color: "text-blue-600" },
            { label: "Practicing", value: ms.practicing, color: "text-amber-600" },
            { label: "Mastered", value: ms.mastered, color: "text-green-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md bg-gray-50 p-2 text-center">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${ms.percentMastered}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{ms.percentMastered}% mastered</span>
        </div>
      </div>
    );
  }

  // Mastery grid
  if (type === "mastery_grid" && autoData.masteryGrid) {
    const statusColors: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-500",
      presented: "bg-blue-100 text-blue-700",
      practicing: "bg-amber-100 text-amber-700",
      mastered: "bg-green-100 text-green-700",
    };

    return (
      <div className="space-y-1">
        {autoData.masteryGrid.map((item) => (
          <div
            key={item.nodeId}
            className="flex items-center justify-between rounded px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <span className="text-gray-700">{item.nodeTitle}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[item.status] ?? statusColors.not_started
              }`}
            >
              {item.status.replace("_", " ")}
            </span>
          </div>
        ))}
        {autoData.masteryGrid.length === 0 && (
          <p className="text-sm italic text-gray-400">No mastery data recorded.</p>
        )}
      </div>
    );
  }

  // Attendance summary
  if (type === "attendance_summary" && autoData.attendanceSummary) {
    const att = autoData.attendanceSummary;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: "Total", value: att.totalDays },
            { label: "Present", value: att.present, color: "text-green-700" },
            { label: "Absent", value: att.absent, color: "text-red-700" },
            { label: "Late", value: att.late, color: "text-amber-700" },
            { label: "Excused", value: att.excused, color: "text-blue-700" },
            { label: "Half Day", value: att.halfDay },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-gray-100 bg-gray-50 p-2 text-center"
            >
              <p className={`text-lg font-bold ${stat.color ?? "text-gray-900"}`}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wide text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Attendance rate: <span className="font-medium text-gray-900">{att.attendanceRate}%</span>
        </p>
      </div>
    );
  }

  // Observation highlights
  if (type === "observation_highlights" && autoData.observationHighlights) {
    return (
      <div className="space-y-3">
        {autoData.observationHighlights.length === 0 ? (
          <p className="text-sm italic text-gray-400">No observations for this period.</p>
        ) : (
          autoData.observationHighlights.map((obs) => (
            <div key={obs.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(obs.createdAt)}</span>
                <span>By {obs.authorName}</span>
              </div>
              {obs.content && <p className="mt-1 text-sm text-gray-700">{obs.content}</p>}
              {obs.outcomes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {obs.outcomes.map((outcome, i) => (
                    <span
                      key={i}
                      className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                    >
                      {outcome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return null;
}

// ============================================================
// Helpers
// ============================================================

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
