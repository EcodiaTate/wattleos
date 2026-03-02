"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TuckshopSupplier, TuckshopDayOfWeek } from "@/types/domain";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/tuckshop";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface SupplierManagerClientProps {
  suppliers: TuckshopSupplier[];
}

const DAYS: { value: TuckshopDayOfWeek; label: string }[] = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
];

type FormState = {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  delivery_days: TuckshopDayOfWeek[];
};

const EMPTY_FORM: FormState = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  delivery_days: [],
};

export function SupplierManagerClient({
  suppliers,
}: SupplierManagerClientProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    haptics.impact("light");
  }

  function openEdit(supplier: TuckshopSupplier) {
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? "",
      contact_email: supplier.contact_email ?? "",
      contact_phone: supplier.contact_phone ?? "",
      notes: supplier.notes ?? "",
      delivery_days: supplier.delivery_days,
    });
    setEditingId(supplier.id);
    setShowForm(true);
    haptics.impact("light");
  }

  function toggleDay(day: TuckshopDayOfWeek) {
    setForm((f) => ({
      ...f,
      delivery_days: f.delivery_days.includes(day)
        ? f.delivery_days.filter((d) => d !== day)
        : [...f.delivery_days, day],
    }));
    haptics.selection();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.impact("medium");

    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      notes: form.notes || null,
      delivery_days: form.delivery_days,
    };

    startTransition(async () => {
      const result = editingId
        ? await updateSupplier(editingId, payload)
        : await createSupplier(payload);

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

  async function handleDelete(supplierId: string, name: string) {
    if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await deleteSupplier(supplierId);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openCreate}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Add Supplier
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h3
            className="font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {editingId ? "Edit Supplier" : "New Supplier"}
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
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </FormField>
            <FormField label="Contact Name">
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_name: e.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </FormField>
            <FormField label="Contact Email">
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_email: e.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </FormField>
            <FormField label="Contact Phone">
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_phone: e.target.value }))
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </FormField>
          </div>

          <FormField label="Delivery Days">
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className="touch-target active-push rounded-lg px-3 py-1.5 text-sm font-medium"
                  style={{
                    backgroundColor: form.delivery_days.includes(day.value)
                      ? "var(--primary)"
                      : "var(--secondary)",
                    color: form.delivery_days.includes(day.value)
                      ? "var(--primary-foreground)"
                      : "var(--secondary-foreground)",
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </FormField>

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

      {/* Supplier list */}
      {suppliers.length === 0 ? (
        <div className="py-12 text-center">
          <p
            className="font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No suppliers yet
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Add your first tuckshop supplier above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className="font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {supplier.name}
                  </p>
                  {!supplier.is_active && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: "var(--muted)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {supplier.contact_name && `${supplier.contact_name} · `}
                  {supplier.contact_email || supplier.contact_phone || "No contact info"}
                </p>
                {supplier.delivery_days.length > 0 && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Delivers:{" "}
                    {supplier.delivery_days
                      .map(
                        (d) => DAYS.find((dd) => dd.value === d)?.label ?? d,
                      )
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(supplier)}
                  className="touch-target active-push rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{
                    backgroundColor: "var(--secondary)",
                    color: "var(--secondary-foreground)",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  disabled={isPending}
                  className="touch-target active-push rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--destructive-muted, var(--muted))",
                    color: "var(--destructive)",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
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
      <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
