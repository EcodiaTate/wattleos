"use client";

import { useState, useCallback, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { getDailyCareExport } from "@/lib/actions/daily-care";

// ── Component ──────────────────────────────────────────────────

export function CareExportClient() {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const handleExport = useCallback(() => {
    haptics.impact("medium");
    setExportError(null);
    setExportSuccess(false);

    startTransition(async () => {
      const result = await getDailyCareExport(selectedDate);

      if (result.error || !result.data) {
        haptics.error();
        setExportError(
          result.error?.message ?? "Failed to generate export data.",
        );
        return;
      }

      const { headers, rows } = result.data;

      if (rows.length === 0) {
        haptics.warning();
        setExportError("No care entries found for this date.");
        return;
      }

      // Build CSV content
      const escapeCsv = (value: string): string => {
        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvLines: string[] = [];
      csvLines.push(headers.map(escapeCsv).join(","));
      for (const row of rows) {
        csvLines.push(row.map(escapeCsv).join(","));
      }
      const csvContent = csvLines.join("\n");

      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daily-care-log-${selectedDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      haptics.success();
      setExportSuccess(true);
    });
  }, [haptics, selectedDate]);

  const formattedDate = new Date(
    selectedDate + "T00:00:00",
  ).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Date Picker ──────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Select Date
        </h2>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <label
                htmlFor="export-date"
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Export date
              </label>
              <input
                id="export-date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setExportError(null);
                  setExportSuccess(false);
                }}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2.5 text-sm font-medium sm:w-auto"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {formattedDate}
          </p>
        </div>
      </div>

      {/* ── Export Action ─────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Export
        </h2>

        <p
          className="mb-4 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Download a CSV file containing all daily care entries for the selected
          date. The export includes student names, timestamps, entry types,
          details, notes, and the recording educator.
        </p>

        <button
          type="button"
          onClick={handleExport}
          disabled={isPending || !selectedDate}
          className="active-push touch-target rounded-[var(--radius-md)] px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </span>
          )}
        </button>

        {/* ── Error Message ─────────────────────────────────────── */}
        {exportError && (
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--destructive)" }}
          >
            {exportError}
          </p>
        )}

        {/* ── Success Message ───────────────────────────────────── */}
        {exportSuccess && (
          <p
            className="mt-3 text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            Export downloaded successfully.
          </p>
        )}
      </div>
    </div>
  );
}
