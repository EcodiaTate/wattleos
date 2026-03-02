// src/components/domain/materials/shelf-location-list-client.tsx
"use client";

import { useState, useTransition } from "react";
import {
  createShelfLocation,
  updateShelfLocation,
  deleteShelfLocation,
} from "@/lib/actions/materials";
import type { MaterialShelfLocation } from "@/types/domain";
import { ROOM_TYPE_OPTIONS } from "@/lib/constants/materials";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface ShelfLocationListClientProps {
  initialLocations: MaterialShelfLocation[];
  canManage: boolean;
}

const AREA_EMOJIS: Record<string, string> = {
  practical_life: "🧹",
  sensorial:      "🎨",
  language:       "📖",
  mathematics:    "🔢",
  cultural:       "🌍",
  other:          "📦",
};

export function ShelfLocationListClient({
  initialLocations,
  canManage,
}: ShelfLocationListClientProps) {
  const haptics = useHaptics();
  const [locations, setLocations] = useState(initialLocations);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name,       setName]       = useState("");
  const [desc,       setDesc]       = useState("");
  const [roomType,   setRoomType]   = useState<string>("");
  const [sortOrder,  setSortOrder]  = useState("0");
  const [isActive,   setIsActive]   = useState(true);

  function resetForm() {
    setName(""); setDesc(""); setRoomType(""); setSortOrder("0"); setIsActive(true);
  }

  function startEdit(loc: MaterialShelfLocation) {
    setEditingId(loc.id);
    setName(loc.name);
    setDesc(loc.description ?? "");
    setRoomType(loc.room_type ?? "");
    setSortOrder(String(loc.sort_order));
    setIsActive(loc.is_active);
    setShowCreateForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    resetForm();
    setError(null);
  }

  function handleCreate() {
    if (!name.trim()) { setError("Name is required"); return; }
    setError(null);
    startTransition(async () => {
      haptics.impact("medium");
      const result = await createShelfLocation({
        name:        name.trim(),
        description: desc.trim()  || undefined,
        room_type:   (roomType    || undefined) as Parameters<typeof createShelfLocation>[0]["room_type"],
        sort_order:  Number(sortOrder) || 0,
        is_active:   isActive,
      });
      if (result.error) { setError(result.error.message ?? "Failed"); haptics.error(); return; }
      haptics.success();
      setLocations((prev) => [...prev, result.data!]);
      setShowCreateForm(false);
      resetForm();
    });
  }

  function handleUpdate(id: string) {
    if (!name.trim()) { setError("Name is required"); return; }
    setError(null);
    startTransition(async () => {
      haptics.impact("medium");
      const result = await updateShelfLocation(id, {
        name:        name.trim(),
        description: desc.trim()  || undefined,
        room_type:   (roomType    || undefined) as Parameters<typeof updateShelfLocation>[1]["room_type"],
        sort_order:  Number(sortOrder) || 0,
        is_active:   isActive,
      });
      if (result.error) { setError(result.error.message ?? "Failed"); haptics.error(); return; }
      haptics.success();
      setLocations((prev) => prev.map((l) => l.id === id ? result.data! : l));
      cancelEdit();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this shelf location? Items assigned here will become unlocated.")) return;
    startTransition(async () => {
      haptics.impact("heavy");
      const result = await deleteShelfLocation(id);
      if (result.error) { setError(result.error.message ?? "Failed"); return; }
      setLocations((prev) => prev.filter((l) => l.id !== id));
    });
  }

  const inputCls  = "w-full rounded-lg border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring";
  const selectCls = inputCls;

  function LocationForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
    return (
      <div className="rounded-xl border border-border p-4 space-y-3" style={{ backgroundColor: "var(--surface-2)" }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Name *
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={{ color: "var(--text-primary)" }} placeholder="e.g. Practical Life Shelf" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Room Type
            </label>
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={selectCls} style={{ color: "var(--text-primary)" }}>
              <option value="">—</option>
              {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} style={{ color: "var(--text-primary)" }} placeholder="Optional description" />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Sort Order</label>
            <input type="number" min={0} max={999} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-24 rounded-lg border border-border px-3 py-2 text-sm bg-transparent" style={{ color: "var(--text-primary)" }} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text-primary)" }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
        {error && <p className="text-xs" style={{ color: "var(--color-error)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={onSave} disabled={isPending} className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium" style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-fg)" }}>
            {isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel} className="active-push touch-target rounded-lg px-4 py-2 text-sm border border-border" style={{ color: "var(--text-secondary)" }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {locations.length === 0 && !showCreateForm ? (
        <div className="py-8 text-center">
          <p style={{ color: "var(--empty-state-icon)" }} className="text-3xl mb-1">📍</p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No shelf locations configured.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <div key={loc.id}>
              {editingId === loc.id ? (
                <LocationForm onSave={() => handleUpdate(loc.id)} onCancel={cancelEdit} />
              ) : (
                <div className="flex items-center justify-between gap-3 border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{AREA_EMOJIS[loc.room_type ?? "other"] ?? "📦"}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {loc.name}
                        {!loc.is_active && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded border border-border" style={{ color: "var(--text-tertiary)" }}>Inactive</span>
                        )}
                      </p>
                      {loc.description && (
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{loc.description}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(loc)} className="active-push touch-target text-xs px-3 py-1.5 rounded-lg border border-border" style={{ color: "var(--text-secondary)" }}>Edit</button>
                      <button onClick={() => handleDelete(loc.id)} disabled={isPending} className="active-push touch-target text-xs px-3 py-1.5 rounded-lg border" style={{ color: "var(--color-error)", borderColor: "var(--color-error-muted)" }}>Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        showCreateForm ? (
          <LocationForm onSave={handleCreate} onCancel={() => { setShowCreateForm(false); resetForm(); setError(null); }} />
        ) : (
          <button
            onClick={() => { setShowCreateForm(true); resetForm(); setEditingId(null); }}
            className="active-push touch-target w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            + Add shelf location
          </button>
        )
      )}
    </div>
  );
}
