"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  TuckshopMenuItemWithSupplier,
  TuckshopSupplier,
  TuckshopMenuCategory,
  TuckshopDayOfWeek,
} from "@/types/domain";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "@/lib/actions/tuckshop";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface MenuManagerClientProps {
  items: TuckshopMenuItemWithSupplier[];
  suppliers: TuckshopSupplier[];
}

const CATEGORIES: { value: TuckshopMenuCategory; label: string }[] = [
  { value: "hot_food", label: "Hot Food" },
  { value: "cold_food", label: "Cold Food" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drink" },
  { value: "dessert", label: "Dessert" },
  { value: "other", label: "Other" },
];

const DAYS: { value: TuckshopDayOfWeek; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
];

type FormState = {
  name: string;
  description: string;
  category: TuckshopMenuCategory;
  price_dollars: string;
  supplier_id: string;
  available_days: TuckshopDayOfWeek[];
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  category: "hot_food",
  price_dollars: "",
  supplier_id: "",
  available_days: [],
  is_active: true,
};

export function MenuManagerClient({
  items,
  suppliers,
}: MenuManagerClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<
    TuckshopMenuCategory | "all"
  >("all");

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    haptics.impact("light");
  }

  function openEdit(item: TuckshopMenuItemWithSupplier) {
    setForm({
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      price_dollars: (item.price_cents / 100).toFixed(2),
      supplier_id: item.supplier_id ?? "",
      available_days: item.available_days,
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setShowForm(true);
    haptics.impact("light");
  }

  function toggleDay(day: TuckshopDayOfWeek) {
    setForm((f) => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter((d) => d !== day)
        : [...f.available_days, day],
    }));
    haptics.selection();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.impact("medium");

    const priceCents = Math.round(parseFloat(form.price_dollars) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      setError("Invalid price");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      price_cents: priceCents,
      supplier_id: form.supplier_id || null,
      available_days: form.available_days,
      is_active: form.is_active,
    };

    startTransition(async () => {
      const result = editingId
        ? await updateMenuItem(editingId, payload)
        : await createMenuItem(payload);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        setShowForm(false);
        router.refresh();
      }
    });
  }

  async function handleDelete(itemId: string, name: string) {
    if (!confirm(`Remove "${name}" from the menu?`)) return;
    haptics.impact("medium");
    startTransition(async () => {
      const result = await deleteMenuItem(itemId);
      if (result.error) {
        haptics.error();
      } else {
        haptics.success();
        router.refresh();
      }
    });
  }

  const filteredItems =
    categoryFilter === "all"
      ? items
      : items.filter((i) => i.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {items.filter((i) => i.is_active).length} active item
          {items.filter((i) => i.is_active).length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Add Item
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
            {editingId ? "Edit Menu Item" : "New Menu Item"}
          </h3>
          {error && (
            <p className="text-sm" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name *">
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </FormField>

            <FormField label="Price *">
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  $
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={form.price_dollars}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price_dollars: e.target.value }))
                  }
                  required
                  className="w-full rounded-lg border border-border py-2 pl-7 pr-3 text-sm"
                  style={{
                    backgroundColor: "var(--input)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </FormField>

            <FormField label="Category *">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as TuckshopMenuCategory,
                  }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Supplier">
              <select
                value={form.supplier_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplier_id: e.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </FormField>

          <FormField label="Available Days (leave empty = all days)">
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className="touch-target active-push rounded-lg px-3 py-1.5 text-sm font-medium"
                  style={{
                    backgroundColor: form.available_days.includes(day.value)
                      ? "var(--primary)"
                      : "var(--secondary)",
                    color: form.available_days.includes(day.value)
                      ? "var(--primary-foreground)"
                      : "var(--secondary-foreground)",
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </FormField>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded"
            />
            <span className="text-sm" style={{ color: "var(--foreground)" }}>
              Active (visible to parents)
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="touch-target active-push rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scroll-native pb-1">
        <FilterTab
          active={categoryFilter === "all"}
          onClick={() => {
            setCategoryFilter("all");
            haptics.selection();
          }}
        >
          All
        </FilterTab>
        {CATEGORIES.map((c) => (
          <FilterTab
            key={c.value}
            active={categoryFilter === c.value}
            onClick={() => {
              setCategoryFilter(c.value);
              haptics.selection();
            }}
          >
            {c.label}
          </FilterTab>
        ))}
      </div>

      {/* Item list */}
      {filteredItems.length === 0 ? (
        <div className="py-10 text-center">
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            No items
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Add menu items to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
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
                {["Item", "Category", "Price", "Days", "Supplier", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0"
                  style={{
                    borderColor: "var(--border)",
                    opacity: item.is_active ? 1 : 0.5,
                  }}
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {item.name}
                    {!item.is_active && (
                      <span
                        className="ml-2 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        (inactive)
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {CATEGORIES.find((c) => c.value === item.category)?.label}
                  </td>
                  <td
                    className="px-4 py-3 tabular-nums"
                    style={{ color: "var(--foreground)" }}
                  >
                    ${(item.price_cents / 100).toFixed(2)}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item.available_days.length === 0
                      ? "All days"
                      : item.available_days
                          .map(
                            (d) =>
                              DAYS.find((dd) => dd.value === d)?.label ?? d,
                          )
                          .join(", ")}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item.supplier?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="touch-target active-push rounded-lg px-3 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: "var(--secondary)",
                          color: "var(--secondary-foreground)",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={isPending}
                        className="touch-target active-push rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
                        style={{
                          backgroundColor:
                            "var(--destructive-muted, var(--muted))",
                          color: "var(--destructive)",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="touch-target flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? "var(--primary)" : "var(--secondary)",
        color: active ? "var(--primary-foreground)" : "var(--secondary-foreground)",
      }}
    >
      {children}
    </button>
  );
}
