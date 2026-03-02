// src/components/domain/three-year-cycle/cycle-area-badge.tsx

import type { CycleAreaMastery, CycleProgressLevel } from "@/types/domain";

const MASTERY_LABELS: Record<CycleAreaMastery, string> = {
  not_started: "Not started",
  beginning: "Beginning",
  developing: "Developing",
  consolidating: "Consolidating",
  advanced: "Advanced",
};

const MASTERY_VARS: Record<
  CycleAreaMastery,
  { fg: string; bg: string }
> = {
  not_started: {
    fg: "var(--muted-foreground)",
    bg: "var(--muted)",
  },
  beginning: {
    fg: "var(--mastery-not-started-fg, #6b7280)",
    bg: "var(--mastery-not-started-bg, #f3f4f6)",
  },
  developing: {
    fg: "var(--mastery-practicing-fg, #d97706)",
    bg: "var(--mastery-practicing-bg, #fef3c7)",
  },
  consolidating: {
    fg: "var(--mastery-mastered-fg, #059669)",
    bg: "var(--mastery-mastered-bg, #d1fae5)",
  },
  advanced: {
    fg: "#ffffff",
    bg: "var(--primary)",
  },
};

interface CycleAreaBadgeProps {
  level: CycleAreaMastery;
  pct?: number;
  size?: "sm" | "md";
}

export function CycleAreaBadge({
  level,
  pct,
  size = "md",
}: CycleAreaBadgeProps) {
  const vars = MASTERY_VARS[level];
  const label = MASTERY_LABELS[level];
  const px = size === "sm" ? "6px 10px" : "4px 10px";
  const fontSize = size === "sm" ? "11px" : "12px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: px,
        borderRadius: 9999,
        fontSize,
        fontWeight: 500,
        color: vars.fg,
        background: vars.bg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {pct !== undefined && (
        <span style={{ opacity: 0.75 }}>· {pct}%</span>
      )}
    </span>
  );
}

const LEVEL_LABELS: Record<CycleProgressLevel, string> = {
  not_started: "Not started",
  introduced: "Introduced",
  practicing: "Practicing",
  mastered: "Mastered",
};

const LEVEL_VARS: Record<CycleProgressLevel, { fg: string; bg: string }> = {
  not_started: { fg: "var(--muted-foreground)", bg: "var(--muted)" },
  introduced: {
    fg: "var(--mastery-presented-fg, #2563eb)",
    bg: "var(--mastery-presented-bg, #dbeafe)",
  },
  practicing: {
    fg: "var(--mastery-practicing-fg, #d97706)",
    bg: "var(--mastery-practicing-bg, #fef3c7)",
  },
  mastered: {
    fg: "var(--mastery-mastered-fg, #059669)",
    bg: "var(--mastery-mastered-bg, #d1fae5)",
  },
};

export function CycleProgressBadge({ level }: { level: CycleProgressLevel }) {
  const vars = LEVEL_VARS[level];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 500,
        color: vars.fg,
        background: vars.bg,
        whiteSpace: "nowrap",
      }}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}
