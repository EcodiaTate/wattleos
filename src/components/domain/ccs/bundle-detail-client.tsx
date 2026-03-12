"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  CcsWeeklyBundleWithCounts,
  CcsSessionReportWithStudent,
  CcsAbsenceTypeCode,
} from "@/types/domain";
import { CcsStatusPill } from "./ccs-status-pill";
import { ReportEditForm } from "./report-edit-form";
import { submitBundle, exportBundle } from "@/lib/actions/ccs";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface BundleDetailClientProps {
  bundle: CcsWeeklyBundleWithCounts;
  reports: CcsSessionReportWithStudent[];
  absenceCodes: CcsAbsenceTypeCode[];
  canManage: boolean;
}

export function BundleDetailClient({
  bundle,
  reports,
  absenceCodes,
  canManage,
}: BundleDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    canManage && (bundle.status === "draft" || bundle.status === "ready");

  async function handleSubmit() {
    haptics.impact("heavy");
    setSubmitting(true);
    setError(null);

    const result = await submitBundle(bundle.id);

    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      haptics.success();
      router.refresh();
    }

    setSubmitting(false);
  }

  async function handleExport() {
    haptics.impact("medium");
    setExporting(true);
    setError(null);

    const result = await exportBundle(bundle.id);

    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else if (result.data) {
      // Trigger download
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ccs-bundle-${bundle.week_start_date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      haptics.success();
    }

    setExporting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/ccs"
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
            onClick={() => haptics.impact("light")}
          >
            ← Back to CCS Reports
          </Link>
          <h1
            className="mt-1 text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Week: {bundle.week_start_date} - {bundle.week_end_date}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <CcsStatusPill status={bundle.status} size="md" />
            <span
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {bundle.report_count} reports · {bundle.absence_count} absences
            </span>
          </div>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              className="active-push touch-target rounded-lg border border-border px-3 py-2 text-sm font-medium"
              style={{ color: "var(--foreground)" }}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            {canSubmit && (
              <button
                type="button"
                className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit to CCS"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Reports Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b border-border text-left text-xs uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              <th className="px-2 py-2">Student</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Time</th>
              <th className="px-2 py-2">Hours</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Fee</th>
              <th className="px-2 py-2">Absence</th>
              <th className="px-2 py-2">Code</th>
              {canManage && <th className="px-2 py-2" />}
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className="border-b border-border"
                style={{
                  backgroundColor: report.absence_flag
                    ? "var(--ccs-absence-capped)"
                    : undefined,
                  color: report.absence_flag
                    ? "var(--ccs-absence-capped-fg)"
                    : "var(--foreground)",
                  opacity: report.absence_flag ? 0.15 : undefined,
                }}
              >
                <td
                  className="px-2 py-2 font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {report.student.first_name} {report.student.last_name}
                </td>
                <td
                  className="px-2 py-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {report.session_date}
                </td>
                <td
                  className="whitespace-nowrap px-2 py-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {report.start_time}–{report.end_time}
                </td>
                <td
                  className="px-2 py-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {report.hours_of_care.toFixed(1)}
                </td>
                <td
                  className="px-2 py-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {report.session_type.replace(/_/g, " ")}
                </td>
                <td
                  className="px-2 py-2"
                  style={{ color: "var(--foreground)" }}
                >
                  ${(report.full_fee_cents / 100).toFixed(2)}
                </td>
                <td className="px-2 py-2">
                  {report.absence_flag ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--ccs-absence-capped)",
                        color: "var(--ccs-absence-capped-fg)",
                      }}
                    >
                      Absent
                    </span>
                  ) : (
                    <span
                      className="text-xs"
                      style={{ color: "var(--ccs-accepted)" }}
                    >
                      Present
                    </span>
                  )}
                </td>
                <td
                  className="px-2 py-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {report.absence_type_code ?? "-"}
                </td>
                {canManage && (
                  <td className="px-2 py-2">
                    {report.report_status === "draft" && (
                      <button
                        type="button"
                        className="active-push touch-target text-xs font-medium"
                        style={{ color: "var(--primary)" }}
                        onClick={() => {
                          haptics.impact("light");
                          setEditingReportId(
                            editingReportId === report.id ? null : report.id,
                          );
                        }}
                      >
                        {editingReportId === report.id ? "Close" : "Edit"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline Edit Form */}
      {editingReportId && (
        <ReportEditForm
          reportId={editingReportId}
          report={reports.find((r) => r.id === editingReportId)!}
          absenceCodes={absenceCodes}
          onClose={() => {
            setEditingReportId(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
