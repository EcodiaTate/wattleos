// src/components/domain/materials/inventory-list-client.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { listInventoryItems } from "@/lib/actions/materials";
import type {
  MaterialCondition,
  MaterialInventoryItemWithDetails,
  MaterialInventoryStatus,
  MaterialShelfLocation,
  MontessoriArea,
} from "@/types/domain";
import { MONTESSORI_AREA_CONFIG, MATERIAL_STATUS_CONFIG, MATERIAL_CONDITION_CONFIG } from "@/lib/constants/materials";
import { InventoryItemCard } from "./inventory-item-card";

interface InventoryListClientProps {
  initialItems: MaterialInventoryItemWithDetails[];
  locations: MaterialShelfLocation[];
  canManage: boolean;
}

export function InventoryListClient({
  initialItems,
  locations,
  canManage,
}: InventoryListClientProps) {
  const [items, setItems]         = useState(initialItems);
  const [area, setArea]           = useState<MontessoriArea | "">("");
  const [status, setStatus]       = useState<MaterialInventoryStatus | "">("");
  const [condition, setCondition] = useState<MaterialCondition | "">("");
  const [locationId, setLocationId] = useState("");
  const [search, setSearch]       = useState("");
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    startTransition(async () => {
      const result = await listInventoryItems({
        area:        area      || undefined,
        status:      (status   || undefined) as MaterialInventoryStatus | undefined,
        condition:   (condition || undefined) as MaterialCondition | undefined,
        location_id: locationId || undefined,
        search:      search    || undefined,
      });
      if (!result.error) setItems(result.data!.items);
    });
  }

  function clearFilters() {
    setArea(""); setStatus(""); setCondition(""); setLocationId(""); setSearch("");
    setItems(initialItems);
  }

  const hasActiveFilters = Boolean(area || status || condition || locationId || search);

  const selectCls = "rounded-lg border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          placeholder="Search materials…"
          className="rounded-lg border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
          style={{ color: "var(--text-primary)" }}
        />

        {/* Area */}
        <select
          value={area}
          onChange={(e) => setArea(e.target.value as MontessoriArea | "")}
          className={selectCls}
          style={{ color: "var(--text-primary)" }}
        >
          <option value="">All areas</option>
          {Object.entries(MONTESSORI_AREA_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MaterialInventoryStatus | "")}
          className={selectCls}
          style={{ color: "var(--text-primary)" }}
        >
          <option value="">All statuses</option>
          {Object.entries(MATERIAL_STATUS_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>

        {/* Condition */}
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as MaterialCondition | "")}
          className={selectCls}
          style={{ color: "var(--text-primary)" }}
        >
          <option value="">All conditions</option>
          {Object.entries(MATERIAL_CONDITION_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>

        {/* Location */}
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className={selectCls}
          style={{ color: "var(--text-primary)" }}
        >
          <option value="">All locations</option>
          {locations.filter((l) => l.is_active).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <button
          onClick={applyFilters}
          disabled={isPending}
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
          }}
        >
          {isPending ? "Filtering…" : "Apply"}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="active-push touch-target rounded-lg px-3 py-2 text-sm border border-border"
            style={{ color: "var(--text-secondary)" }}
          >
            Clear
          </button>
        )}

        {canManage && (
          <Link
            href="/pedagogy/materials/inventory/new"
            className="active-push touch-target ml-auto rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-fg)",
            }}
          >
            + Add item
          </Link>
        )}
      </div>

      {/* Count */}
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        {items.length} item{items.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-2" style={{ color: "var(--empty-state-icon)" }}>🪵</p>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>No items found</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            {hasActiveFilters ? "Try clearing filters." : "Add the first inventory item to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <InventoryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
