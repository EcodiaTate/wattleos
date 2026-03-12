"use client";

import Link from "next/link";
import type { SickBayDashboardData } from "@/types/domain";
import { SickBayStatusBadge } from "./sick-bay-status-badge";

interface SickBayDashboardClientProps {
  data: SickBayDashboardData;
  canManage: boolean;
}

export function SickBayDashboardClient({
  data,
  canManage,
}: SickBayDashboardClientProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Today"
          value={data.summary.total_today}
          colorVar="var(--foreground)"
        />
        <SummaryCard
          label="Open"
          value={data.summary.open}
          colorVar="var(--sick-bay-open)"
        />
        <SummaryCard
          label="Resolved"
          value={data.summary.resolved}
          colorVar="var(--sick-bay-resolved)"
        />
        <SummaryCard
          label="Referred"
          value={data.summary.referred}
          colorVar="var(--sick-bay-referred)"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Link
            href="/admin/sick-bay/new"
            className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            + Record New Visit
          </Link>
        )}
        <Link
          href="/admin/sick-bay/history"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          View all visits →
        </Link>
      </div>

      {/* Today's Visits */}
      {data.visits_today.length > 0 && (
        <div className="rounded-lg border border-border p-4"
             style={{ backgroundColor: "var(--card)" }}>
          <h3 className="mb-4 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}>
            Today's Visits ({data.visits_today.length})
          </h3>
          <div className="space-y-2">
            {data.visits_today.map((visit) => (
              <Link
                key={visit.id}
                href={`/admin/sick-bay/${visit.id}`}
                className="card-interactive block rounded-lg border border-border p-3"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>
                      {visit.student.first_name} {visit.student.last_name}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {visit.presenting_complaint || "No complaint recorded"}
                    </p>
                  </div>
                  <SickBayStatusBadge status={visit.status} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Open Visits */}
      {data.open_visits.length > 0 && (
        <div className="rounded-lg border border-border p-4"
             style={{
               borderColor: "var(--sick-bay-open)",
               backgroundColor: "var(--sick-bay-open-bg)",
             }}>
          <h3 className="mb-4 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}>
            Open Visits ({data.open_visits.length})
          </h3>
          <div className="space-y-2">
            {data.open_visits.map((visit) => (
              <Link
                key={visit.id}
                href={`/admin/sick-bay/${visit.id}`}
                className="card-interactive block rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" style={{ color: "var(--foreground)" }}>
                      {visit.student.first_name} {visit.student.last_name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(visit.visit_date).toLocaleDateString()} at{" "}
                      {visit.arrived_at
                        ? new Date(visit.arrived_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </p>
                  </div>
                  {!visit.parent_notified && (
                    <span className="text-xs font-medium"
                          style={{
                            backgroundColor: "var(--destructive)",
                            color: "var(--destructive-foreground)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.25rem",
                          }}>
                      Parent not notified
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.visits_today.length === 0 && data.open_visits.length === 0 && (
        <div className="rounded-lg border border-border p-12 text-center"
             style={{ backgroundColor: "var(--card)" }}>
          <div className="mx-auto mb-3 text-4xl"
               style={{ color: "var(--empty-state-icon)" }}>
            🏥
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            No visits recorded
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Sick bay visits will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  colorVar,
}: {
  label: string;
  value: number;
  colorVar: string;
}) {
  return (
    <div
      className="rounded-lg border border-border p-4 text-center"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p className="text-2xl font-bold" style={{ color: colorVar }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
    </div>
  );
}
