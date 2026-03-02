"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface PlanExportClientProps {
  planId: string;
  studentName?: string;
}

export function PlanExportClient({ planId }: PlanExportClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      try {
        // TODO: Implement PDF export via server action
        haptics.impact();
        alert("PDF export coming soon - plan ID: " + planId);
      } catch {
        setError("Failed to generate PDF");
        haptics.error();
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Generating PDF..." : "Download PDF"}
      </button>
    </div>
  );
}
