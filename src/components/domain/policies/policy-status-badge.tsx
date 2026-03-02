import type { PolicyStatus } from "@/types/domain";

interface PolicyStatusBadgeProps {
  status: PolicyStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<PolicyStatus, { label: string; bg: string; fg: string }> = {
  draft: {
    label: "Draft",
    bg: "var(--policy-draft-bg)",
    fg: "var(--policy-draft)",
  },
  active: {
    label: "Active",
    bg: "var(--policy-active-bg)",
    fg: "var(--policy-active)",
  },
  archived: {
    label: "Archived",
    bg: "var(--policy-archived-bg)",
    fg: "var(--policy-archived)",
  },
};

export function PolicyStatusBadge({ status, size = "sm" }: PolicyStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      {config.label}
    </span>
  );
}
