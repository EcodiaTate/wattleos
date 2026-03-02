"use client";

import { useState, useMemo } from "react";
import type {
  TuckshopMenuItemWithSupplier,
  TuckshopMenuCategory,
  TuckshopDayOfWeek,
} from "@/types/domain";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface CartItem {
  menu_item_id: string;
  quantity: number;
}

interface MenuBrowserProps {
  items: TuckshopMenuItemWithSupplier[];
  cart: CartItem[];
  onCartChange: (cart: CartItem[]) => void;
  selectedDate: string; // YYYY-MM-DD
  readOnly?: boolean;
}

const CATEGORY_LABELS: Record<TuckshopMenuCategory, string> = {
  hot_food: "Hot Food",
  cold_food: "Cold Food",
  snack: "Snacks",
  drink: "Drinks",
  dessert: "Dessert",
  other: "Other",
};

const CATEGORY_ORDER: TuckshopMenuCategory[] = [
  "hot_food",
  "cold_food",
  "snack",
  "drink",
  "dessert",
  "other",
];

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuBrowser({
  items,
  cart,
  onCartChange,
  selectedDate,
  readOnly = false,
}: MenuBrowserProps) {
  const haptics = useHaptics();
  const [activeCategory, setActiveCategory] = useState<
    TuckshopMenuCategory | "all"
  >("all");

  // Determine day of week from selectedDate
  const dayOfWeek = useMemo((): TuckshopDayOfWeek | null => {
    if (!selectedDate) return null;
    const days: TuckshopDayOfWeek[] = [
      "sunday" as TuckshopDayOfWeek,
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday" as TuckshopDayOfWeek,
    ];
    const d = new Date(selectedDate);
    return days[d.getDay()] ?? null;
  }, [selectedDate]);

  // Filter items available on this day
  const availableItems = useMemo(() => {
    return items.filter(
      (item) =>
        !dayOfWeek ||
        item.available_days.length === 0 ||
        item.available_days.includes(dayOfWeek),
    );
  }, [items, dayOfWeek]);

  const categoriesPresent = useMemo(() => {
    const cats = new Set(availableItems.map((i) => i.category));
    return CATEGORY_ORDER.filter((c) => cats.has(c));
  }, [availableItems]);

  const filteredItems =
    activeCategory === "all"
      ? availableItems
      : availableItems.filter((i) => i.category === activeCategory);

  const cartMap = new Map(cart.map((c) => [c.menu_item_id, c.quantity]));

  function setQuantity(menuItemId: string, qty: number) {
    const next = cart.filter((c) => c.menu_item_id !== menuItemId);
    if (qty > 0) next.push({ menu_item_id: menuItemId, quantity: qty });
    onCartChange(next);
  }

  const cartTotal = cart.reduce((sum, item) => {
    const menuItem = items.find((i) => i.id === item.menu_item_id);
    return sum + (menuItem?.price_cents ?? 0) * item.quantity;
  }, 0);

  if (availableItems.length === 0) {
    return (
      <div className="py-12 text-center">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          No items available
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          There are no tuckshop items available for this day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      {categoriesPresent.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scroll-native pb-1">
          <button
            onClick={() => {
              setActiveCategory("all");
              haptics.selection();
            }}
            className="touch-target flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeCategory === "all"
                  ? "var(--primary)"
                  : "var(--secondary)",
              color:
                activeCategory === "all"
                  ? "var(--primary-foreground)"
                  : "var(--secondary-foreground)",
            }}
          >
            All
          </button>
          {categoriesPresent.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                haptics.selection();
              }}
              className="touch-target flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor:
                  activeCategory === cat
                    ? "var(--primary)"
                    : "var(--secondary)",
                color:
                  activeCategory === cat
                    ? "var(--primary-foreground)"
                    : "var(--secondary-foreground)",
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Menu grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => {
          const qty = cartMap.get(item.id) ?? 0;
          return (
            <div
              key={item.id}
              className="card-interactive flex flex-col gap-3 rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-32 w-full rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.name}
                    </p>
                    {item.description && (
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.description}
                      </p>
                    )}
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {CATEGORY_LABELS[item.category]}
                      {item.supplier && ` · ${item.supplier.name}`}
                    </p>
                  </div>
                  <p
                    className="flex-shrink-0 text-base font-bold tabular-nums"
                    style={{ color: "var(--foreground)" }}
                  >
                    {formatPrice(item.price_cents)}
                  </p>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center justify-end gap-2">
                  {qty > 0 ? (
                    <>
                      <button
                        onClick={() => {
                          setQuantity(item.id, qty - 1);
                          haptics.impact("light");
                        }}
                        className="touch-target active-push flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold"
                        style={{
                          backgroundColor: "var(--secondary)",
                          color: "var(--secondary-foreground)",
                        }}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span
                        className="w-6 text-center font-semibold tabular-nums"
                        style={{ color: "var(--foreground)" }}
                      >
                        {qty}
                      </span>
                      <button
                        onClick={() => {
                          setQuantity(item.id, qty + 1);
                          haptics.impact("light");
                        }}
                        className="touch-target active-push flex h-8 w-8 items-center justify-center rounded-full font-bold"
                        style={{
                          backgroundColor: "var(--primary)",
                          color: "var(--primary-foreground)",
                        }}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setQuantity(item.id, 1);
                        haptics.impact("medium");
                      }}
                      className="touch-target active-push rounded-full px-4 py-1.5 text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Add
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart summary */}
      {!readOnly && cart.length > 0 && (
        <div
          className="sticky bottom-4 rounded-xl border border-border p-4 shadow-lg"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {cart.reduce((s, c) => s + c.quantity, 0)} item
                {cart.reduce((s, c) => s + c.quantity, 0) !== 1 ? "s" : ""} in
                cart
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Total: {formatPrice(cartTotal)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
