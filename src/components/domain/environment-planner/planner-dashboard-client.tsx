"use client";

// src/components/domain/environment-planner/planner-dashboard-client.tsx

import Link from "next/link";
import { CalendarDays, LayoutGrid, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { EnvironmentPlannerDashboardData, MaterialShelfLocation } from "@/types/domain";
import { EnvironmentPlanStatusBadge, RotationStatusBadge, RotationThemeBadge } from "./environment-plan-status-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  data: EnvironmentPlannerDashboardData;
  locations: MaterialShelfLocation[];
  canManage: boolean;
}

export function EnvironmentPlannerDashboardClient({ data, locations: _locations, canManage }: Props) {
  const haptics = useHaptics();
  const today   = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 space-y-8 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Prepared Environment
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Shelf layout plans and material rotation schedules
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/pedagogy/environment-planner/plans/new"
              className="active-push touch-target inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              onClick={() => haptics.impact("medium")}
            >
              <Plus className="w-4 h-4" />
              New Plan
            </Link>
            <Link
              href="/pedagogy/environment-planner/rotations/new"
              className="active-push touch-target inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-border"
              style={{ color: "var(--text-primary)" }}
              onClick={() => haptics.impact("light")}
            >
              <CalendarDays className="w-4 h-4" />
              Schedule Rotation
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Plans",       value: data.total_plans,         icon: LayoutGrid },
          { label: "Active Plans",      value: data.active_plans,        icon: CheckCircle2 },
          { label: "Upcoming Rotations",value: data.upcoming_rotations,  icon: CalendarDays },
          { label: "Overdue Rotations", value: data.overdue_rotations,   icon: AlertTriangle,
            accent: data.overdue_rotations > 0 },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-xl p-4 border border-border"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon
                className="w-4 h-4"
                style={{ color: accent ? "var(--env-rotation-overdue)" : "var(--text-secondary)" }}
              />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</span>
            </div>
            <p
              className="text-3xl font-bold"
              style={{ color: accent ? "var(--env-rotation-overdue)" : "var(--text-primary)" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Plans */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Layout Plans
          </h2>
          {canManage && (
            <Link
              href="/pedagogy/environment-planner/plans/new"
              className="text-sm"
              style={{ color: "var(--primary)" }}
              onClick={() => haptics.impact("light")}
            >
              + New plan
            </Link>
          )}
        </div>
        {data.recent_plans.length === 0 ? (
          <div
            className="rounded-xl border border-border p-8 text-center"
            style={{ background: "var(--surface)" }}
          >
            <LayoutGrid className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--empty-state-icon)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No environment plans yet. Create one to start mapping your shelf layout.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recent_plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/pedagogy/environment-planner/plans/${plan.id}`}
                className="card-interactive rounded-xl border border-border p-4 block"
                style={{ background: "var(--surface)" }}
                onClick={() => haptics.impact("light")}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
                    {plan.name}
                  </p>
                  <EnvironmentPlanStatusBadge status={plan.status} />
                </div>
                {plan.theme && (
                  <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>
                    {plan.theme}
                  </p>
                )}
                {plan.effective_from && (
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    From {plan.effective_from}
                    {plan.effective_to ? ` → ${plan.effective_to}` : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Rotations */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Upcoming Rotations
          </h2>
          <Link
            href="/pedagogy/environment-planner/rotations"
            className="text-sm"
            style={{ color: "var(--primary)" }}
            onClick={() => haptics.impact("light")}
          >
            View all
          </Link>
        </div>
        {data.upcoming_rotation_list.length === 0 ? (
          <div
            className="rounded-xl border border-border p-8 text-center"
            style={{ background: "var(--surface)" }}
          >
            <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--empty-state-icon)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No upcoming rotations scheduled.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--surface)" }}>
            {data.upcoming_rotation_list.map((rotation, idx) => {
              const isOverdue = rotation.status === "upcoming" && rotation.scheduled_date < today;
              return (
                <div
                  key={rotation.id}
                  className={`px-4 py-3 flex items-center justify-between gap-4 ${idx > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {rotation.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RotationThemeBadge themeType={rotation.theme_type} />
                      {rotation.location && (
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          · {(rotation.location as { name: string }).name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: isOverdue ? "var(--env-rotation-overdue)" : "var(--text-secondary)" }}
                    >
                      {rotation.scheduled_date}
                    </p>
                    <RotationStatusBadge status={rotation.status} scheduledDate={rotation.scheduled_date} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
