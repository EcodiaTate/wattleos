/**
 * src/components/domain/timesheets/csv-export-client.tsx
 *
 * ============================================================
 * CSV Export Client Component
 * ============================================================
 * Allows users to export approved timesheets as CSV for
 * manual upload to KeyPay or other payroll systems.
 */

"use client";

import {
  exportTimesheetsAsCSV,
  getExportPreview,
} from "@/lib/actions/timesheet-export";
import { downloadCSV } from "@/lib/integrations/keypay/csv-export";
import { useEffect, useState, useTransition } from "react";

interface CSVExportClientProps {
  payPeriodId: string;
  payPeriodName: string;
  pendingApprovals: number;
}

export function CSVExportClient({
  payPeriodId,
  payPeriodName,
  pendingApprovals,
}: CSVExportClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<{
    timesheetCount: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalLeaveHours: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [includePayg, setIncludePayg] = useState(false);
  const [includeSuper, setIncludeSuper] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Load preview when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const loadPreview = async () => {
      setIsLoading(true);
      const result = await getExportPreview(payPeriodId);
      if (result.data) {
        setPreview(result.data);
      }
      setIsLoading(false);
    };

    loadPreview();
  }, [isOpen, payPeriodId]);

  const handleExport = async () => {
    setExportError(null);
    startTransition(async () => {
      const result = await exportTimesheetsAsCSV(payPeriodId, {
        includePAYGWithheld: includePayg,
        includeSuperannuation: includeSuper,
      });

      if (result.data) {
        const blob = new Blob([result.data.csv], {
          type: "text/csv;charset=utf-8;",
        });
        downloadCSV(blob, result.data.filename);
        setIsOpen(false);
      } else if (result.error) {
        setExportError(result.error.message);
      }
    });
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
          />
        </svg>
        Export as CSV
      </button>

      {/* Modal dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Export Timesheets to CSV
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {payPeriodName}
              </p>
            </div>

            {/* Preview loading */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
              </div>
            ) : preview ? (
              <div className="mb-6 space-y-3 rounded-lg border border-border/50 bg-background/50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timesheets:</span>
                  <span className="font-medium text-foreground">
                    {preview.timesheetCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Hours:</span>
                  <span className="font-medium text-foreground">
                    {preview.totalHours.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Regular:</span>
                  <span className="font-medium text-foreground">
                    {preview.totalRegularHours.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overtime:</span>
                  <span className="font-medium text-foreground">
                    {preview.totalOvertimeHours.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leave:</span>
                  <span className="font-medium text-foreground">
                    {preview.totalLeaveHours.toFixed(1)}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Options */}
            <div className="mb-6 space-y-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={includePayg}
                  onChange={(e) => setIncludePayg(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Include PAYG column (blank - fill in your payroll system)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={includeSuper}
                  onChange={(e) => setIncludeSuper(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Include Superannuation column (blank - fill in your payroll
                system)
              </label>
            </div>

            {/* Export error */}
            {exportError && (
              <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {exportError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setExportError(null);
                }}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isPending || !preview}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Exporting…" : "Download CSV"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
