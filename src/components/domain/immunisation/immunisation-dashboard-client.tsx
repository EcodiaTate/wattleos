"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ImmunisationDashboardData,
  ImmunisationRecordWithStudent,
  ImmunisationStatus,
} from "@/types/domain";
import { ImmunisationStatusPill } from "./immunisation-status-pill";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ImmunisationDashboardClientProps {
  dashboard: ImmunisationDashboardData;
  canManage: boolean;
}

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "up_to_date", label: "Up to Date" },
  { value: "catch_up_schedule", label: "Catch-up" },
  { value: "medical_exemption", label: "Exemption" },
  { value: "pending", label: "Pending" },
];

export function ImmunisationDashboardClient({
  dashboard,
  canManage,
}: ImmunisationDashboardClientProps) {
  const haptics = useHaptics();
  const { summary, overdue_air_checks, non_compliant } = dashboard;
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Merge non-compliant + overdue into a single display list
  // Non-compliant already includes catch-up and pending
  const allRecords = non_compliant;

  // Filter display
  const filtered = allRecords.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const name =
        `${r.student.first_name} ${r.student.last_name}`.toLowerCase();
      if (!name.includes(term)) return false;
    }
    return true;
  });

  const compliantCount = summary.up_to_date + summary.medical_exemption;
  const compliancePercent =
    summary.total_enrolled > 0
      ? Math.round((compliantCount / summary.total_enrolled) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Overdue AIR check banner */}
      {overdue_air_checks.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--immunisation-pending)",
            backgroundColor: "var(--immunisation-pending-bg)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg" aria-hidden>
              !
            </span>
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--immunisation-pending)" }}
              >
                {overdue_air_checks.length} overdue AIR check
                {overdue_air_checks.length !== 1 ? "s" : ""}
              </p>
              <ul className="mt-2 space-y-1">
                {overdue_air_checks.slice(0, 5).map((r) => (
                  <li key={r.id} className="text-sm">
                    <Link
                      href={`/admin/immunisation/${r.student_id}`}
                      className="underline"
                      style={{ color: "var(--foreground)" }}
                    >
                      {r.student.first_name} {r.student.last_name}
                    </Link>
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      due{" "}
                      {new Date(r.next_air_check_due!).toLocaleDateString(
                        "en-AU",
                        { day: "numeric", month: "short" },
                      )}
                    </span>
                  </li>
                ))}
                {overdue_air_checks.length > 5 && (
                  <li
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    + {overdue_air_checks.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard
          label="Enrolled"
          value={summary.total_enrolled}
          colorVar="var(--foreground)"
        />
        <SummaryCard
          label="Compliant"
          value={`${compliancePercent}%`}
          colorVar="var(--immunisation-up-to-date)"
        />
        <SummaryCard
          label="Catch-up"
          value={summary.catch_up_schedule}
          colorVar="var(--immunisation-catch-up)"
        />
        <SummaryCard
          label="Pending"
          value={summary.pending}
          colorVar="var(--immunisation-pending)"
        />
        <SummaryCard
          label="Exemptions"
          value={summary.medical_exemption}
          colorVar="var(--immunisation-exemption)"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            haptics.selection();
          }}
          placeholder="Search by name..."
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            haptics.selection();
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Non-compliant table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div
            className="mx-auto mb-3 text-4xl"
            style={{ color: "var(--empty-state-icon)" }}
          >
            {non_compliant.length === 0 ? "🎉" : "🔍"}
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {non_compliant.length === 0
              ? "All children are compliant"
              : "No records match your filters"}
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {non_compliant.length === 0
              ? "Every enrolled child has an up-to-date IHS or medical exemption."
              : "Try adjusting your search or status filter."}
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl border border-border"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="scroll-native overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--muted)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Student
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    DOB
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    IHS Date
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Days Since Check
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Next AIR Check
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <RecordRow
                    key={record.id}
                    record={record}
                    canManage={canManage}
                    haptics={haptics}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  colorVar,
}: {
  label: string;
  value: number | string;
  colorVar: string;
}) {
  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: colorVar }}
      >
        {value}
      </p>
    </div>
  );
}

function RecordRow({
  record,
  canManage,
  haptics,
}: {
  record: ImmunisationRecordWithStudent;
  canManage: boolean;
  haptics: ReturnType<typeof useHaptics>;
}) {
  const daysSinceCheck = record.ihs_date
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(record.ihs_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <tr
      className="border-b border-border transition-colors last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <td className="px-4 py-3">
        <Link
          href={`/admin/immunisation/${record.student_id}`}
          className="font-medium underline-offset-2 hover:underline active-push"
          style={{ color: "var(--foreground)" }}
          onClick={() => haptics.impact("light")}
        >
          {record.student.first_name} {record.student.last_name}
        </Link>
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: "var(--muted-foreground)" }}
      >
        {record.student.dob
          ? new Date(record.student.dob).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-"}
      </td>
      <td className="px-4 py-3">
        <ImmunisationStatusPill
          status={record.status as ImmunisationStatus}
        />
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: "var(--muted-foreground)" }}
      >
        {record.ihs_date
          ? new Date(record.ihs_date).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-"}
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: "var(--muted-foreground)" }}
      >
        {daysSinceCheck !== null ? `${daysSinceCheck}d` : "-"}
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: "var(--muted-foreground)" }}
      >
        {record.next_air_check_due
          ? new Date(record.next_air_check_due).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-"}
      </td>
    </tr>
  );
}
