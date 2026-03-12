"use client";

// src/components/domain/accreditation/accreditation-dashboard-client.tsx
//
// Dashboard showing accreditation status across all three bodies.
// One card per body (AMI / AMS / MSAA) with active cycle progress
// and a list of all historical cycles.

import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  AccreditationBodyCode,
  AccreditationDashboardData,
} from "@/types/domain";
import {
  AccreditationBodyChip,
  AccreditationCycleStatusBadge,
  AccreditationProgressBar,
} from "./accreditation-rating-badge";

const BODIES: AccreditationBodyCode[] = ["ami", "ams", "msaa"];

const BODY_FULL_NAMES: Record<AccreditationBodyCode, string> = {
  ami: "Association Montessori Internationale",
  ams: "American Montessori Society",
  msaa: "Montessori Schools Association of Australia",
};

interface Props {
  data: AccreditationDashboardData;
  canManage: boolean;
}

export function AccreditationDashboardClient({ data, canManage }: Props) {
  const haptics = useHaptics();

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Accreditation Checklist
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            AMI · AMS · MSAA self-assessment across all Montessori accrediting
            bodies
          </p>
        </div>
        {canManage && (
          <Link
            href="/pedagogy/accreditation/cycles/new"
            onClick={() => haptics.impact("medium")}
            className="touch-target active-push inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            + New Cycle
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Cycles" value={data.total_cycles} />
        <StatCard label="Accredited" value={data.accredited_count} />
        <StatCard
          label="Active Self-Studies"
          value={
            BODIES.filter(
              (b) => data.active_cycle_by_body[b]?.status === "self_study",
            ).length
          }
        />
        <StatCard
          label="Submitted"
          value={
            BODIES.filter((b) =>
              ["submitted", "under_review"].includes(
                data.active_cycle_by_body[b]?.status ?? "",
              ),
            ).length
          }
        />
      </div>

      {/* Body cards - one per accrediting body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BODIES.map((body) => {
          const activeCycle = data.active_cycle_by_body[body];
          return (
            <div
              key={body}
              className="card-interactive border border-border rounded-xl p-5 flex flex-col gap-4"
              style={{ background: "var(--card)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <AccreditationBodyChip bodyCode={body} />
                  <p
                    className="mt-1 text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {BODY_FULL_NAMES[body]}
                  </p>
                </div>
              </div>

              {activeCycle ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AccreditationCycleStatusBadge
                      status={activeCycle.status}
                      size="sm"
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {activeCycle.cycle_label}
                    </span>
                  </div>
                  <AccreditationProgressBar
                    pct={activeCycle.overall_progress_pct}
                    metCount={activeCycle.met_count + activeCycle.exceeds_count}
                    totalCount={activeCycle.total_criteria}
                  />
                  <div
                    className="flex gap-2 flex-wrap text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {activeCycle.not_met_count > 0 && (
                      <span style={{ color: "var(--accred-not-met)" }}>
                        {activeCycle.not_met_count} not met
                      </span>
                    )}
                    {activeCycle.partially_met_count > 0 && (
                      <span style={{ color: "var(--accred-partially-met)" }}>
                        {activeCycle.partially_met_count} partial
                      </span>
                    )}
                    {activeCycle.not_started_count > 0 && (
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {activeCycle.not_started_count} to do
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/pedagogy/accreditation/cycles/${activeCycle.id}`}
                    onClick={() => haptics.impact("light")}
                    className="touch-target active-push inline-flex items-center gap-1 text-sm font-medium"
                    style={{ color: `var(--accred-body-${body})` }}
                  >
                    Open checklist →
                  </Link>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center gap-3">
                  <p
                    className="text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    No active cycle
                  </p>
                  {canManage && (
                    <Link
                      href={`/pedagogy/accreditation/cycles/new?body=${body}`}
                      onClick={() => haptics.impact("light")}
                      className="touch-target active-push text-sm font-medium"
                      style={{ color: `var(--accred-body-${body})` }}
                    >
                      Start {body.toUpperCase()} cycle →
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All cycles table */}
      {data.cycles.length > 0 && (
        <div>
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            All Cycles
          </h2>
          <div
            className="border border-border rounded-xl overflow-hidden"
            style={{ background: "var(--card)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: "var(--muted/30)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Body
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Cycle
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium hidden md:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-right font-medium hidden md:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Progress
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.cycles.map((cycle) => (
                  <tr
                    key={cycle.id}
                    className="border-t border-border hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <AccreditationBodyChip bodyCode={cycle.body_code} />
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {cycle.cycle_label}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <AccreditationCycleStatusBadge
                        status={cycle.status}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {cycle.total_criteria > 0 ? (
                        <span style={{ color: "var(--foreground)" }}>
                          {cycle.overall_progress_pct}%
                          <span
                            className="ml-1 text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            ({cycle.met_count + cycle.exceeds_count}/
                            {cycle.total_criteria})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted-foreground)" }}>
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/pedagogy/accreditation/cycles/${cycle.id}`}
                        onClick={() => haptics.impact("light")}
                        className="touch-target active-push text-sm font-medium"
                        style={{ color: "var(--primary)" }}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.cycles.length === 0 && (
        <div className="text-center py-20">
          <p
            className="text-4xl mb-3"
            style={{ color: "var(--empty-state-icon)" }}
          >
            🎓
          </p>
          <p
            className="text-base font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No accreditation cycles yet
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Start a self-study cycle for AMI, AMS, or MSAA accreditation.
          </p>
          {canManage && (
            <Link
              href="/pedagogy/accreditation/cycles/new"
              onClick={() => haptics.impact("medium")}
              className="touch-target active-push inline-flex items-center mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              + New Cycle
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="border border-border rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "var(--card)" }}
    >
      <span
        className="text-2xl font-bold"
        style={{ color: "var(--foreground)" }}
      >
        {value}
      </span>
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
    </div>
  );
}
