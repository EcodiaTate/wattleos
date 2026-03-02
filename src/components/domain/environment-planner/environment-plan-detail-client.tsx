"use client";

// src/components/domain/environment-planner/environment-plan-detail-client.tsx

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, Plus, X, Check } from "lucide-react";
import type {
  EnvironmentPlanWithDetails,
  MaterialInventoryItemWithDetails,
} from "@/types/domain";
import {
  deleteEnvironmentPlan,
  upsertPlanShelfSlot,
  deletePlanShelfSlot,
  updateEnvironmentPlan,
} from "@/lib/actions/environment-planner";
import { EnvironmentPlanStatusBadge } from "./environment-plan-status-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  plan: EnvironmentPlanWithDetails;
  availableItems: MaterialInventoryItemWithDetails[];
  canManage: boolean;
}

export function EnvironmentPlanDetailClient({ plan, availableItems, canManage }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [slots, setSlots] = useState(plan.slots);
  const [addingSlot, setAddingSlot] = useState(false);
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotItemId, setNewSlotItemId] = useState("");

  function handleDelete() {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    haptics.impact("heavy");
    startTransition(async () => {
      await deleteEnvironmentPlan(plan.id);
      router.push("/pedagogy/environment-planner");
    });
  }

  function handleActivate() {
    haptics.impact("medium");
    startTransition(async () => {
      await updateEnvironmentPlan(plan.id, { status: "active" });
      router.refresh();
    });
  }

  function handleAddSlot() {
    if (!newSlotLabel.trim()) return;
    haptics.impact("medium");
    startTransition(async () => {
      const result = await upsertPlanShelfSlot({
        plan_id:           plan.id,
        slot_label:        newSlotLabel.trim(),
        inventory_item_id: newSlotItemId || null,
        sort_order:        slots.length,
      });
      if (!result.error) {
        router.refresh();
        setAddingSlot(false);
        setNewSlotLabel("");
        setNewSlotItemId("");
      }
    });
  }

  function handleDeleteSlot(slotId: string) {
    haptics.impact("light");
    startTransition(async () => {
      await deletePlanShelfSlot(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    });
  }

  async function handleSlotItemChange(slotId: string, slotLabel: string, newItemId: string) {
    haptics.impact("light");
    startTransition(async () => {
      await upsertPlanShelfSlot({
        plan_id:           plan.id,
        slot_label:        slotLabel,
        inventory_item_id: newItemId || null,
      });
      router.refresh();
    });
  }

  const inputClass = "rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  const inputStyle = { background: "var(--input-bg)", color: "var(--text-primary)" };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/pedagogy/environment-planner"
          className="touch-target flex items-center gap-1 text-sm mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {plan.name}
            </h1>
            <EnvironmentPlanStatusBadge status={plan.status} />
          </div>
          {plan.theme && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{plan.theme}</p>
          )}
          {plan.location && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              📍 {(plan.location as { name: string }).name}
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2 flex-shrink-0">
            {plan.status === "draft" && (
              <button
                onClick={handleActivate}
                disabled={isPending}
                className="active-push touch-target px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--env-plan-active-bg)", color: "var(--env-plan-active-fg)" }}
              >
                <Check className="w-4 h-4 inline mr-1" />
                Activate
              </button>
            )}
            <Link
              href={`/pedagogy/environment-planner/plans/${plan.id}/edit`}
              className="active-push touch-target p-2 rounded-lg border border-border"
              style={{ color: "var(--text-secondary)" }}
            >
              <Edit2 className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="active-push touch-target p-2 rounded-lg border border-border"
              style={{ color: "var(--env-rotation-overdue)" }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      {(plan.description || plan.effective_from) && (
        <div
          className="rounded-xl border border-border p-4 text-sm space-y-1"
          style={{ background: "var(--surface)", color: "var(--text-secondary)" }}
        >
          {plan.effective_from && (
            <p>
              <span style={{ color: "var(--text-tertiary)" }}>Period:</span>{" "}
              {plan.effective_from}{plan.effective_to ? ` → ${plan.effective_to}` : ""}
            </p>
          )}
          {plan.description && <p>{plan.description}</p>}
        </div>
      )}

      {/* Shelf Layout */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Shelf Layout ({slots.length} slots)
          </h2>
          {canManage && !addingSlot && (
            <button
              onClick={() => { haptics.impact("light"); setAddingSlot(true); }}
              className="active-push touch-target flex items-center gap-1.5 text-sm"
              style={{ color: "var(--primary)" }}
            >
              <Plus className="w-4 h-4" />
              Add slot
            </button>
          )}
        </div>

        {/* Add slot form */}
        {addingSlot && (
          <div
            className="rounded-xl border border-border p-4 mb-3 flex gap-3 flex-wrap items-end"
            style={{ background: "var(--surface-elevated)" }}
          >
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-tertiary)" }}>Slot label *</label>
              <input
                autoFocus
                className={inputClass}
                style={inputStyle}
                value={newSlotLabel}
                onChange={(e) => setNewSlotLabel(e.target.value)}
                placeholder="e.g. Row A Slot 1"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "var(--text-tertiary)" }}>Material (optional)</label>
              <select
                className={inputClass}
                style={{ ...inputStyle, maxWidth: "200px" }}
                value={newSlotItemId}
                onChange={(e) => setNewSlotItemId(e.target.value)}
              >
                <option value="">— Empty slot —</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.material?.name ?? item.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSlot}
                disabled={isPending || !newSlotLabel.trim()}
                className="active-push touch-target px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                Add
              </button>
              <button
                onClick={() => { setAddingSlot(false); setNewSlotLabel(""); setNewSlotItemId(""); }}
                className="active-push touch-target p-1.5 rounded-lg border border-border"
                style={{ color: "var(--text-secondary)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {slots.length === 0 && !addingSlot ? (
          <div
            className="rounded-xl border border-border p-8 text-center"
            style={{ background: "var(--surface)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No slots yet. Add slots to map materials to positions on this shelf.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--surface)" }}>
            {slots.map((slot, idx) => {
              const item = slot.inventory_item;
              const material = item?.material;
              return (
                <div
                  key={slot.id}
                  className={`px-4 py-3 flex items-center gap-4 ${idx > 0 ? "border-t border-border" : ""}`}
                >
                  {/* Slot label */}
                  <div
                    className="w-24 flex-shrink-0 text-xs font-mono font-medium px-2 py-1 rounded"
                    style={{ background: "var(--surface-elevated)", color: "var(--text-tertiary)" }}
                  >
                    {slot.slot_label}
                  </div>

                  {/* Material */}
                  <div className="flex-1 min-w-0">
                    {material ? (
                      <div>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {material.name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {material.area.replace(/_/g, " ")} · {material.age_level}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
                        Empty slot
                      </p>
                    )}
                  </div>

                  {/* Change material */}
                  {canManage && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        className="text-xs rounded border border-border px-2 py-1 outline-none"
                        style={{ background: "var(--input-bg)", color: "var(--text-primary)" }}
                        value={item?.id ?? ""}
                        onChange={(e) => handleSlotItemChange(slot.id, slot.slot_label, e.target.value)}
                      >
                        <option value="">— Empty —</option>
                        {availableItems.map((av) => (
                          <option key={av.id} value={av.id}>
                            {av.material?.name ?? av.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="active-push touch-target p-1.5 rounded"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
