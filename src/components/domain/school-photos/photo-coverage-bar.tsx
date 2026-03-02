import type { PhotoCoverageStats } from "@/types/domain";

interface PhotoCoverageBarProps {
  stats: PhotoCoverageStats;
  label: string;
}

export function PhotoCoverageBar({ stats, label }: PhotoCoverageBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          {label}
        </p>
        <p
          className="text-xs tabular-nums"
          style={{ color: "var(--muted-foreground)" }}
        >
          {stats.with_photo} of {stats.total} ({stats.percentage}%)
        </p>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full"
        style={{ background: "var(--photo-no-photo-bg)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${stats.percentage}%`,
            background: "var(--photo-matched)",
          }}
        />
      </div>
    </div>
  );
}
