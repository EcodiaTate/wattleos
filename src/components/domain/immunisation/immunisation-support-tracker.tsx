"use client";

interface ImmunisationSupportTrackerProps {
  supportPeriodStart: string;
  supportPeriodEnd: string;
}

export function ImmunisationSupportTracker({
  supportPeriodStart,
  supportPeriodEnd,
}: ImmunisationSupportTrackerProps) {
  const start = new Date(supportPeriodStart);
  const end = new Date(supportPeriodEnd);
  const now = new Date();

  const totalDays = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const elapsedDays = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const remainingWeeks = Math.ceil(remainingDays / 7);
  const progressPercent = Math.min(
    100,
    Math.max(0, (elapsedDays / totalDays) * 100),
  );

  const isExpired = remainingDays === 0;
  const isUrgent = remainingDays <= 14 && !isExpired;

  // Color shifts: green → amber → red
  let barColor = "var(--immunisation-up-to-date)";
  let labelColor = "var(--muted-foreground)";
  if (isExpired) {
    barColor = "var(--immunisation-pending)";
    labelColor = "var(--immunisation-pending)";
  } else if (isUrgent) {
    barColor = "var(--immunisation-catch-up)";
    labelColor = "var(--immunisation-catch-up)";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: "var(--muted-foreground)" }}>
          16-week support period
        </span>
        <span className="font-medium" style={{ color: labelColor }}>
          {isExpired
            ? "Expired"
            : `${remainingWeeks} week${remainingWeeks !== 1 ? "s" : ""} remaining`}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Date range */}
      <div
        className="flex justify-between text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>{formatDate(supportPeriodStart)}</span>
        <span>{formatDate(supportPeriodEnd)}</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
