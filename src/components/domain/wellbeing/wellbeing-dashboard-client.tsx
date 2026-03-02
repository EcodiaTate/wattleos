"use client";

import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { WellbeingDashboardData } from "@/types/domain";
import { WellbeingSeverityBadge } from "./wellbeing-severity-badge";
import { WellbeingStatusBadge } from "./wellbeing-status-badge";
import { ReferralStatusBadge } from "./referral-status-badge";
import { PastoralCategoryBadge } from "./pastoral-category-badge";
import { REFERRAL_SPECIALTY_CONFIG } from "@/lib/constants/wellbeing";

interface WellbeingDashboardClientProps {
  data: WellbeingDashboardData;
  canManage: boolean;
  canManageReferrals: boolean;
  canViewCaseNotes: boolean;
}

export function WellbeingDashboardClient({
  data,
  canManage,
  canManageReferrals,
  canViewCaseNotes,
}: WellbeingDashboardClientProps) {
  const haptics = useHaptics();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Open Flags"
          value={data.open_flags}
          colorVar="var(--wellbeing-open)"
        />
        <SummaryCard
          label="Critical"
          value={data.flags_by_severity.critical}
          colorVar="var(--wellbeing-critical)"
        />
        <SummaryCard
          label="Active Referrals"
          value={data.active_referrals.length}
          colorVar="var(--referral-in-progress)"
        />
        <SummaryCard
          label="Students Flagged"
          value={data.students_with_open_flags}
          colorVar="var(--foreground)"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Link
            href="/admin/wellbeing/flags/new"
            className="active-push touch-target inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={() => haptics.impact("light")}
          >
            + Raise Flag
          </Link>
        )}
        {canManageReferrals && (
          <Link
            href="/admin/wellbeing/referrals/new"
            className="active-push touch-target inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
            onClick={() => haptics.impact("light")}
          >
            + New Referral
          </Link>
        )}
        <Link
          href="/admin/wellbeing/flags"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          All flags →
        </Link>
        <Link
          href="/admin/wellbeing/referrals"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          All referrals →
        </Link>
        {canViewCaseNotes && (
          <Link
            href="/admin/wellbeing/case-notes"
            className="text-sm font-medium"
            style={{ color: "var(--primary)" }}
          >
            Case notes →
          </Link>
        )}
        <Link
          href="/admin/wellbeing/check-ins"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          Check-ins →
        </Link>
        <Link
          href="/admin/wellbeing/pastoral"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          Pastoral log →
        </Link>
      </div>

      {/* Severity Breakdown */}
      <div
        className="rounded-lg border border-border p-4"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Open Flags by Severity
        </h3>
        <div className="flex gap-3">
          {(["critical", "high", "medium", "low"] as const).map((sev) => (
            <div key={sev} className="flex items-center gap-2">
              <WellbeingSeverityBadge severity={sev} size="sm" />
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {data.flags_by_severity[sev]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Flags Alert */}
      {data.critical_flags.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--wellbeing-critical)",
            backgroundColor: "var(--wellbeing-critical-bg)",
          }}
        >
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Critical Flags ({data.critical_flags.length})
          </h3>
          <div className="space-y-2">
            {data.critical_flags.map((flag) => (
              <Link
                key={flag.id}
                href={`/admin/wellbeing/flags/${flag.id}`}
                className="card-interactive block rounded-lg border border-border p-3"
                onClick={() => haptics.impact("light")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {flag.students.preferred_name ||
                        `${flag.students.first_name} ${flag.students.last_name}`}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {flag.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PastoralCategoryBadge category={flag.category} size="sm" />
                    <WellbeingStatusBadge status={flag.status} size="sm" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Referrals */}
      {data.active_referrals.length > 0 && (
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Active Referrals ({data.active_referrals.length})
          </h3>
          <div className="space-y-2">
            {data.active_referrals.map((ref) => {
              const specCfg = REFERRAL_SPECIALTY_CONFIG[ref.specialty];
              return (
                <Link
                  key={ref.id}
                  href={`/admin/wellbeing/referrals/${ref.id}`}
                  className="card-interactive block rounded-lg border border-border p-3"
                  onClick={() => haptics.impact("light")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p
                        className="font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {ref.students.preferred_name ||
                          `${ref.students.first_name} ${ref.students.last_name}`}
                      </p>
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {specCfg?.emoji} {specCfg?.label}
                        {ref.referred_to_name
                          ? ` - ${ref.referred_to_name}`
                          : ""}
                      </p>
                    </div>
                    <ReferralStatusBadge status={ref.status} size="sm" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Check-ins */}
      {data.upcoming_check_ins.length > 0 && (
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Upcoming Check-ins ({data.upcoming_check_ins.length})
          </h3>
          <div className="space-y-2">
            {data.upcoming_check_ins.map((ci) => (
              <Link
                key={ci.id}
                href={`/admin/wellbeing/check-ins/${ci.id}`}
                className="card-interactive block rounded-lg border border-border p-3"
                onClick={() => haptics.impact("light")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {ci.students.preferred_name ||
                        `${ci.students.first_name} ${ci.students.last_name}`}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {new Date(ci.scheduled_for).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: "var(--checkin-scheduled)",
                      color: "#fff",
                    }}
                  >
                    Scheduled
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Pastoral Records */}
      {data.recent_pastoral_records.length > 0 && (
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Recent Pastoral Records
          </h3>
          <div className="space-y-2">
            {data.recent_pastoral_records.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className="font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {rec.students.preferred_name ||
                        `${rec.students.first_name} ${rec.students.last_name}`}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {rec.title} -{" "}
                      {new Date(rec.date_of_concern).toLocaleDateString(
                        "en-AU",
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PastoralCategoryBadge
                      category={rec.category}
                      size="sm"
                      showEmoji
                    />
                    {!rec.parent_contacted && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: "var(--destructive)",
                          color: "var(--destructive-foreground)",
                        }}
                      >
                        Parent not contacted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.open_flags === 0 &&
        data.active_referrals.length === 0 &&
        data.upcoming_check_ins.length === 0 &&
        data.recent_pastoral_records.length === 0 && (
          <div
            className="rounded-lg border border-border p-12 text-center"
            style={{ backgroundColor: "var(--card)" }}
          >
            <div
              className="mx-auto mb-3 text-4xl"
              style={{ color: "var(--empty-state-icon)" }}
            >
              💚
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              No active wellbeing concerns
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Student flags, referrals, check-ins, and pastoral records will
              appear here.
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
