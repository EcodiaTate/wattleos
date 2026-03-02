"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import type { ComplianceDashboardData } from "@/lib/actions/staff-compliance";
import type { StaffComplianceSummary, ComplianceItemStatus } from "@/types/domain";
import { ComplianceStatusPill } from "./compliance-status-pill";
import { EctRatioCard } from "./ect-ratio-card";
import { QualificationRatioCard } from "./qualification-ratio-card";
import { WorkerRegisterExportButton } from "./worker-register-export-button";

type FilterStatus = "all" | "compliant" | "expiring" | "non_compliant" | "missing_geccko";

function overallStatus(
  s: StaffComplianceSummary,
): "compliant" | "expiring" | "non_compliant" {
  const statuses: (ComplianceItemStatus | "complete" | "missing")[] = [
    s.wwcc_status,
    s.first_aid_status,
    s.cpr_status,
    s.anaphylaxis_status,
    s.asthma_status,
    s.mandatory_reporting_status,
    s.food_safety_status,
  ];
  const hasExpired =
    statuses.includes("expired") || statuses.includes("missing");
  const hasExpiring = statuses.includes("expiring_soon");
  if (hasExpired || s.geccko_status === "missing") return "non_compliant";
  if (hasExpiring) return "expiring";
  return "compliant";
}

interface Props {
  data: ComplianceDashboardData;
  canManage: boolean;
  canExport: boolean;
}

export function ComplianceDashboardClient({
  data,
  canManage,
  canExport,
}: Props) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = data.staff;

    if (filter === "missing_geccko") {
      result = result.filter((s) => s.geccko_status === "missing");
    } else if (filter !== "all") {
      result = result.filter((s) => overallStatus(s) === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.user.first_name ?? "").toLowerCase().includes(q) ||
          (s.user.last_name ?? "").toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [data.staff, filter, search]);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total Staff" value={data.stats.total_staff} />
        <StatCard
          label="Fully Compliant"
          value={data.stats.fully_compliant}
          positive
        />
        <StatCard
          label="Expiring Soon"
          value={data.stats.expiring_soon}
          warning
        />
        <StatCard
          label="Non-Compliant"
          value={data.stats.non_compliant}
          negative
        />
        <StatCard
          label="Geccko Complete"
          value={data.staff.filter((s) => s.geccko_status === "complete").length}
          positive={data.staff.every((s) => s.geccko_status === "complete")}
          negative={data.staff.some((s) => s.geccko_status === "missing")}
        />
      </div>

      {/* Ratio Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <EctRatioCard
          enrolledChildren={data.ect_ratio.enrolled_children}
          ectStaffCount={data.ect_ratio.ect_staff_count}
          requiredEctCount={data.ect_ratio.required_ect_count}
          isMet={data.ect_ratio.is_met}
        />
        <QualificationRatioCard
          totalActiveStaff={data.qualification_ratio.total_active_staff}
          diplomaOrHigherCount={data.qualification_ratio.diploma_or_higher_count}
          percentage={data.qualification_ratio.percentage}
          isMet={data.qualification_ratio.is_met}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <GlowTarget id="compliance-input-search" category="input" label="Search staff">
            <input
              type="text"
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </GlowTarget>
          <GlowTarget id="compliance-filter-status" category="select" label="Filter by compliance status">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterStatus)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              <option value="all">All Staff</option>
              <option value="compliant">Fully Compliant</option>
              <option value="expiring">Expiring Soon</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="missing_geccko">Missing Geccko</option>
            </select>
          </GlowTarget>
        </div>
        {canExport && (
          <GlowTarget id="compliance-btn-export" category="button" label="Export worker register">
            <WorkerRegisterExportButton />
          </GlowTarget>
        )}
      </div>

      {/* Staff Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p
            className="text-3xl"
            style={{ color: "var(--empty-state-icon)" }}
            aria-hidden
          >
            🪪
          </p>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {search || filter !== "all"
              ? "No staff match your filters."
              : "No staff members found."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto scroll-native rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                <th className="px-3 py-2 text-left font-medium">Staff Member</th>
                <th className="px-3 py-2 text-center font-medium">WWCC</th>
                <th className="px-3 py-2 text-center font-medium">First Aid</th>
                <th className="px-3 py-2 text-center font-medium">CPR</th>
                <th className="hidden px-3 py-2 text-center font-medium sm:table-cell">
                  Anaphylaxis
                </th>
                <th className="hidden px-3 py-2 text-center font-medium sm:table-cell">
                  Asthma
                </th>
                <th className="hidden px-3 py-2 text-center font-medium md:table-cell">
                  Mand. Reporting
                </th>
                <th className="hidden px-3 py-2 text-center font-medium md:table-cell">
                  Food Safety
                </th>
                <th className="hidden px-3 py-2 text-center font-medium md:table-cell">
                  Geccko
                </th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const overall = overallStatus(s);
                const displayName =
                  `${s.user.first_name ?? ""} ${s.user.last_name ?? ""}`.trim() ||
                  s.user.email;

                return (
                  <GlowTarget key={s.user.id} id={`compliance-row-staff-${s.user.id}`} category="row" label={`${displayName} compliance`}>
                    <tr
                      className="border-t border-border transition-colors hover:bg-[var(--muted)]/30"
                    >
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/admin/staff-compliance/${s.user.id}`}
                          className="font-medium hover:underline"
                          style={{ color: "var(--foreground)" }}
                        >
                          {displayName}
                        </Link>
                        {s.profile?.position_title && (
                          <p
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {s.profile.position_title}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ComplianceStatusPill status={s.wwcc_status} compact />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ComplianceStatusPill
                          status={s.first_aid_status}
                          compact
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ComplianceStatusPill status={s.cpr_status} compact />
                      </td>
                      <td className="hidden px-3 py-2.5 text-center sm:table-cell">
                        <ComplianceStatusPill
                          status={s.anaphylaxis_status}
                          compact
                        />
                      </td>
                      <td className="hidden px-3 py-2.5 text-center sm:table-cell">
                        <ComplianceStatusPill
                          status={s.asthma_status}
                          compact
                        />
                      </td>
                      <td className="hidden px-3 py-2.5 text-center md:table-cell">
                        <ComplianceStatusPill
                          status={s.mandatory_reporting_status}
                          compact
                        />
                      </td>
                      <td className="hidden px-3 py-2.5 text-center md:table-cell">
                        <ComplianceStatusPill
                          status={s.food_safety_status}
                          compact
                        />
                      </td>
                      <td className="hidden px-3 py-2.5 text-center md:table-cell">
                        <ComplianceStatusPill
                          status={
                            s.geccko_status === "complete" ? "valid" : "missing"
                          }
                          compact
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <OverallBadge status={overall} />
                      </td>
                    </tr>
                  </GlowTarget>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({
  label,
  value,
  positive,
  warning,
  negative,
}: {
  label: string;
  value: number;
  positive?: boolean;
  warning?: boolean;
  negative?: boolean;
}) {
  let bg = "var(--card)";
  let fg = "var(--foreground)";

  if (positive && value > 0) {
    bg = "var(--attendance-present-bg, #dcfce7)";
    fg = "var(--attendance-present-fg, #166534)";
  } else if (warning && value > 0) {
    bg = "var(--attendance-late-bg, #fef9c3)";
    fg = "var(--attendance-late-fg, #854d0e)";
  } else if (negative && value > 0) {
    bg = "var(--attendance-absent-bg, #fee2e2)";
    fg = "var(--attendance-absent-fg, #991b1b)";
  }

  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ backgroundColor: bg }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: fg }}
      >
        {value}
      </p>
    </div>
  );
}

function OverallBadge({
  status,
}: {
  status: "compliant" | "expiring" | "non_compliant";
}) {
  const config = {
    compliant: {
      label: "OK",
      bg: "var(--attendance-present-bg, #dcfce7)",
      fg: "var(--attendance-present-fg, #166534)",
    },
    expiring: {
      label: "Attention",
      bg: "var(--attendance-late-bg, #fef9c3)",
      fg: "var(--attendance-late-fg, #854d0e)",
    },
    non_compliant: {
      label: "Action",
      bg: "var(--attendance-absent-bg, #fee2e2)",
      fg: "var(--attendance-absent-fg, #991b1b)",
    },
  };

  const c = config[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {c.label}
    </span>
  );
}
