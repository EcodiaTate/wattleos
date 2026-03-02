"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  TuckshopDashboardData,
  TuckshopOrderWithDetails,
} from "@/types/domain";
import {
  TuckshopOrderStatusBadge,
  TuckshopDeliveryStatusBadge,
} from "./tuckshop-status-badge";
import { markOrderReady, markOrderCollected } from "@/lib/actions/tuckshop";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface CoordinatorDashboardClientProps {
  dashboard: TuckshopDashboardData;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CoordinatorDashboardClient({
  dashboard,
}: CoordinatorDashboardClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { stats, active_delivery_weeks, pending_orders } = dashboard;

  async function handleMarkReady(orderId: string) {
    haptics.impact("medium");
    startTransition(async () => {
      await markOrderReady(orderId);
      router.refresh();
    });
  }

  async function handleMarkCollected(orderId: string) {
    haptics.impact("heavy");
    startTransition(async () => {
      await markOrderCollected(orderId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Open Weeks"
          value={stats.open_delivery_weeks}
          colorVar="var(--tuckshop-delivery-open-fg)"
        />
        <StatCard
          label="Submitted Orders"
          value={stats.submitted_orders_this_week}
          colorVar="var(--tuckshop-submitted-fg)"
        />
        <StatCard
          label="Ready to Collect"
          value={stats.ready_for_collection}
          colorVar="var(--tuckshop-ready-fg)"
        />
        <StatCard
          label="Revenue This Week"
          value={formatPrice(stats.total_revenue_this_week_cents)}
          colorVar="var(--foreground)"
        />
      </div>

      {/* Active delivery weeks */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Active Delivery Weeks
          </h2>
          <Link
            href="/admin/tuckshop/deliveries"
            className="text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--muted-foreground)" }}
          >
            View all
          </Link>
        </div>

        {active_delivery_weeks.length === 0 ? (
          <EmptyState
            icon="📦"
            message="No active delivery weeks"
            hint="Create a delivery week to start accepting orders."
            action={
              <Link
                href="/admin/tuckshop/deliveries"
                className="touch-target active-push mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Manage Deliveries
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {active_delivery_weeks.map((week) => (
              <div
                key={week.id}
                className="rounded-xl border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <TuckshopDeliveryStatusBadge status={week.status} />
                      <span
                        className="text-sm font-semibold"
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
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      –{" "}
                      {new Date(week.week_end).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {week.order_count} order
                      {week.order_count !== 1 ? "s" : ""}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {formatPrice(week.total_revenue_cents)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/tuckshop/deliveries?week=${week.id}`}
                    className="touch-target active-push rounded-lg px-3 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: "var(--secondary)",
                      color: "var(--secondary-foreground)",
                    }}
                  >
                    View Orders
                  </Link>
                  {week.status === "open" && (
                    <Link
                      href={`/admin/tuckshop/deliveries?week=${week.id}&action=export`}
                      className="touch-target active-push rounded-lg px-3 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Export & Order
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending orders */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Orders Awaiting Action
          </h2>
        </div>

        {pending_orders.length === 0 ? (
          <EmptyState
            icon="✅"
            message="All caught up"
            hint="No orders are awaiting action right now."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="scroll-native overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ backgroundColor: "var(--card)" }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--muted)",
                    }}
                  >
                    {[
                      "Student",
                      "Date",
                      "Items",
                      "Total",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pending_orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      isPending={isPending}
                      onMarkReady={handleMarkReady}
                      onMarkCollected={handleMarkCollected}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Quick links */}
      <section>
        <h2
          className="mb-3 text-base font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Manage
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              href: "/admin/tuckshop/suppliers",
              label: "Suppliers",
              sub: `${dashboard.active_suppliers.length} active`,
            },
            {
              href: "/admin/tuckshop/deliveries",
              label: "Delivery Weeks",
              sub: "Manage cycles",
            },
            {
              href: "/admin/tuckshop?tab=menu",
              label: "Menu Items",
              sub: "Edit menu",
            },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card-interactive rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
              onClick={() => haptics.impact("light")}
            >
              <p
                className="font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {link.label}
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {link.sub}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function StatCard({
  label,
  value,
  colorVar,
}: {
  label: string;
  value: string | number;
  colorVar: string;
}) {
  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: colorVar }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  message,
  hint,
  action,
}: {
  icon: string;
  message: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-border py-10 text-center"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div
        className="mx-auto mb-3 text-4xl"
        style={{ color: "var(--empty-state-icon)" }}
      >
        {icon}
      </div>
      <p className="font-medium" style={{ color: "var(--foreground)" }}>
        {message}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
        {hint}
      </p>
      {action}
    </div>
  );
}

function OrderRow({
  order,
  isPending,
  onMarkReady,
  onMarkCollected,
}: {
  order: TuckshopOrderWithDetails;
  isPending: boolean;
  onMarkReady: (id: string) => void;
  onMarkCollected: (id: string) => void;
}) {
  return (
    <tr
      className="border-b border-border last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <td
        className="px-4 py-3 font-medium"
        style={{ color: "var(--foreground)" }}
      >
        {order.student.first_name} {order.student.last_name}
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: "var(--muted-foreground)" }}
      >
        {new Date(order.order_date).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        })}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
        {order.items.map((item) => `${item.quantity}× ${item.menu_item.name}`).join(", ")}
      </td>
      <td
        className="px-4 py-3 tabular-nums"
        style={{ color: "var(--foreground)" }}
      >
        ${(order.total_price_cents / 100).toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <TuckshopOrderStatusBadge status={order.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {order.status === "submitted" && (
            <button
              onClick={() => onMarkReady(order.id)}
              disabled={isPending}
              className="touch-target active-push rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--tuckshop-ready-bg)",
                color: "var(--tuckshop-ready-fg)",
              }}
            >
              Mark Ready
            </button>
          )}
          {(order.status === "submitted" || order.status === "ready") && (
            <button
              onClick={() => onMarkCollected(order.id)}
              disabled={isPending}
              className="touch-target active-push rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--tuckshop-collected-bg)",
                color: "var(--tuckshop-collected-fg)",
              }}
            >
              Collected
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
