"use client";

interface QipCompletionChartProps {
  qaNumber: number;
  qaName: string;
  totalElements: number;
  assessedCount: number;
  workingTowardsCount: number;
  meetingCount: number;
  exceedingCount: number;
  goalCount: number;
  evidenceCount: number;
}

export function QipCompletionChart({
  qaNumber,
  qaName,
  totalElements,
  assessedCount,
  workingTowardsCount,
  meetingCount,
  exceedingCount,
  goalCount,
  evidenceCount,
}: QipCompletionChartProps) {
  const unassessed = totalElements - assessedCount;
  const percentage =
    totalElements > 0
      ? Math.round((assessedCount / totalElements) * 100)
      : 0;

  return (
    <div
      className="card-interactive flex flex-col gap-3 rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {qaNumber}
          </span>
          <h3
            className="text-sm font-semibold leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {qaName}
          </h3>
        </div>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: "var(--foreground)" }}
        >
          {percentage}%
        </span>
      </div>

      {/* Stacked progress bar */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--muted)" }}
      >
        {exceedingCount > 0 && (
          <div
            style={{
              width: `${(exceedingCount / totalElements) * 100}%`,
              backgroundColor: "var(--qip-exceeding)",
            }}
          />
        )}
        {meetingCount > 0 && (
          <div
            style={{
              width: `${(meetingCount / totalElements) * 100}%`,
              backgroundColor: "var(--qip-meeting)",
            }}
          />
        )}
        {workingTowardsCount > 0 && (
          <div
            style={{
              width: `${(workingTowardsCount / totalElements) * 100}%`,
              backgroundColor: "var(--qip-working-towards)",
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        {exceedingCount > 0 && (
          <LegendDot
            color="var(--qip-exceeding)"
            label={`${exceedingCount} Exceeding`}
          />
        )}
        {meetingCount > 0 && (
          <LegendDot
            color="var(--qip-meeting)"
            label={`${meetingCount} Meeting`}
          />
        )}
        {workingTowardsCount > 0 && (
          <LegendDot
            color="var(--qip-working-towards)"
            label={`${workingTowardsCount} Working Towards`}
          />
        )}
        {unassessed > 0 && (
          <LegendDot
            color="var(--qip-unassessed)"
            label={`${unassessed} Unassessed`}
          />
        )}
      </div>

      {/* Stats row */}
      <div
        className="flex gap-4 border-t border-border pt-2 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>{goalCount} goal{goalCount !== 1 ? "s" : ""}</span>
        <span>{evidenceCount} evidence</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
    </span>
  );
}
