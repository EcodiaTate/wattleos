"use client";

import Link from "next/link";
import type { CcsAbsenceCapSummary } from "@/types/domain";
import { AbsenceCapBar } from "./absence-cap-bar";
import { CCS_ANNUAL_ABSENCE_CAP } from "@/lib/constants/ccs";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface AbsenceTrackerClientProps {
  summaries: CcsAbsenceCapSummary[];
}

export function AbsenceTrackerClient({
  summaries,
}: AbsenceTrackerClientProps) {
  const haptics = useHaptics();

  const atCap = summaries.filter((s) => s.is_at_cap);
  const nearCap = summaries.filter((s) => s.is_warning && !s.is_at_cap);
  const underCap = summaries.filter((s) => !s.is_warning && !s.is_at_cap);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/ccs"
        className="text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
        onClick={() => haptics.impact("light")}
      >
        ← Back to CCS Reports
      </Link>

      {summaries.length === 0 && (
        <div className="py-12 text-center">
          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No absence data recorded this financial year.
          </p>
        </div>
      )}

      {/* At cap */}
      {atCap.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--ccs-rejected)" }}
          >
            At Cap ({CCS_ANNUAL_ABSENCE_CAP} days)
          </h2>
          <div
            className="space-y-3 rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            {atCap.map((s) => (
              <AbsenceCapBar key={s.student.id} summary={s} />
            ))}
          </div>
        </section>
      )}

      {/* Near cap */}
      {nearCap.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--ccs-absence-capped)" }}
          >
            Approaching Cap (35+ days)
          </h2>
          <div
            className="space-y-3 rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            {nearCap.map((s) => (
              <AbsenceCapBar key={s.student.id} summary={s} />
            ))}
          </div>
        </section>
      )}

      {/* Under cap */}
      {underCap.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Under Cap
          </h2>
          <div
            className="space-y-3 rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            {underCap.map((s) => (
              <AbsenceCapBar key={s.student.id} summary={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
