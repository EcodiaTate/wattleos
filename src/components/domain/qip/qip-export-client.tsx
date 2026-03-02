"use client";

import { useState, useTransition } from "react";
import { exportQipToPdf } from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { QipDashboardSummary } from "@/lib/actions/qip";

interface QipExportClientProps {
  summary: QipDashboardSummary;
  canManage: boolean;
}

export function QipExportClient({
  summary,
  canManage,
}: QipExportClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const haptics = useHaptics();

  function handleExport() {
    haptics.impact("heavy");
    startTransition(async () => {
      setError(null);
      setDownloadUrl(null);
      const result = await exportQipToPdf();
      if (result.error) {
        haptics.error();
        setError(result.error.message);
      } else if (result.data) {
        haptics.success();
        setDownloadUrl(result.data.download_url);
        // Auto-open download
        window.open(result.data.download_url, "_blank");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Preview info */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="text-sm font-bold"
          style={{ color: "var(--foreground)" }}
        >
          QIP Export Preview
        </h2>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          The exported PDF will contain:
        </p>
        <ul
          className="mt-3 space-y-1.5 text-sm"
          style={{ color: "var(--foreground)" }}
        >
          <li>
            Service philosophy{" "}
            {summary.philosophy.exists ? (
              <span
                className="text-xs"
                style={{ color: "var(--qip-meeting)" }}
              >
                (v{summary.philosophy.version})
              </span>
            ) : (
              <span
                className="text-xs"
                style={{ color: "var(--attendance-absent-fg)" }}
              >
                (not published)
              </span>
            )}
          </li>
          <li>
            {summary.overall.assessed_count} of{" "}
            {summary.overall.total_elements} element assessments
          </li>
          <li>{summary.overall.goals_total} improvement goals</li>
          <li>{summary.overall.evidence_total} evidence items</li>
        </ul>

        {/* Per-QA summary */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.quality_areas.map((qa) => (
            <div
              key={qa.qa_number}
              className="rounded-lg p-2 text-center"
              style={{ backgroundColor: "var(--muted)" }}
            >
              <p
                className="text-xs font-bold"
                style={{ color: "var(--foreground)" }}
              >
                QA{qa.qa_number}
              </p>
              <p
                className="text-lg font-bold tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {qa.assessed_count}/{qa.total_elements}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Export button */}
      {canManage && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-6 py-3 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Generating PDF..." : "Generate QIP PDF"}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              Download again
            </a>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
