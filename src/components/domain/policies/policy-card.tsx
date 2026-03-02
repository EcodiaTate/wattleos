import type { Policy } from "@/types/domain";
import { PolicyStatusBadge } from "./policy-status-badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface PolicyCardProps {
  policy: Policy;
}

export function PolicyCard({ policy }: PolicyCardProps) {
  return (
    <Link
      href={`/admin/policies/${policy.id}`}
      className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {policy.title}
          </h3>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span className="capitalize">{policy.category.replace(/_/g, " ")}</span>
            {policy.regulation_reference && (
              <span>{policy.regulation_reference}</span>
            )}
            <span>v{policy.version}</span>
            {policy.review_date && (
              <span>Review: {formatDate(policy.review_date)}</span>
            )}
          </div>
        </div>
        <PolicyStatusBadge status={policy.status} />
      </div>
    </Link>
  );
}
