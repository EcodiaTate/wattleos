"use client";

// src/components/domain/nccd/nccd-export-client.tsx
//
// NCCD annual collection export - CSV download + submission workflow.

import { useState } from "react";

import { NCCD_LEVEL_CONFIG, NCCD_LEVELS_ORDERED } from "@/lib/constants/nccd";
import { exportNccdCollection, submitNccdCollection } from "@/lib/actions/nccd";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { NccdCollectionSummary } from "@/types/domain";

interface NccdExportClientProps {
  summary: NccdCollectionSummary;
  unsubmittedIds: string[];
  canManage: boolean;
}

export function NccdExportClient({
  summary,
  unsubmittedIds,
  canManage,
}: NccdExportClientProps) {
  const haptics = useHaptics();
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    count: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    haptics.medium();

    const result = await exportNccdCollection(summary.year);
    setExporting(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Export failed");
      haptics.error();
      return;
    }

    // Trigger CSV download in the browser
    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nccd_collection_${summary.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    haptics.success();
  }

  async function handleSubmit() {
    if (!canManage || unsubmittedIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    haptics.heavy();

    const result = await submitNccdCollection({
      entry_ids: unsubmittedIds,
      collection_year: summary.year,
    });

    setSubmitting(false);
    setShowSubmitConfirm(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Submission failed");
      haptics.error();
      return;
    }

    haptics.success();
    setSubmitResult({ count: result.data.submitted_count });
  }

  return (
    <div className="space-y-6">
      {/* Year + summary */}
      <div
        className="rounded-2xl border border-border p-5 space-y-4"
        style={{ background: "var(--card)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {summary.year} NCCD Collection
            </h2>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--muted-foreground)" }}
            >
              {summary.total_students} students · {summary.submitted} submitted
              · {summary.pending_submission} pending
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || summary.total_students === 0}
            className="touch-target active-push rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {exporting ? "Exporting…" : "⬇ Download CSV"}
          </button>
        </div>

        {/* Level breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {NCCD_LEVELS_ORDERED.map((lvl) => {
            const count = summary.by_level[lvl] ?? 0;
            const config = NCCD_LEVEL_CONFIG[lvl];
            return (
              <div
                key={lvl}
                className="rounded-xl border border-border p-3 text-center"
                style={{ background: "var(--background)" }}
              >
                <p
                  className="text-2xl font-bold"
                  style={{ color: config.cssVar }}
                >
                  {count}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {config.shortLabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit section */}
      {canManage && unsubmittedIds.length > 0 && !submitResult && (
        <div
          className="rounded-2xl border border-border p-5 space-y-4"
          style={{ background: "var(--card)" }}
        >
          <div>
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Mark as Submitted
            </h3>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {unsubmittedIds.length} active entr
              {unsubmittedIds.length === 1 ? "y" : "ies"} not yet marked as
              submitted. Once your school has submitted data via the NCCD data
              portal, record the submission here to keep your register up to
              date.
            </p>
          </div>

          {showSubmitConfirm ? (
            <div
              className="rounded-xl border border-border p-4 space-y-3"
              style={{ background: "var(--nccd-status-under-review-bg)" }}
            >
              <p
                className="text-sm font-medium"
                style={{ color: "var(--nccd-status-under-review-fg)" }}
              >
                This will mark {unsubmittedIds.length} entr
                {unsubmittedIds.length === 1 ? "y" : "ies"} as submitted to the{" "}
                {summary.year} NCCD collection. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setShowSubmitConfirm(false);
                  }}
                  className="touch-target active-push rounded-xl border border-border px-4 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="touch-target active-push rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {submitting
                    ? "Submitting…"
                    : `Confirm - Submit ${unsubmittedIds.length}`}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                setShowSubmitConfirm(true);
              }}
              className="touch-target active-push rounded-xl border border-border px-5 py-2.5 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Mark {unsubmittedIds.length} as Submitted
            </button>
          )}
        </div>
      )}

      {/* Success */}
      {submitResult && (
        <div
          className="rounded-2xl border px-5 py-4 flex items-center gap-3"
          style={{
            background: "var(--nccd-status-active-bg)",
            borderColor: "var(--nccd-status-active)",
            color: "var(--nccd-status-active-fg)",
          }}
        >
          <span className="text-xl">✓</span>
          <p className="text-sm font-medium">
            {submitResult.count} entr{submitResult.count === 1 ? "y" : "ies"}{" "}
            marked as submitted to the {summary.year} collection.
          </p>
        </div>
      )}

      {error && (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            background: "var(--nccd-extensive-bg)",
            color: "var(--nccd-extensive-fg)",
            borderColor: "var(--nccd-extensive)",
          }}
        >
          {error}
        </p>
      )}

      {/* Instructions */}
      <div
        className="rounded-2xl border border-border p-5 space-y-3"
        style={{ background: "var(--card)" }}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          NCCD Submission Process
        </h3>
        <ol className="space-y-2">
          {[
            "Ensure all active entries have parental consent recorded",
            "Ensure all Substantial/Extensive entries have a professional opinion",
            "Download the CSV export above",
            "Log in to the NCCD Data Portal (nccd.edu.au) and upload or enter the data",
            "Once submitted, return here and mark entries as submitted",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span
                className="shrink-0 font-bold"
                style={{ color: "var(--muted-foreground)" }}
              >
                {i + 1}.
              </span>
              <span style={{ color: "var(--foreground)" }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
