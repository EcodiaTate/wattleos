// src/components/domain/materials/inventory-dashboard-client.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { exportInventory } from "@/lib/actions/materials";
import type { MaterialInventoryDashboardData } from "@/types/domain";
import { MONTESSORI_AREA_CONFIG } from "@/lib/constants/materials";
import { InventoryItemCard } from "./inventory-item-card";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface InventoryDashboardClientProps {
  data: MaterialInventoryDashboardData;
  canManage: boolean;
}

export function InventoryDashboardClient({ data, canManage }: InventoryDashboardClientProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  function handleExport() {
    startTransition(async () => {
      haptics.impact("medium");
      const result = await exportInventory();
      if (result.error) { setExportError(result.error.message ?? "Export failed"); return; }
      const blob = new Blob([result.data!.csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = result.data!.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const statCards = [
    { label: "Total Items",       value: data.total_items,          color: "var(--text-primary)" },
    { label: "Available",         value: data.available_count,       color: "var(--material-status-available-fg)" },
    { label: "In Use",            value: data.in_use_count,          color: "var(--material-status-in-use-fg)" },
    { label: "Being Repaired",    value: data.being_repaired_count,  color: "var(--material-status-being-repaired-fg)" },
    { label: "On Order",          value: data.on_order_count,        color: "var(--material-status-on-order-fg)" },
    { label: "Needs Attention",   value: data.needs_attention_count, color: "var(--color-warning)" },
    { label: "Inspection Overdue",value: data.inspection_overdue_count, color: "var(--color-warning)" },
  ];

  return (
    <div className="space-y-8">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Material Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Physical Montessori materials in your prepared environment
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <button onClick={handleExport} disabled={isPending}
                className="active-push touch-target rounded-xl px-4 py-2 text-sm font-medium border border-border"
                style={{ color: "var(--text-secondary)" }}>
                {isPending ? "Exporting…" : "Export CSV"}
              </button>
              <Link href="/pedagogy/materials/inventory/new"
                className="active-push touch-target rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-fg)" }}>
                + Add item
              </Link>
            </>
          )}
        </div>
      </div>

      {exportError && (
        <p className="text-sm" style={{ color: "var(--color-error)" }}>{exportError}</p>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border p-3 text-center" style={{ backgroundColor: "var(--surface-1)" }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* By area */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>By Curriculum Area</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Object.entries(MONTESSORI_AREA_CONFIG).map(([area, config]) => {
            const stats = data.by_area[area as keyof typeof data.by_area];
            if (!stats) return null;
            return (
              <Link
                key={area}
                href={`/pedagogy/materials/inventory?area=${area}`}
                className="card-interactive rounded-xl border border-border p-4"
              >
                <p className="text-2xl mb-1">{config.emoji}</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{config.label}</p>
                <div className="mt-2 space-y-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <p>{stats.total} items</p>
                  <p style={{ color: "var(--material-status-available-fg)" }}>{stats.available} available</p>
                  {stats.needs_attention > 0 && (
                    <p style={{ color: "var(--color-warning)" }}>⚠ {stats.needs_attention} need attention</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Needs attention */}
      {data.needs_attention_items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Needs Attention ({data.needs_attention_count})
            </h2>
            {data.needs_attention_count > data.needs_attention_items.length && (
              <Link href="/pedagogy/materials/inventory?needs_attention_only=true" className="text-xs" style={{ color: "var(--color-primary)" }}>
                View all →
              </Link>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.needs_attention_items.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Inspection overdue */}
      {data.inspection_overdue_items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Inspection Overdue ({data.inspection_overdue_count})
            </h2>
            {data.inspection_overdue_count > data.inspection_overdue_items.length && (
              <Link href="/pedagogy/materials/inventory?inspection_overdue_only=true" className="text-xs" style={{ color: "var(--color-primary)" }}>
                View all →
              </Link>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.inspection_overdue_items.map((item) => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.total_items === 0 && (
        <div className="py-16 text-center">
          <p className="text-5xl mb-3" style={{ color: "var(--empty-state-icon)" }}>🪵</p>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No inventory yet</h2>
          <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-tertiary)" }}>
            Start by adding the physical materials in your prepared environment.
          </p>
          {canManage && (
            <Link href="/pedagogy/materials/inventory/new"
              className="inline-flex active-push touch-target rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-fg)" }}>
              Add first item
            </Link>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/pedagogy/materials/inventory" className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
          View all items →
        </Link>
        {canManage && (
          <Link href="/pedagogy/materials/locations" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage shelf locations →
          </Link>
        )}
      </div>
    </div>
  );
}
