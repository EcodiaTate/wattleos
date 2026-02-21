// src/components/domain/reports/report-pdf-actions.tsx
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
      triggerDownload(result.data.download_url, result.data.filename);
      setLastExportedAt(new Date().toLocaleTimeString());
    }

    setIsExporting(false);
  }, [reportId]);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setError(null);

    if (isParentView) {
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

  if (isParentView) {
    if (!hasPdf) return null;

    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center justify-center gap-3 rounded-lg bg-primary px-6 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-95"
      >
        <DownloadIcon />
        {isDownloading ? "Preparing..." : "Download Report PDF"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {hasPdf ? (
          <>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-95"
            >
              <DownloadIcon />
              {isDownloading ? "Preparing..." : "Download PDF"}
            </button>
            {canExport && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 h-[var(--density-button-height)] text-sm font-bold text-foreground transition-all hover:bg-muted disabled:opacity-50 active:scale-95"
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
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-95"
          >
            <ExportIcon />
            {isExporting ? "Generating PDF..." : "Export to PDF"}
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
             <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
             </svg>
             Approve report to enable PDF export
          </div>
        )}
      </div>

      {error && (
        <p className="animate-fade-in text-[10px] font-bold text-destructive uppercase tracking-widest">{error}</p>
      )}
      {lastExportedAt && !error && (
        <p className="animate-fade-in text-[10px] font-bold text-success uppercase tracking-widest flex items-center gap-1.5">
          <span className="flex h-1 w-1 rounded-full bg-success"></span>
          PDF generated at {lastExportedAt}
        </p>
      )}
    </div>
  );
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}