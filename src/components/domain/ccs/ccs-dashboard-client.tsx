"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CcsDashboardData } from "@/types/domain";
import { CcsStatusPill } from "./ccs-status-pill";
import { AbsenceCapBar } from "./absence-cap-bar";
import { generateWeeklyReports } from "@/lib/actions/ccs";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { getWeekStartDate } from "@/lib/constants/ccs";

interface CcsDashboardClientProps {
  dashboard: CcsDashboardData;
  canManage: boolean;
}

export function CcsDashboardClient({
  dashboard,
  canManage,
}: CcsDashboardClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    haptics.impact("heavy");
    setGenerating(true);
    setError(null);

    const now = new Date();
    const weekStart = getWeekStartDate(now);

    const result = await generateWeeklyReports(weekStart);

    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      haptics.success();
      router.refresh();
    }

    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Current Week"
          value={
            dashboard.current_week_bundle
              ? `${dashboard.current_week_bundle.report_count} reports`
              : "No bundle"
          }
          sub={
            dashboard.current_week_bundle
              ? `$${(dashboard.current_week_bundle.total_fee_cents / 100).toFixed(0)} total`
              : undefined
          }
        />
        <SummaryCard
          label="Unbundled"
          value={String(dashboard.unbundled_report_count)}
          sub="reports"
        />
        <SummaryCard
          label="Near Cap"
          value={String(dashboard.children_near_cap.length)}
          sub="children"
          warn={dashboard.children_near_cap.length > 0}
        />
        <SummaryCard
          label="Recent"
          value={`${dashboard.recent_bundles.length} bundles`}
          sub="last 8 weeks"
        />
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate This Week"}
          </button>
          <Link
            href="/admin/ccs/absence-tracker"
            className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
            onClick={() => haptics.impact("light")}
          >
            Absence Tracker
          </Link>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Current Week Bundle */}
      {dashboard.current_week_bundle && (
        <section className="space-y-2">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            This Week
          </h2>
          <BundleRow bundle={dashboard.current_week_bundle} />
        </section>
      )}

      {/* Children Near Absence Cap */}
      {dashboard.children_near_cap.length > 0 && (
        <section className="space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--ccs-absence-capped)" }}
          >
            Children Near 42-Day Cap
          </h2>
          <div
            className="space-y-3 rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            {dashboard.children_near_cap.map((s) => (
              <AbsenceCapBar key={s.student.id} summary={s} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Bundles */}
      {dashboard.recent_bundles.length > 0 && (
        <section className="space-y-2">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Recent Bundles
          </h2>
          <div className="space-y-2">
            {dashboard.recent_bundles.map((bundle) => (
              <BundleRow key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-lg font-bold"
        style={{
          color: warn ? "var(--ccs-absence-capped)" : "var(--foreground)",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function BundleRow({
  bundle,
}: {
  bundle: import("@/types/domain").CcsWeeklyBundleWithCounts;
}) {
  const haptics = useHaptics();

  return (
    <Link
      href={`/admin/ccs/${bundle.id}`}
      className="card-interactive flex items-center justify-between rounded-lg border border-border p-3"
      style={{ backgroundColor: "var(--card)" }}
      onClick={() => haptics.impact("light")}
    >
      <div>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {bundle.week_start_date} - {bundle.week_end_date}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {bundle.report_count} reports · {bundle.absence_count} absences · $
          {(bundle.total_fee_cents / 100).toFixed(0)}
        </p>
      </div>
      <CcsStatusPill status={bundle.status} />
    </Link>
  );
}
