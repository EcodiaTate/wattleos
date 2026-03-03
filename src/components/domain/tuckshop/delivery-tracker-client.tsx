"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  TuckshopDeliveryWeekWithDetails,
  TuckshopSupplier,
  TuckshopDeliveryStatus,
} from "@/types/domain";
import {
  createDeliveryWeek,
  advanceDeliveryWeekStatus,
  exportDeliveryWeekOrders,
} from "@/lib/actions/tuckshop";
import { TuckshopDeliveryStatusBadge } from "./tuckshop-status-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface DeliveryTrackerClientProps {
  deliveryWeeks: TuckshopDeliveryWeekWithDetails[];
  suppliers: TuckshopSupplier[];
  focusWeekId?: string | null;
}

const STATUS_TRANSITIONS: Record<
  TuckshopDeliveryStatus,
  { next: TuckshopDeliveryStatus; label: string } | null
> = {
  open: { next: "ordered", label: "Mark as Ordered" },
  ordered: { next: "received", label: "Mark as Received" },
  received: { next: "finalized", label: "Finalize Week" },
  finalized: null,
};

export function DeliveryTrackerClient({
  deliveryWeeks,
  suppliers,
  focusWeekId,
}: DeliveryTrackerClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNewWeek, setShowNewWeek] = useState(false);
  const [newWeekForm, setNewWeekForm] = useState({
    supplier_id: "",
    week_start: "",
    week_end: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<{
    weekId: string;
    csv: string;
  } | null>(null);

  async function handleCreateWeek(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.impact("medium");
    startTransition(async () => {
      const result = await createDeliveryWeek({
        supplier_id: newWeekForm.supplier_id,
        week_start: newWeekForm.week_start,
        week_end: newWeekForm.week_end,
        notes: newWeekForm.notes || null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        setShowNewWeek(false);
        router.refresh();
      }
    });
  }

  async function handleAdvanceStatus(
    weekId: string,
    status: TuckshopDeliveryStatus,
  ) {
    haptics.impact("medium");
    startTransition(async () => {
      await advanceDeliveryWeekStatus(weekId, { status, notes: null });
      router.refresh();
    });
  }

  async function handleExport(weekId: string) {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await exportDeliveryWeekOrders(weekId);
      if (result.error || !result.data) {
        haptics.error();
        return;
      }

      // Build CSV
      const { rows, totals } = result.data;
      const headers = [
        "Student",
        "Item",
        "Category",
        "Qty",
        "Unit Price",
        "Line Total",
      ];
      const dataRows = rows.map((r) => [
        r.student_name,
        r.item_name,
        r.category,
        r.quantity.toString(),
        `$${(r.unit_price_cents / 100).toFixed(2)}`,
        `$${(r.line_total_cents / 100).toFixed(2)}`,
      ]);

      const totalsHeader = ["", "TOTALS", "", "", "", ""];
      const totalsRows = totals.map((t) => [
        "",
        t.item_name,
        "",
        t.total_quantity.toString(),
        "",
        `$${(t.total_cents / 100).toFixed(2)}`,
      ]);

      const csvContent = [
        headers.join(","),
        ...dataRows.map((r) => r.join(",")),
        "",
        totalsHeader.join(","),
        ...totalsRows.map((r) => r.join(",")),
      ].join("\n");

      // Download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tuckshop-order-${result.data.week.week_start}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      haptics.success();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {deliveryWeeks.length} delivery week
          {deliveryWeeks.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => {
            setShowNewWeek(true);
            haptics.impact("light");
          }}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          New Delivery Week
        </button>
      </div>

      {/* New week form */}
      {showNewWeek && (
        <form
          onSubmit={handleCreateWeek}
          className="space-y-4 rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
            New Delivery Week
          </h3>
          {error && (
            <p className="text-sm" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Supplier *
              </label>
              <select
                value={newWeekForm.supplier_id}
                onChange={(e) =>
                  setNewWeekForm((f) => ({ ...f, supplier_id: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Week Start *
              </label>
              <input
                type="date"
                value={newWeekForm.week_start}
                onChange={(e) =>
                  setNewWeekForm((f) => ({ ...f, week_start: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Week End *
              </label>
              <input
                type="date"
                value={newWeekForm.week_end}
                onChange={(e) =>
                  setNewWeekForm((f) => ({ ...f, week_end: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Notes
            </label>
            <textarea
              value={newWeekForm.notes}
              onChange={(e) =>
                setNewWeekForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="touch-target active-push rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewWeek(false)}
              className="touch-target active-push rounded-lg px-5 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--secondary-foreground)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Delivery week list */}
      {deliveryWeeks.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            No delivery weeks
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Create a delivery week to start accepting parent orders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveryWeeks.map((week) => {
            const transition = STATUS_TRANSITIONS[week.status];
            const isFocused = focusWeekId === week.id;
            return (
              <div
                key={week.id}
                className="rounded-xl border p-5"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: isFocused
                    ? "var(--primary)"
                    : "var(--border)",
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <TuckshopDeliveryStatusBadge status={week.status} />
                      <span
                        className="font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {week.supplier.name}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {new Date(week.week_start).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      –{" "}
                      {new Date(week.week_end).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    {week.notes && (
                      <p
                        className="mt-1 text-xs italic"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {week.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: "var(--foreground)" }}
                    >
                      {week.order_count} orders
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      ${(week.total_revenue_cents / 100).toFixed(2)} revenue
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(week.status === "open" || week.status === "ordered") && (
                    <button
                      onClick={() => handleExport(week.id)}
                      disabled={isPending}
                      className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--secondary)",
                        color: "var(--secondary-foreground)",
                      }}
                    >
                      Export CSV
                    </button>
                  )}
                  {transition && (
                    <button
                      onClick={() =>
                        handleAdvanceStatus(week.id, transition.next)
                      }
                      disabled={isPending}
                      className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {transition.label}
                    </button>
                  )}
                  {week.ordered_at && (
                    <p
                      className="self-center text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Ordered:{" "}
                      {new Date(week.ordered_at).toLocaleDateString("en-AU")}
                    </p>
                  )}
                  {week.finalized_at && (
                    <p
                      className="self-center text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Finalized:{" "}
                      {new Date(week.finalized_at).toLocaleDateString("en-AU")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
