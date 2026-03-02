// src/components/domain/grant-tracking/grant-export-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { exportGrants } from "@/lib/actions/grant-tracking";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "approved", label: "Approved" },
  { value: "submitted", label: "Submitted" },
  { value: "draft", label: "Draft" },
  { value: "acquitted", label: "Acquitted" },
  { value: "closed", label: "Closed" },
] as const;

export function GrantExportClient() {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["active", "approved"]);

  function toggleStatus(val: string) {
    setSelectedStatuses((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val],
    );
  }

  function handleExport() {
    setError(null);
    haptics.impact("medium");

    startTransition(async () => {
      const result = await exportGrants({
        statuses: selectedStatuses as Array<"draft" | "submitted" | "approved" | "active" | "acquitted" | "closed">,
        include_expenditures: true,
        include_milestones: true,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      // Trigger browser download
      const blob = new Blob([result.data!.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data!.filename;
      link.click();
      URL.revokeObjectURL(url);

      haptics.success();
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Include grant statuses:
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                haptics.selection();
                toggleStatus(opt.value);
              }}
              className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: selectedStatuses.includes(opt.value)
                  ? "var(--primary)"
                  : "var(--border)",
                background: selectedStatuses.includes(opt.value)
                  ? "var(--primary)"
                  : "transparent",
                color: selectedStatuses.includes(opt.value)
                  ? "var(--primary-foreground)"
                  : "var(--foreground)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={isPending || selectedStatuses.length === 0}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Generating…" : "Download CSV"}
      </button>
    </div>
  );
}
