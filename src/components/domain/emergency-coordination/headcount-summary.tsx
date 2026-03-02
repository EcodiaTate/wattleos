"use client";

// Unaccounted Scoreboard - dominant stat display for live emergency coordination.
// Replaces the old HeadcountSummary progress-bar view with large unaccounted counts.

function ScoreCard({
  count,
  label,
  sublabel,
  detail,
  urgent,
  alert,
}: {
  count: number;
  label: string;
  sublabel: string;
  detail: string;
  urgent: boolean;
  alert?: boolean;
}) {
  const pct = urgent ? 0 : 100; // simplified: 100% when not urgent

  return (
    <div
      className="rounded-[var(--radius-lg)] p-3 text-center"
      style={{
        backgroundColor: urgent
          ? "var(--emergency-activated-bg)"
          : "var(--emergency-all-clear-bg)",
        borderLeft: alert
          ? "4px solid var(--zone-needs-assistance)"
          : undefined,
      }}
    >
      <div
        className="text-4xl sm:text-5xl font-black tabular-nums leading-none"
        style={{
          color: urgent
            ? "var(--emergency-unaccounted)"
            : "var(--emergency-all-clear)",
          animation: urgent
            ? "emergency-count-pulse 2s ease-in-out infinite"
            : undefined,
        }}
      >
        {urgent ? count : "\u2713"}
      </div>
      <div
        className="text-xs font-bold mt-1 uppercase tracking-wider"
        style={{ color: "var(--foreground)" }}
      >
        {label}
      </div>
      <div
        className="text-[10px] font-medium uppercase"
        style={{ color: "var(--muted-foreground)" }}
      >
        {sublabel}
      </div>
      {/* Thin progress bar */}
      <div
        className="mt-2 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: urgent ? `${pct}%` : "100%",
            backgroundColor: urgent
              ? "var(--emergency-activated)"
              : "var(--emergency-all-clear)",
          }}
        />
      </div>
      <div
        className="text-[10px] mt-0.5 tabular-nums"
        style={{ color: "var(--muted-foreground)" }}
      >
        {detail}
      </div>
    </div>
  );
}

export function HeadcountSummary({
  summary,
}: {
  summary: {
    students_accounted: number;
    students_total: number;
    staff_accounted: number;
    staff_total: number;
    zones_clear: number;
    zones_total: number;
    zones_needing_assistance: number;
  };
}) {
  const studentsUnaccounted =
    summary.students_total - summary.students_accounted;
  const staffUnaccounted = summary.staff_total - summary.staff_accounted;
  const allZonesClear =
    summary.zones_clear === summary.zones_total && summary.zones_total > 0;
  const studentPct =
    summary.students_total > 0
      ? Math.round((summary.students_accounted / summary.students_total) * 100)
      : 100;
  const staffPct =
    summary.staff_total > 0
      ? Math.round((summary.staff_accounted / summary.staff_total) * 100)
      : 100;
  const zonePct =
    summary.zones_total > 0
      ? Math.round((summary.zones_clear / summary.zones_total) * 100)
      : 100;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <ScoreCard
        count={studentsUnaccounted}
        label="STUDENTS"
        sublabel={studentsUnaccounted > 0 ? "UNACCOUNTED" : "ALL SAFE"}
        detail={`${summary.students_accounted}/${summary.students_total} accounted`}
        urgent={studentsUnaccounted > 0}
      />
      <ScoreCard
        count={staffUnaccounted}
        label="STAFF"
        sublabel={staffUnaccounted > 0 ? "UNACCOUNTED" : "ALL SAFE"}
        detail={`${summary.staff_accounted}/${summary.staff_total} accounted`}
        urgent={staffUnaccounted > 0}
      />
      <ScoreCard
        count={
          allZonesClear
            ? summary.zones_total
            : summary.zones_total - summary.zones_clear
        }
        label="ZONES"
        sublabel={allZonesClear ? "ALL CLEAR" : "NOT CLEAR"}
        detail={`${summary.zones_clear}/${summary.zones_total} clear`}
        urgent={!allZonesClear}
        alert={summary.zones_needing_assistance > 0}
      />
    </div>
  );
}
