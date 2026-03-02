"use client";

interface Props {
  totalActiveStaff: number;
  diplomaOrHigherCount: number;
  percentage: number;
  isMet: boolean;
}

export function QualificationRatioCard({
  totalActiveStaff,
  diplomaOrHigherCount,
  percentage,
  isMet,
}: Props) {
  return (
    <div
      className="rounded-lg border border-border p-4"
      style={{
        backgroundColor: isMet
          ? "var(--attendance-present-bg, #dcfce7)"
          : "var(--attendance-absent-bg, #fee2e2)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Diploma+ Ratio
          </p>
          <p
            className="mt-1 text-2xl font-bold tabular-nums"
            style={{
              color: isMet
                ? "var(--attendance-present-fg, #166534)"
                : "var(--attendance-absent-fg, #991b1b)",
            }}
          >
            {percentage}%
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {diplomaOrHigherCount} of {totalActiveStaff} staff hold Diploma or
            higher (≥ 50% required)
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            backgroundColor: isMet
              ? "var(--attendance-present-fg, #166534)"
              : "var(--attendance-absent-fg, #991b1b)",
            color: "white",
          }}
        >
          {isMet ? "Met" : "Below 50%"}
        </span>
      </div>
    </div>
  );
}
