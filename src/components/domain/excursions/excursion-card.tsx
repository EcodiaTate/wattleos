import type { Excursion } from "@/types/domain";
import { ExcursionStatusBadge } from "./excursion-status-badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface ExcursionCardProps {
  excursion: Excursion;
}

const TRANSPORT_ICONS: Record<string, string> = {
  walking: "\u{1F6B6}",
  private_vehicle: "\u{1F697}",
  bus: "\u{1F68C}",
  public_transport: "\u{1F68A}",
  other: "\u{1F4CD}",
};

export function ExcursionCard({ excursion }: ExcursionCardProps) {
  return (
    <Link
      href={`/excursions/${excursion.id}`}
      className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {TRANSPORT_ICONS[excursion.transport_type] ?? "\u{1F4CD}"}
            </span>
            <h3
              className="truncate text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {excursion.name}
            </h3>
          </div>
          <p
            className="text-xs truncate"
            style={{ color: "var(--muted-foreground)" }}
          >
            {excursion.destination}
          </p>
          <div
            className="flex items-center gap-3 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <span>{formatDate(excursion.excursion_date)}</span>
            {excursion.departure_time && (
              <span>{excursion.departure_time}</span>
            )}
            <span>
              {excursion.attending_student_ids.length} student
              {excursion.attending_student_ids.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <ExcursionStatusBadge status={excursion.status} />
      </div>
    </Link>
  );
}
