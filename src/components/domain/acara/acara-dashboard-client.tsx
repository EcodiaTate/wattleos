"use client";

// src/components/domain/acara/acara-dashboard-client.tsx
//
// Dashboard showing all ACARA report periods with summary stats,
// plus a student demographics profile export section.

import Link from "next/link";
import { useState } from "react";

import { AcaraStatusBadge } from "./acara-status-badge";
import { exportAcaraStudentProfileCsv } from "@/lib/actions/acara";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AcaraDashboardData, AcaraCollectionType } from "@/types/domain";

const COLLECTION_LABELS: Record<AcaraCollectionType, string> = {
  annual_school_collection: "Annual School Collection",
  semester_1_snapshot: "Semester 1 Snapshot",
  semester_2_snapshot: "Semester 2 Snapshot",
};

interface Props {
  data: AcaraDashboardData;
  canManage: boolean;
}

export function AcaraDashboardClient({ data, canManage }: Props) {
  const { periods, latest_period } = data;

  if (periods.length === 0) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-xl border border-border px-6 py-12 text-center"
          style={{ background: "var(--card)" }}
        >
          <div
            className="text-4xl mb-3"
            style={{ color: "var(--empty-state-icon)" }}
          >
            📊
          </div>
          <p className="font-medium text-base">No report periods yet</p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Create a new report period to start building your ACARA attendance
            data.
          </p>
        </div>

        {canManage && <StudentProfileExport />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats from latest period */}
      {latest_period && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Students"
            value={latest_period.total_students.toString()}
          />
          <StatCard
            label="Avg Rate"
            value={`${latest_period.avg_attendance_rate.toFixed(1)}%`}
            valueStyle={
              latest_period.avg_attendance_rate < 85
                ? { color: "var(--acara-rate-at-risk)" }
                : { color: "var(--acara-rate-good)" }
            }
          />
          <StatCard
            label="Below 85%"
            value={latest_period.students_below_85.toString()}
            valueStyle={
              latest_period.students_below_85 > 0
                ? { color: "var(--acara-rate-at-risk)" }
                : undefined
            }
          />
          <StatCard
            label="Below 70%"
            value={latest_period.students_below_70.toString()}
            valueStyle={
              latest_period.students_below_70 > 0
                ? { color: "var(--acara-rate-severe)" }
                : undefined
            }
          />
        </div>
      )}

      {/* Period list */}
      <div
        className="rounded-xl border border-border overflow-hidden"
        style={{ background: "var(--card)" }}
      >
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Report Periods</h2>
        </div>
        <ul className="divide-y divide-border">
          {periods.map((p) => (
            <li key={p.id}>
              <Link
                href={`/attendance/acara-reporting/${p.id}`}
                className="card-interactive flex items-center gap-4 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.calendar_year}</span>
                    <span
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {COLLECTION_LABELS[p.collection_type]}
                    </span>
                    <AcaraStatusBadge status={p.status} size="sm" />
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {p.period_start} → {p.period_end} · {p.total_students}{" "}
                    students
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium tabular-nums">
                    {p.avg_attendance_rate.toFixed(1)}%
                  </p>
                  {p.students_below_85 > 0 && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--acara-rate-at-risk)" }}
                    >
                      {p.students_below_85} below 85%
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Student Demographics Export */}
      {canManage && <StudentProfileExport />}
    </div>
  );
}

// ── Student Demographics Profile Export ─────────────────────────

function StudentProfileExport() {
  const haptics = useHaptics();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    haptics.impact("medium");

    const result = await exportAcaraStudentProfileCsv({
      calendar_year: year,
      include_disability_flag: true,
    });

    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Export failed");
      haptics.error();
      return;
    }

    const { csv, filename } = result.data;

    // Download CSV via blob
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccessMsg(`Exported ${csv.split("\n").length - 1} student records`);
    haptics.success();
  }

  // Year options: current year ± 2
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div
      className="rounded-xl border border-border overflow-hidden"
      style={{ background: "var(--card)" }}
    >
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Student Demographics Export</h2>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--muted-foreground)" }}
        >
          Export ACARA ASC student profile data - ATSI, LBOTE, SES, disability
          flag, postcode.
        </p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label
              htmlFor="profile-year"
              className="block text-xs font-medium mb-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Collection Year
            </label>
            <select
              id="profile-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-border px-3 py-2 text-sm"
              style={{ background: "var(--background)" }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="touch-target active-push rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            style={{ background: "var(--background)" }}
          >
            {loading ? "Exporting…" : "Export Student Profile CSV"}
          </button>
        </div>

        {error && (
          <p
            className="text-sm rounded-lg px-3 py-2"
            style={{
              color: "var(--destructive)",
              background: "var(--destructive-bg, hsl(0 60% 94%))",
            }}
          >
            {error}
          </p>
        )}
        {successMsg && (
          <p
            className="text-sm rounded-lg px-3 py-2"
            style={{
              color: "var(--acara-submitted)",
              background: "var(--acara-submitted-bg)",
            }}
          >
            {successMsg}
          </p>
        )}

        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Includes: Student ID, name, DOB, gender, year level, indigenous status
          (ATSI), language background (LBOTE), country of birth, home language,
          parent education, parent occupation, disability flag (from NCCD
          register), postcode, and CRN.
        </p>
      </div>
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="rounded-xl border border-border px-4 py-3"
      style={{ background: "var(--card)" }}
    >
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-0.5 tabular-nums" style={valueStyle}>
        {value}
      </p>
    </div>
  );
}
