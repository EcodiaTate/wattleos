import type { ComplaintStatus } from "@/types/domain";

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; bg: string; fg: string }> = {
  open: {
    label: "Open",
    bg: "var(--complaint-open-bg)",
    fg: "var(--complaint-open)",
  },
  in_progress: {
    label: "In Progress",
    bg: "var(--complaint-in-progress-bg)",
    fg: "var(--complaint-in-progress)",
  },
  resolved: {
    label: "Resolved",
    bg: "var(--complaint-resolved-bg)",
    fg: "var(--complaint-resolved)",
  },
  escalated: {
    label: "Escalated",
    bg: "var(--complaint-escalated-bg)",
    fg: "var(--complaint-escalated)",
  },
};

export function ComplaintStatusBadge({ status, size = "sm" }: ComplaintStatusBadgeProps) {
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
