// src/components/domain/materials/inventory-item-form.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createInventoryItem, updateInventoryItem } from "@/lib/actions/materials";
import type { MaterialInventoryItem, MaterialShelfLocation, MontessoriMaterial } from "@/types/domain";
import { MATERIAL_CONDITION_CONFIG, MATERIAL_STATUS_CONFIG, MONTESSORI_AREA_CONFIG } from "@/lib/constants/materials";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface InventoryItemFormProps {
  materials: Pick<MontessoriMaterial, "id" | "name" | "area" | "age_level">[];
  locations: MaterialShelfLocation[];
  existingItem?: MaterialInventoryItem;
  defaultMaterialId?: string;
}

export function InventoryItemForm({
  materials,
  locations,
  existingItem,
  defaultMaterialId,
}: InventoryItemFormProps) {
  const router    = useRouter();
  const haptics   = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [materialId,      setMaterialId]      = useState(existingItem?.material_id ?? defaultMaterialId ?? "");
  const [locationId,      setLocationId]      = useState(existingItem?.location_id ?? "");
  const [condition,       setCondition]       = useState(existingItem?.condition   ?? "good");
  const [status,          setStatus]          = useState(existingItem?.status      ?? "available");
  const [quantity,        setQuantity]        = useState(String(existingItem?.quantity ?? 1));
  const [shelfPosition,   setShelfPosition]   = useState(existingItem?.shelf_position   ?? "");
  const [dateAcquired,    setDateAcquired]    = useState(existingItem?.date_acquired     ?? "");
  const [lastInspected,   setLastInspected]   = useState(existingItem?.last_inspected_at ?? "");
  const [serialNumber,    setSerialNumber]    = useState(existingItem?.serial_number     ?? "");
  const [notes,           setNotes]           = useState(existingItem?.notes             ?? "");

  // Filter materials by selected area for display grouping
  const areaGroups = Object.entries(MONTESSORI_AREA_CONFIG).map(([area, config]) => ({
    area: area as keyof typeof MONTESSORI_AREA_CONFIG,
    label: config.label,
    materials: materials.filter((m) => m.area === area),
  })).filter((g) => g.materials.length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      material_id:       materialId       || undefined,
      location_id:       locationId       || undefined,
      condition:         condition        as "excellent" | "good" | "fair" | "damaged",
      status:            status           as "available" | "in_use" | "being_repaired" | "on_order" | "retired",
      quantity:          Number(quantity) || 1,
      shelf_position:    shelfPosition    || undefined,
      date_acquired:     dateAcquired     || undefined,
      last_inspected_at: lastInspected    || undefined,
      serial_number:     serialNumber     || undefined,
      notes:             notes            || undefined,
    };

    startTransition(async () => {
      haptics.impact("medium");

      const result = existingItem
        ? await updateInventoryItem(existingItem.id, payload)
        : await createInventoryItem(payload as Parameters<typeof createInventoryItem>[0]);

      if (result.error) {
        setError(result.error.message ?? "Failed to save");
        haptics.error();
        return;
      }

      haptics.success();
      router.push(
        existingItem
          ? `/pedagogy/materials/inventory/${existingItem.id}`
          : "/pedagogy/materials/inventory"
      );
    });
  }

  const labelCls  = "block text-sm font-medium mb-1";
  const inputCls  = "w-full rounded-lg border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring";
  const selectCls = inputCls;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Material */}
      <div>
        <label className={labelCls} style={{ color: "var(--text-primary)" }}>
          Material <span className="text-red-500">*</span>
        </label>
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          required
          className={selectCls}
          style={{ color: "var(--text-primary)" }}
        >
          <option value="">Select a material…</option>
          {areaGroups.map(({ area, label, materials: mats }) => (
            <optgroup key={area} label={label}>
              {mats.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.age_level?.replace(/_/g, "–")})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Location */}
      <div>
        <label className={labelCls} style={{ color: "var(--text-primary)" }}>
          Shelf Location
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className={selectCls}
          style={{ color: "var(--text-primary)" }}
        >
          <option value="">No location assigned</option>
          {locations
            .filter((l) => l.is_active)
            .map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
        </select>
      </div>

      {/* Shelf position */}
      <div>
        <label className={labelCls} style={{ color: "var(--text-primary)" }}>
          Shelf Position
        </label>
        <input
          type="text"
          value={shelfPosition}
          onChange={(e) => setShelfPosition(e.target.value)}
          placeholder="e.g. Row 2, Position 4"
          className={inputCls}
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Condition + Status row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Condition <span className="text-red-500">*</span>
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as "excellent" | "good" | "fair" | "damaged")}
            required
            className={selectCls}
            style={{ color: "var(--text-primary)" }}
          >
            {Object.entries(MATERIAL_CONDITION_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Status <span className="text-red-500">*</span>
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "available" | "in_use" | "being_repaired" | "on_order" | "retired")}
            required
            className={selectCls}
            style={{ color: "var(--text-primary)" }}
          >
            {Object.entries(MATERIAL_STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quantity + Serial */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Quantity (pieces)
          </label>
          <input
            type="number"
            min={1}
            max={9999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Serial / Reference No.
          </label>
          <input
            type="text"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Optional"
            className={inputCls}
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Date Acquired
          </label>
          <input
            type="date"
            value={dateAcquired}
            onChange={(e) => setDateAcquired(e.target.value)}
            className={inputCls}
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Last Inspected
          </label>
          <input
            type="date"
            value={lastInspected}
            onChange={(e) => setLastInspected(e.target.value)}
            className={inputCls}
            style={{ color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls} style={{ color: "var(--text-primary)" }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Condition history, repair notes, provenance…"
          className={`${inputCls} resize-none`}
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {error && (
        <p className="text-sm rounded-lg px-3 py-2 border" style={{
          color: "var(--color-error)",
          backgroundColor: "var(--color-error-subtle)",
          borderColor: "var(--color-error-muted)",
        }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending || !materialId}
          className="touch-target active-push flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-fg)",
          }}
        >
          {isPending ? "Saving…" : existingItem ? "Save Changes" : "Add to Inventory"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="touch-target active-push rounded-xl px-4 py-2.5 text-sm font-semibold border border-border"
          style={{ color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
