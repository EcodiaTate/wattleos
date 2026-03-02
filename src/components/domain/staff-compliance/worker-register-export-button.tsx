"use client";

import { useState } from "react";
import Link from "next/link";
import {
  exportWorkerRegister,
  validateWorkerRegister,
  type WorkerRegisterValidationResult,
} from "@/lib/actions/staff-compliance";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function WorkerRegisterExportButton() {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] =
    useState<WorkerRegisterValidationResult | null>(null);
  const haptics = useHaptics();

  async function handleClick() {
    setValidating(true);
    setError(null);
    setValidation(null);
    haptics.impact("medium");

    const result = await validateWorkerRegister();

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      setValidating(false);
      return;
    }

    if (result.data) {
      if (result.data.incomplete_count === 0) {
        // All staff complete - export directly
        setValidating(false);
        await doExport();
      } else {
        // Show validation dialog
        setValidation(result.data);
        haptics.warning();
        setValidating(false);
      }
    } else {
      setValidating(false);
    }
  }

  async function doExport() {
    setLoading(true);
    setError(null);
    haptics.impact("medium");

    const result = await exportWorkerRegister();

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      setLoading(false);
      return;
    }

    if (result.data) {
      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      haptics.success();
    }

    setLoading(false);
    setValidation(null);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || validating}
        className="active-push touch-target inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors"
        style={{
          backgroundColor: "var(--card)",
          color: "var(--foreground)",
        }}
      >
        {validating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Validating…
          </>
        ) : loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Exporting…
          </>
        ) : (
          <>
            <span aria-hidden>📥</span>
            Export Worker Register
          </>
        )}
      </button>

      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Validation Dialog */}
      {validation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border p-6 shadow-xl"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Incomplete Staff Profiles
            </h3>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {validation.incomplete_count} of {validation.total_staff} staff
              members have missing fields required for NQA ITS.
            </p>

            {/* Incomplete staff list */}
            <div className="mt-4 max-h-60 space-y-2 overflow-y-auto scroll-native">
              {validation.incomplete_staff.map((staff) => (
                <div
                  key={staff.user_id}
                  className="rounded-lg border border-border p-3"
                  style={{
                    backgroundColor: "var(--attendance-absent-bg, #fee2e2)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {staff.user_name}
                    </span>
                    <Link
                      href={`/admin/staff-compliance/${staff.user_id}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: "var(--primary)" }}
                      onClick={() => setValidation(null)}
                    >
                      Fix
                    </Link>
                  </div>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--attendance-absent-fg, #991b1b)" }}
                  >
                    Missing: {staff.missing_fields.join(", ")}
                  </p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div
              className="mt-4 rounded-lg border border-border p-3"
              style={{
                backgroundColor: "var(--attendance-present-bg, #dcfce7)",
              }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--attendance-present-fg, #166534)" }}
              >
                {validation.complete_count} staff member
                {validation.complete_count !== 1 ? "s" : ""} fully complete
              </p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setValidation(null)}
                className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doExport}
                disabled={loading}
                className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--attendance-late-bg, #fef9c3)",
                  color: "var(--attendance-late-fg, #854d0e)",
                }}
              >
                {loading ? "Exporting…" : "Export Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
