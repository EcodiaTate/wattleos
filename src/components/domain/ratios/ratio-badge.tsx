// src/components/domain/ratios/ratio-badge.tsx
//
// Compliant / Breached status pill using attendance CSS tokens.

interface RatioBadgeProps {
  isCompliant: boolean;
  compact?: boolean;
}

export function RatioBadge({ isCompliant, compact }: RatioBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
      style={{
        backgroundColor: isCompliant
          ? "var(--attendance-present-bg)"
          : "var(--attendance-absent-bg)",
        color: isCompliant
          ? "var(--attendance-present-fg)"
          : "var(--attendance-absent-fg)",
      }}
    >
      {isCompliant ? "Compliant" : "Breached"}
    </span>
  );
}
