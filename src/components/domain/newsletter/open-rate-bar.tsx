"use client";

interface OpenRateBarProps {
  recipientCount: number;
  readCount: number;
}

export function OpenRateBar({ recipientCount, readCount }: OpenRateBarProps) {
  const rate = recipientCount > 0 ? readCount / recipientCount : 0;
  const pct = Math.round(rate * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--muted-foreground)" }}>
          {readCount} of {recipientCount} opened
        </span>
        <span className="font-medium" style={{ color: "var(--foreground)" }}>
          {pct}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: "var(--newsletter-sent)",
          }}
        />
      </div>
    </div>
  );
}
