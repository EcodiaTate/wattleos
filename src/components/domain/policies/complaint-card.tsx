import type { Complaint } from "@/types/domain";
import { ComplaintStatusBadge } from "./complaint-status-badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface ComplaintCardProps {
  complaint: Complaint;
}

const COMPLAINANT_LABELS: Record<string, string> = {
  parent: "Parent",
  staff: "Staff",
  anonymous: "Anonymous",
  regulator: "Regulator",
  other: "Other",
};

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  return (
    <Link
      href={`/admin/policies/complaints/${complaint.id}`}
      className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {complaint.subject}
          </h3>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>{COMPLAINANT_LABELS[complaint.complainant_type] ?? complaint.complainant_type}</span>
            {complaint.complainant_name && (
              <span>{complaint.complainant_name}</span>
            )}
            <span>Received {formatDate(complaint.received_at)}</span>
            {complaint.target_resolution_date && (
              <span>Due {formatDate(complaint.target_resolution_date)}</span>
            )}
          </div>
        </div>
        <ComplaintStatusBadge status={complaint.status} />
      </div>
    </Link>
  );
}
