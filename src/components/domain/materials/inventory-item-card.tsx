// src/components/domain/materials/inventory-item-card.tsx
"use client";

import Link from "next/link";
import type { MaterialInventoryItemWithDetails } from "@/types/domain";
import { MaterialConditionBadge } from "./material-condition-badge";
import { MaterialStatusBadge } from "./material-status-badge";
import { INSPECTION_OVERDUE_DAYS } from "@/lib/constants/materials";

interface InventoryItemCardProps {
  item: MaterialInventoryItemWithDetails;
  showArea?: boolean;
}

function isInspectionOverdue(lastInspectedAt: string | null): boolean {
  if (!lastInspectedAt) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INSPECTION_OVERDUE_DAYS);
  return new Date(lastInspectedAt) < cutoff;
}

export function InventoryItemCard({
  item,
  showArea = true,
}: InventoryItemCardProps) {
  const overdue = isInspectionOverdue(item.last_inspected_at);

  return (
    <Link
      href={`/pedagogy/materials/inventory/${item.id}`}
      className="card-interactive block border border-border rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="font-semibold text-sm truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {item.material?.name ?? "Unknown material"}
          </p>

          {showArea && item.material?.area && (
            <p
              className="text-xs mt-0.5 capitalize"
              style={{ color: "var(--text-tertiary)" }}
            >
              {item.material.area.replace(/_/g, " ")} ·{" "}
              {item.material.age_level?.replace(/_/g, "–")}
            </p>
          )}

          {item.location && (
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              📍 {item.location.name}
              {item.shelf_position && ` - ${item.shelf_position}`}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <MaterialStatusBadge status={item.status} size="sm" />
          <MaterialConditionBadge condition={item.condition} size="sm" />
        </div>
      </div>

      <div
        className="flex items-center gap-3 mt-3 text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        {item.quantity > 1 && <span>× {item.quantity} pieces</span>}
        {overdue && item.status !== "retired" && (
          <span
            className="flex items-center gap-1"
            style={{ color: "var(--color-warning)" }}
          >
            ⚠ Inspection overdue
          </span>
        )}
        {item.last_inspected_at && !overdue && (
          <span>
            Inspected{" "}
            {new Date(item.last_inspected_at).toLocaleDateString("en-AU")}
          </span>
        )}
        {item.serial_number && <span>#{item.serial_number}</span>}
      </div>
    </Link>
  );
}
