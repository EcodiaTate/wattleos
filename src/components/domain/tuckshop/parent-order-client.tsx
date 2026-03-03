"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  TuckshopMenuItemWithSupplier,
  TuckshopOrderWithDetails,
  TuckshopDeliveryWeek,
} from "@/types/domain";
import { MenuBrowser } from "./menu-browser";
import { TuckshopOrderStatusBadge } from "./tuckshop-status-badge";
import { placeOrder, cancelOrder } from "@/lib/actions/tuckshop";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface CartItem {
  menu_item_id: string;
  quantity: number;
}

interface ParentOrderClientProps {
  studentId: string;
  studentName: string;
  menuItems: TuckshopMenuItemWithSupplier[];
  pastOrders: TuckshopOrderWithDetails[];
  openDeliveryWeeks: TuckshopDeliveryWeek[];
}

export function ParentOrderClient({
  studentId,
  studentName,
  menuItems,
  pastOrders,
  openDeliveryWeeks,
}: ParentOrderClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab] = useState<"order" | "history">("order");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>(
    openDeliveryWeeks[0]?.id ?? "",
  );
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const cartTotal = cart.reduce((sum, item) => {
    const menuItem = menuItems.find((i) => i.id === item.menu_item_id);
    return sum + (menuItem?.price_cents ?? 0) * item.quantity;
  }, 0);

  const canOrder = openDeliveryWeeks.length > 0;

  async function handlePlaceOrder() {
    if (cart.length === 0) return;
    setError(null);
    haptics.impact("heavy");

    startTransition(async () => {
      const result = await placeOrder({
        student_id: studentId,
        delivery_week_id: selectedWeekId || null,
        order_date: orderDate,
        items: cart,
        notes: notes || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        setCart([]);
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm("Cancel this order?")) return;
    haptics.impact("medium");
    startTransition(async () => {
      await cancelOrder(orderId, { cancellation_reason: null });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div
        className="flex rounded-xl border border-border"
        style={{ backgroundColor: "var(--muted)" }}
      >
        {(["order", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              haptics.selection();
            }}
            className="flex-1 rounded-xl py-2 text-sm font-medium transition-all"
            style={{
              backgroundColor:
                tab === t ? "var(--card)" : "transparent",
              color:
                tab === t
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
              margin: "2px",
            }}
          >
            {t === "order" ? "Place Order" : "Order History"}
          </button>
        ))}
      </div>

      {tab === "order" ? (
        <div className="space-y-4">
          {!canOrder ? (
            <div
              className="rounded-xl border border-border py-10 text-center"
              style={{ backgroundColor: "var(--card)" }}
            >
              <p
                className="font-medium"
                style={{ color: "var(--foreground)" }}
              >
                No tuckshop weeks open
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Orders are not currently being accepted. Check back soon.
              </p>
            </div>
          ) : (
            <>
              {/* Delivery week picker */}
              {openDeliveryWeeks.length > 0 && (
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Delivery Week
                  </label>
                  <select
                    value={selectedWeekId}
                    onChange={(e) => setSelectedWeekId(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--input)",
                      color: "var(--foreground)",
                    }}
                  >
                    {openDeliveryWeeks.map((week) => (
                      <option key={week.id} value={week.id}>
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
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Order Date
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--input)",
                    color: "var(--foreground)",
                  }}
                />
              </div>

              {/* Menu */}
              <MenuBrowser
                items={menuItems}
                cart={cart}
                onCartChange={setCart}
                selectedDate={orderDate}
              />

              {/* Order notes */}
              {cart.length > 0 && (
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. allergies, special requests..."
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--input)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              )}

              {error && (
                <p className="text-sm" style={{ color: "var(--destructive)" }}>
                  {error}
                </p>
              )}

              {success && (
                <div
                  className="rounded-lg border p-3 text-sm"
                  style={{
                    borderColor: "var(--tuckshop-collected-fg)",
                    backgroundColor: "var(--tuckshop-collected-bg)",
                    color: "var(--tuckshop-collected-fg)",
                  }}
                >
                  Order placed successfully!
                </div>
              )}

              {cart.length > 0 && (
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPending}
                  className="touch-target active-push w-full rounded-xl py-3 text-base font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isPending
                    ? "Placing order..."
                    : `Place Order · $${(cartTotal / 100).toFixed(2)}`}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pastOrders.length === 0 ? (
            <div
              className="rounded-xl border border-border py-10 text-center"
              style={{ backgroundColor: "var(--card)" }}
            >
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                No orders yet
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {studentName}&apos;s order history will appear here.
              </p>
            </div>
          ) : (
            pastOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <TuckshopOrderStatusBadge status={order.status} />
                      <span
                        className="text-sm tabular-nums"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {new Date(order.order_date).toLocaleDateString(
                          "en-AU",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="text-sm"
                          style={{ color: "var(--foreground)" }}
                        >
                          {item.quantity}× {item.menu_item.name}
                        </li>
                      ))}
                    </ul>
                    {order.notes && (
                      <p
                        className="mt-1 text-xs italic"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {order.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className="font-bold tabular-nums"
                      style={{ color: "var(--foreground)" }}
                    >
                      ${(order.total_price_cents / 100).toFixed(2)}
                    </p>
                    {(order.status === "draft" ||
                      order.status === "submitted") && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={isPending}
                        className="mt-2 touch-target active-push rounded-lg px-2 py-1 text-xs disabled:opacity-50"
                        style={{
                          color: "var(--destructive)",
                          backgroundColor:
                            "var(--destructive-muted, var(--muted))",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
