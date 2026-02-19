// src/components/domain/programs/program-type-badge.tsx
//
// ============================================================
// WattleOS V2 - Program Type Badge
// ============================================================
// Reusable badge that displays the program type with a
// colour-coded pill. Used in list pages, detail pages,
// and session calendar events.
//
// WHY separate component: Program type badges appear in 5+
// places (list, detail, calendar, kiosk, reports). One source
// of truth for the colour mapping.
// ============================================================

import {
  PROGRAM_TYPE_CONFIG,
  type ProgramTypeValue,
} from "@/lib/constants/programs";

interface ProgramTypeBadgeProps {
  type: ProgramTypeValue;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function ProgramTypeBadge({
  type,
  showIcon = false,
  size = "sm",
}: ProgramTypeBadgeProps) {
  const config = PROGRAM_TYPE_CONFIG[type] ?? PROGRAM_TYPE_CONFIG.other;

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.badgeBg} ${config.badgeText} ${sizeClasses}`}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.shortLabel}
    </span>
  );
}
