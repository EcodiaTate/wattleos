// src/components/domain/materials/inventory-detail-client.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  updateItemCondition,
  updateItemStatus,
  recordInspection,
  deleteInventoryItem,
} from "@/lib/actions/materials";
import type {
  MaterialCondition,
  MaterialInventoryItemWithDetails,
  MaterialInventoryStatus,
  MaterialStudentIntroduction,
} from "@/types/domain";
import {
  MATERIAL_CONDITION_CONFIG,
  MATERIAL_STATUS_CONFIG,
  STATUS_TRANSITIONS,
  INSPECTION_OVERDUE_DAYS,
} from "@/lib/constants/materials";
import { MaterialConditionBadge } from "./material-condition-badge";
import { MaterialStatusBadge } from "./material-status-badge";
import { StudentIntroductionsList } from "./student-introductions-list";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useRouter } from "next/navigation";

interface InventoryDetailClientProps {
  item: MaterialInventoryItemWithDetails;
  studentIntroductions: MaterialStudentIntroduction[];
  canManage: boolean;
}

function isInspectionOverdue(lastInspectedAt: string | null): boolean {
  if (!lastInspectedAt) return true;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INSPECTION_OVERDUE_DAYS);
  return new Date(lastInspectedAt) < cutoff;
}

export function InventoryDetailClient({
  item: initialItem,
  studentIntroductions,
  canManage,
}: InventoryDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [item, setItem] = useState(initialItem);
  const [isPending, startTransition] = useTransition();
  const [activePanel, setActivePanel] = useState<
    "condition" | "status" | "inspect" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [newCondition, setNewCondition] = useState<MaterialCondition>(
    item.condition,
  );
  const [newStatus, setNewStatus] = useState<MaterialInventoryStatus>(
    item.status,
  );
  const [error, setError] = useState<string | null>(null);

  const overdue = isInspectionOverdue(item.last_inspected_at);
  const allowedStatuses = STATUS_TRANSITIONS[item.status];

  function handleConditionUpdate() {
    startTransition(async () => {
      haptics.impact("medium");
      const result = await updateItemCondition(item.id, {
        condition: newCondition,
        notes: notes || undefined,
      });
      if (result.error) {
        setError(result.error.message ?? "Failed");
        haptics.error();
        return;
      }
      setItem((prev) => ({ ...prev, condition: result.data!.condition }));
      haptics.success();
      setActivePanel(null);
      setNotes("");
    });
  }

  function handleStatusUpdate() {
    startTransition(async () => {
      haptics.impact("medium");
      const result = await updateItemStatus(item.id, {
        status: newStatus,
        notes: notes || undefined,
      });
      if (result.error) {
        setError(result.error.message ?? "Failed");
        haptics.error();
        return;
      }
      setItem((prev) => ({
        ...prev,
        status: result.data!.status as MaterialInventoryStatus,
      }));
      haptics.success();
      setActivePanel(null);
      setNotes("");
    });
  }

  function handleInspect() {
    startTransition(async () => {
      haptics.impact("medium");
      const result = await recordInspection(item.id, {
        condition: newCondition,
        notes: notes || undefined,
      });
      if (result.error) {
        setError(result.error.message ?? "Failed");
        haptics.error();
        return;
      }
      setItem((prev) => ({
        ...prev,
        condition: result.data!.condition as MaterialCondition,
        last_inspected_at: result.data!.last_inspected_at,
      }));
      haptics.success();
      setActivePanel(null);
      setNotes("");
    });
  }

  function handleDelete() {
    if (!confirm("Remove this item from the inventory? This cannot be undone."))
      return;
    startTransition(async () => {
      haptics.impact("heavy");
      const result = await deleteInventoryItem(item.id);
      if (result.error) {
        setError(result.error.message ?? "Failed");
        return;
      }
      router.replace("/pedagogy/materials/inventory");
    });
  }

  const inputCls =
    "w-full rounded-lg border border-border px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-ring";
  const selectCls = inputCls;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {item.material?.name ?? "Unknown material"}
          </h1>
          <p
            className="text-sm mt-1 capitalize"
            style={{ color: "var(--text-secondary)" }}
          >
            {item.material?.area?.replace(/_/g, " ")}
            {item.material?.age_level &&
              ` · ${item.material.age_level.replace(/_/g, "–")}`}
          </p>
          {item.location && (
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              📍 {item.location.name}
              {item.shelf_position && ` - ${item.shelf_position}`}
            </p>
          )}
        </div>
        {canManage && (
          <Link
            href={`/pedagogy/materials/inventory/${item.id}/edit`}
            className="active-push touch-target rounded-lg px-3 py-2 text-sm border border-border font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            Edit
          </Link>
        )}
      </div>

      {/* Status / condition row */}
      <div className="flex flex-wrap gap-2 items-center">
        <MaterialStatusBadge status={item.status} />
        <MaterialConditionBadge condition={item.condition} />
        {overdue && item.status !== "retired" && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full border"
            style={{
              color: "var(--color-warning)",
              borderColor: "var(--color-warning-muted)",
              backgroundColor: "var(--color-warning-subtle)",
            }}
          >
            ⚠ Inspection overdue
          </span>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Quantity",
            value: `${item.quantity} piece${item.quantity !== 1 ? "s" : ""}`,
          },
          { label: "Serial No.", value: item.serial_number ?? "—" },
          {
            label: "Date Acquired",
            value: item.date_acquired
              ? new Date(item.date_acquired).toLocaleDateString("en-AU")
              : "—",
          },
          {
            label: "Last Inspected",
            value: item.last_inspected_at
              ? new Date(item.last_inspected_at).toLocaleDateString("en-AU")
              : "Never",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border p-3"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {label}
            </p>
            <p
              className="text-sm font-medium mt-0.5"
              style={{ color: "var(--text-primary)" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {item.notes && (
        <div
          className="rounded-xl border border-border p-4"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <p
            className="text-xs font-medium mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Notes
          </p>
          <p
            className="text-sm whitespace-pre-wrap"
            style={{ color: "var(--text-secondary)" }}
          >
            {item.notes}
          </p>
        </div>
      )}

      {/* Quick actions */}
      {canManage && item.status !== "retired" && (
        <div className="space-y-2">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-tertiary)" }}
          >
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActivePanel("inspect");
                setNewCondition(item.condition);
                setNotes("");
                setError(null);
              }}
              className="active-push touch-target rounded-lg px-3 py-2 text-sm border border-border"
              style={{ color: "var(--text-primary)" }}
            >
              🔍 Record Inspection
            </button>
            <button
              onClick={() => {
                setActivePanel("condition");
                setNewCondition(item.condition);
                setNotes("");
                setError(null);
              }}
              className="active-push touch-target rounded-lg px-3 py-2 text-sm border border-border"
              style={{ color: "var(--text-primary)" }}
            >
              Update Condition
            </button>
            {allowedStatuses.length > 0 && (
              <button
                onClick={() => {
                  setActivePanel("status");
                  setNewStatus(allowedStatuses[0]);
                  setNotes("");
                  setError(null);
                }}
                className="active-push touch-target rounded-lg px-3 py-2 text-sm border border-border"
                style={{ color: "var(--text-primary)" }}
              >
                Update Status
              </button>
            )}
          </div>

          {/* Inline panel */}
          {activePanel && (
            <div
              className="rounded-xl border border-border p-4 space-y-3"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              {(activePanel === "condition" || activePanel === "inspect") && (
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Condition
                  </label>
                  <select
                    value={newCondition}
                    onChange={(e) =>
                      setNewCondition(e.target.value as MaterialCondition)
                    }
                    className={selectCls}
                    style={{ color: "var(--text-primary)" }}
                  >
                    {Object.entries(MATERIAL_CONDITION_CONFIG).map(
                      ([val, cfg]) => (
                        <option key={val} value={val}>
                          {cfg.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
              {activePanel === "status" && (
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as MaterialInventoryStatus)
                    }
                    className={selectCls}
                    style={{ color: "var(--text-primary)" }}
                  >
                    {allowedStatuses.map((s) => (
                      <option key={s} value={s}>
                        {MATERIAL_STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note about this change…"
                  className={inputCls}
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              {error && (
                <p className="text-xs" style={{ color: "var(--color-error)" }}>
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={
                    activePanel === "status"
                      ? handleStatusUpdate
                      : activePanel === "inspect"
                        ? handleInspect
                        : handleConditionUpdate
                  }
                  disabled={isPending}
                  className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-primary-fg)",
                  }}
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setActivePanel(null);
                    setError(null);
                  }}
                  className="active-push touch-target rounded-lg px-4 py-2 text-sm border border-border"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student introductions */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div
          className="px-4 py-3 border-b border-border"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Students Introduced ({studentIntroductions.length})
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            From lesson records - shows first introduction date and current
            stage.
          </p>
        </div>
        <div className="px-4">
          <StudentIntroductionsList introductions={studentIntroductions} />
        </div>
      </div>

      {/* Danger zone */}
      {canManage && (
        <div
          className="rounded-xl border border-border p-4"
          style={{ borderColor: "var(--color-error-muted)" }}
        >
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--color-error)" }}
          >
            Remove from Inventory
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
            This permanently removes the record. Lesson history is not affected.
          </p>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--color-error)",
              color: "var(--color-error-fg)",
            }}
          >
            Remove Item
          </button>
        </div>
      )}
    </div>
  );
}
