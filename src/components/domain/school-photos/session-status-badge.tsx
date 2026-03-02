import type { PhotoSessionStatus } from "@/types/domain";

const STATUS_CONFIG: Record<
  PhotoSessionStatus,
  { label: string; token: string }
> = {
  open: { label: "Open", token: "open" },
  closed: { label: "Closed", token: "closed" },
  archived: { label: "Archived", token: "archived" },
};

interface SessionStatusBadgeProps {
  status: PhotoSessionStatus;
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        background: `var(--photo-session-${cfg.token})`,
        color: `var(--photo-session-${cfg.token}-fg)`,
      }}
    >
      {cfg.label}
    </span>
  );
}
