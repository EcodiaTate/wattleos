import type { ConcentrationLevel } from "@/types/domain";

interface ConcentrationBadgeProps {
  level: ConcentrationLevel;
}

const CONFIG: Record<ConcentrationLevel, { label: string; bg: string; fg: string }> = {
  deep: {
    label: "Deep",
    bg: "color-mix(in srgb, var(--success) 12%, transparent)",
    fg: "var(--success)",
  },
  moderate: {
    label: "Moderate",
    bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
    fg: "var(--primary)",
  },
  distracted: {
    label: "Distracted",
    bg: "color-mix(in srgb, var(--warning) 12%, transparent)",
    fg: "var(--warning)",
  },
  not_observed: {
    label: "Not Observed",
    bg: "var(--muted)",
    fg: "var(--muted-foreground)",
  },
};

export function ConcentrationBadge({ level }: ConcentrationBadgeProps) {
  const config = CONFIG[level];

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: config.bg, color: config.fg }}
    >
      {config.label}
    </span>
  );
}
