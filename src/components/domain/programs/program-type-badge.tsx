// src/components/domain/programs/program-type-badge.tsx
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
    size === "sm" 
      ? "px-2 py-0.5 text-[10px] tracking-tight" 
      : "px-2.5 py-1 text-xs tracking-normal";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-black uppercase tracking-tighter ${config.badgeBg} ${config.badgeText} ${sizeClasses} shadow-sm border border-black/5`}
    >
      {showIcon && <span className="text-[1.2em]">{config.icon}</span>}
      {config.shortLabel}
    </span>
  );
}