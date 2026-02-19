// src/components/domain/reports/report-pdf-actions.tsx
//
// ============================================================
// WattleOS V2 - Report PDF Action Buttons
// ============================================================
// Client component that provides Export PDF / Download PDF
// buttons for the report detail page.
//
// Two states:
//   1. No PDF exists yet → "Export PDF" button → calls exportReportToPdf
//   2. PDF exists → "Download PDF" link + "Re-export" option
//
// WHY client component: Needs loading state, error handling, and
// triggering a browser download after the server action completes.
// ============================================================

"use client";

import {
  exportReportToPdf,
  getReportPdfUrl,
} from "@/lib/actions/report-export";
import { useCallback, useState } from "react";

interface ReportPdfActionsProps {
  reportId: string;
  reportStatus: string;
  hasPdf: boolean;
  /** If true, uses parent-scoped download (no export, download only) */
  isParentView?: boolean;
}

export function ReportPdfActions({
  reportId,
  reportStatus,
  hasPdf,
  isParentView = false,
}: ReportPdfActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null);

  const canExport = reportStatus === "approved" || reportStatus === "published";

  // ── Export (generate + upload) ────────────────────────────

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    const result = await exportReportToPdf(reportId);

    if (result.error) {
      setError(result.error.message);
      setIsExporting(false);
      return;
    }

    if (result.data) {
      // Trigger browser download
      triggerDownload(result.data.download_url, result.data.filename);
      setLastExportedAt(new Date().toLocaleTimeString());
    }

    setIsExporting(false);
  }, [reportId]);

  // ── Download (existing PDF) ───────────────────────────────

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setError(null);

    if (isParentView) {
      // Parents use the direct API route
      window.open(`/api/reports/${reportId}/pdf?parent=true`, "_blank");
      setIsDownloading(false);
      return;
    }

    const result = await getReportPdfUrl(reportId);

    if (result.error) {
      setError(result.error.message);
      setIsDownloading(false);
      return;
    }

    if (result.data) {
      triggerDownload(result.data.download_url, result.data.filename);
    }

    setIsDownloading(false);
  }, [reportId, isParentView]);

  // ── Parent view: download only ────────────────────────────

  if (isParentView) {
    if (!hasPdf) return null;

    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DownloadIcon />
        {isDownloading ? "Preparing..." : "Download PDF"}
      </button>
    );
  }

  // ── Staff view: export + download ─────────────────────────

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {/* Primary action: Export or Download */}
        {hasPdf ? (
          <>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <DownloadIcon />
              {isDownloading ? "Preparing..." : "Download PDF"}
            </button>
            {canExport && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                title="Regenerate the PDF with the latest report content"
              >
                <RefreshIcon />
                {isExporting ? "Generating..." : "Re-export"}
              </button>
            )}
          </>
        ) : canExport ? (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExportIcon />
            {isExporting ? "Generating PDF..." : "Export PDF"}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Report must be approved or published before exporting to PDF.
          </p>
        )}
      </div>

      {/* Status messages */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {lastExportedAt && !error && (
        <p className="text-sm text-green-600">
          PDF exported successfully at {lastExportedAt}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================
// Icons (inline SVG - no external dependency)
// ============================================================

function DownloadIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
      />
    </svg>
  );
}
