"use client";

import { useState, useTransition } from "react";
import { exportMqapData } from "@/lib/actions/mqap";
import type { MqapExportData } from "@/lib/actions/mqap";
import { useHaptics } from "@/lib/hooks/use-haptics";

export function MqapExportClient() {
  const [exportData, setExportData] = useState<MqapExportData | null>(null);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleExport() {
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await exportMqapData();
      if (result.data) {
        setExportData(result.data);
      }
    });
  }

  function handleDownloadJson() {
    if (!exportData) return;
    haptics.impact("medium");

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MQAP_Self_Study_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {!exportData ? (
        <div
          className="rounded-xl border border-border p-8 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Generate a structured export of your MQ:AP self-assessment data for
            Montessori Australia submission. This includes all criteria ratings,
            strengths, improvement goals, and NQS alignment.
          </p>
          <button
            type="button"
            className="active-push touch-target rounded-lg px-6 py-3 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={handleExport}
            disabled={isPending}
          >
            {isPending ? "Generating..." : "Generate Export"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary card */}
          <div
            className="rounded-xl border border-border p-5"
            style={{ backgroundColor: "var(--card)" }}
          >
            <p
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {exportData.school_name} - MQ:AP Self-Study
            </p>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Exported {exportData.export_date}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--foreground)" }}
                >
                  {exportData.summary.total_criteria}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Total Criteria
                </p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--qip-meeting)" }}
                >
                  {exportData.summary.meeting_or_exceeding}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Meeting / Exceeding
                </p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--qip-working-towards)" }}
                >
                  {exportData.summary.working_towards}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Working Towards
                </p>
              </div>
              <div>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {exportData.summary.unassessed}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Unassessed
                </p>
              </div>
            </div>
          </div>

          {/* Download button */}
          <div className="flex gap-3">
            <button
              type="button"
              className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
              onClick={handleDownloadJson}
            >
              Download JSON
            </button>
            <button
              type="button"
              className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
              onClick={handleExport}
              disabled={isPending}
            >
              {isPending ? "Regenerating..." : "Regenerate"}
            </button>
          </div>

          {/* Per-QA detail */}
          {exportData.quality_areas.map((qa) => (
            <div
              key={qa.number}
              className="rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                QA{qa.number}: {qa.name}
              </p>
              {qa.standards.map((std) => (
                <div key={std.id} className="mb-3 last:mb-0">
                  <p
                    className="mb-1 text-xs font-bold"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {std.id}: {std.name}
                  </p>
                  {std.criteria.map((c) => (
                    <div
                      key={c.code}
                      className="mb-2 border-l-2 pl-3 last:mb-0"
                      style={{
                        borderColor: c.rating
                          ? c.rating === "exceeding"
                            ? "var(--qip-exceeding)"
                            : c.rating === "meeting"
                              ? "var(--qip-meeting)"
                              : "var(--qip-working-towards)"
                          : "var(--muted)",
                      }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {c.code}{" "}
                        <span
                          className="font-normal"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {c.rating
                            ? c.rating === "working_towards"
                              ? "Working Towards"
                              : c.rating === "meeting"
                                ? "Meeting"
                                : "Exceeding"
                            : "Unassessed"}
                          {c.nqs_alignment &&
                            c.nqs_rating &&
                            ` | NQS ${c.nqs_alignment}: ${c.nqs_rating}`}
                        </span>
                      </p>
                      {c.strengths && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {c.strengths}
                        </p>
                      )}
                      {c.goals.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {c.goals.map((g, gi) => (
                            <li
                              key={gi}
                              className="text-xs"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              Goal: {g.description} ({g.status})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
