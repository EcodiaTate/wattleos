"use client";

import type { DrillComplianceStatus } from "@/types/domain";

const COMPLIANCE_CONFIG: Record<
  DrillComplianceStatus,
  { label: string; token: string }
> = {
  compliant: { label: "Compliant", token: "compliant" },
  at_risk: { label: "At Risk", token: "at-risk" },
  overdue: { label: "Overdue", token: "overdue" },
};

interface ComplianceStatusBadgeProps {
  status: DrillComplianceStatus;
}

export function ComplianceStatusBadge({ status }: ComplianceStatusBadgeProps) {
  const cfg = COMPLIANCE_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `var(--drill-${cfg.token})`,
        color: `var(--drill-${cfg.token}-fg)`,
      }}
    >
      {cfg.label}
    </span>
  );
}
