"use client";

// src/components/domain/excursions/transport-booking-panel.tsx
//
// Transport Booking Notes panel for excursion detail page.
// Renders existing booking in a read-only view with an edit
// toggle. Creates or updates via upsertTransportBooking action.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  upsertTransportBooking,
  deleteTransportBooking,
} from "@/lib/actions/transport-bookings";
import type {
  ExcursionTransportBooking,
  TransportVehicleType,
  TransportPaymentStatus,
} from "@/types/domain";

// ── Constants ────────────────────────────────────────────────

const VEHICLE_LABELS: Record<TransportVehicleType, string> = {
  bus: "Bus",
  minibus: "Minibus",
  coach: "Coach",
  van: "Van",
  car: "Car",
  ferry: "Ferry",
  other: "Other",
};

const PAYMENT_LABELS: Record<TransportPaymentStatus, string> = {
  not_applicable: "N/A",
  pending: "Pending",
  invoiced: "Invoiced",
  paid: "Paid",
};

const PAYMENT_TOKENS: Record<TransportPaymentStatus, string> = {
  not_applicable: "--transport-not-applicable",
  pending: "--transport-pending",
  invoiced: "--transport-invoiced",
  paid: "--transport-paid",
};

// ── Props ────────────────────────────────────────────────────

interface TransportBookingPanelProps {
  excursionId: string;
  booking: ExcursionTransportBooking | null;
  canManage: boolean;
}

// ── Read-only view ────────────────────────────────────────────

function PaymentBadge({ status }: { status: TransportPaymentStatus }) {
  const token = PAYMENT_TOKENS[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `var(${token}-bg)`,
        color: `var(${token}-fg)`,
      }}
    >
      {PAYMENT_LABELS[status]}
    </span>
  );
}

function BookingReadView({
  booking,
  onEdit,
  onDelete,
  canManage,
  deleting,
}: {
  booking: ExcursionTransportBooking;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
  deleting: boolean;
}) {
  const costDisplay =
    booking.total_cost_cents != null
      ? `$${(booking.total_cost_cents / 100).toFixed(2)}`
      : null;

  return (
    <div className="space-y-4">
      {/* Company row */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
          Company / Operator
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {booking.company_name}
        </span>
        <div
          className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {booking.company_phone && <span>📞 {booking.company_phone}</span>}
          {booking.company_email && <span>✉️ {booking.company_email}</span>}
          {booking.booking_reference && <span>Ref: {booking.booking_reference}</span>}
        </div>
      </div>

      {/* Vehicle + Driver grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Vehicle
          </p>
          <p className="text-sm" style={{ color: "var(--foreground)" }}>
            {VEHICLE_LABELS[booking.vehicle_type]}
            {booking.vehicle_registration && ` · ${booking.vehicle_registration}`}
          </p>
          {booking.passenger_capacity && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Capacity: {booking.passenger_capacity}
            </p>
          )}
        </div>

        {(booking.driver_name || booking.driver_phone) && (
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Driver
            </p>
            {booking.driver_name && (
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                {booking.driver_name}
              </p>
            )}
            {booking.driver_phone && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                📞 {booking.driver_phone}
              </p>
            )}
            {booking.driver_licence_number && (
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Licence: {booking.driver_licence_number}
              </p>
            )}
          </div>
        )}

        {costDisplay && (
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Cost
            </p>
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              {costDisplay}
            </p>
            <PaymentBadge status={booking.payment_status} />
            {booking.invoice_number && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                Inv: {booking.invoice_number}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pickup / drop-off */}
      {(booking.pickup_location || booking.dropoff_location) && (
        <div className="grid grid-cols-2 gap-4">
          {booking.pickup_location && (
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Pickup
              </p>
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                {booking.pickup_location}
              </p>
              {booking.pickup_time && (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {booking.pickup_time}
                </p>
              )}
            </div>
          )}
          {booking.dropoff_location && (
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Drop-off
              </p>
              <p className="text-sm" style={{ color: "var(--foreground)" }}>
                {booking.dropoff_location}
              </p>
              {booking.dropoff_time && (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {booking.dropoff_time}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Notes
          </p>
          <p
            className="mt-0.5 whitespace-pre-wrap text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {booking.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onEdit}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="active-push touch-target rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium"
            style={{
              color: "var(--destructive)",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Removing…" : "Remove"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────

interface BookingFormValues {
  company_name: string;
  company_phone: string;
  company_email: string;
  booking_reference: string;
  vehicle_type: TransportVehicleType;
  vehicle_registration: string;
  passenger_capacity: string;
  driver_name: string;
  driver_phone: string;
  driver_licence_number: string;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  dropoff_time: string;
  total_cost_dollars: string;
  payment_status: TransportPaymentStatus;
  invoice_number: string;
  notes: string;
}

function bookingToFormValues(b: ExcursionTransportBooking | null): BookingFormValues {
  return {
    company_name: b?.company_name ?? "",
    company_phone: b?.company_phone ?? "",
    company_email: b?.company_email ?? "",
    booking_reference: b?.booking_reference ?? "",
    vehicle_type: b?.vehicle_type ?? "bus",
    vehicle_registration: b?.vehicle_registration ?? "",
    passenger_capacity: b?.passenger_capacity != null ? String(b.passenger_capacity) : "",
    driver_name: b?.driver_name ?? "",
    driver_phone: b?.driver_phone ?? "",
    driver_licence_number: b?.driver_licence_number ?? "",
    pickup_location: b?.pickup_location ?? "",
    pickup_time: b?.pickup_time ?? "",
    dropoff_location: b?.dropoff_location ?? "",
    dropoff_time: b?.dropoff_time ?? "",
    total_cost_dollars: b?.total_cost_cents != null ? String(b.total_cost_cents / 100) : "",
    payment_status: b?.payment_status ?? "not_applicable",
    invoice_number: b?.invoice_number ?? "",
    notes: b?.notes ?? "",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
      {children}
    </label>
  );
}

function FieldInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm outline-none focus:ring-2"
      style={{
        backgroundColor: "var(--input)",
        color: "var(--foreground)",
      }}
    />
  );
}

function BookingForm({
  excursionId,
  initial,
  onSaved,
  onCancel,
}: {
  excursionId: string;
  initial: ExcursionTransportBooking | null;
  onSaved: (booking: ExcursionTransportBooking) => void;
  onCancel: () => void;
}) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BookingFormValues>(bookingToFormValues(initial));

  function set(field: keyof BookingFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.medium();

    startTransition(async () => {
      const costCents =
        form.total_cost_dollars.trim()
          ? Math.round(parseFloat(form.total_cost_dollars) * 100)
          : null;

      const result = await upsertTransportBooking({
        excursion_id: excursionId,
        company_name: form.company_name,
        company_phone: form.company_phone || null,
        company_email: form.company_email || null,
        booking_reference: form.booking_reference || null,
        vehicle_type: form.vehicle_type,
        vehicle_registration: form.vehicle_registration || null,
        passenger_capacity: form.passenger_capacity
          ? parseInt(form.passenger_capacity, 10)
          : null,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        driver_licence_number: form.driver_licence_number || null,
        pickup_location: form.pickup_location || null,
        pickup_time: form.pickup_time || null,
        dropoff_location: form.dropoff_location || null,
        dropoff_time: form.dropoff_time || null,
        total_cost_cents: costCents ?? null,
        payment_status: form.payment_status,
        invoice_number: form.invoice_number || null,
        notes: form.notes || null,
      });

      if (result.error) {
        haptics.error();
        setError(result.error.message);
        return;
      }

      haptics.success();
      if (result.data) onSaved(result.data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-[var(--radius-sm)] px-3 py-2 text-sm"
           style={{ backgroundColor: "var(--destructive-bg)", color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* ── Company ── */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3"
           style={{ backgroundColor: "var(--muted)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide"
           style={{ color: "var(--muted-foreground)" }}>
          Company / Operator
        </p>
        <div>
          <FieldLabel>Company name *</FieldLabel>
          <FieldInput
            value={form.company_name}
            onChange={(v) => set("company_name", v)}
            placeholder="ABC Coaches Pty Ltd"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Phone</FieldLabel>
            <FieldInput
              value={form.company_phone}
              onChange={(v) => set("company_phone", v)}
              placeholder="02 9000 0000"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <FieldInput
              value={form.company_email}
              onChange={(v) => set("company_email", v)}
              placeholder="bookings@example.com"
              type="email"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Booking reference</FieldLabel>
          <FieldInput
            value={form.booking_reference}
            onChange={(v) => set("booking_reference", v)}
            placeholder="BK-2025-001"
          />
        </div>
      </div>

      {/* ── Vehicle ── */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3"
           style={{ backgroundColor: "var(--muted)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide"
           style={{ color: "var(--muted-foreground)" }}>
          Vehicle
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Vehicle type *</FieldLabel>
            <select
              value={form.vehicle_type}
              onChange={(e) => set("vehicle_type", e.target.value as TransportVehicleType)}
              className="w-full rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
            >
              {(Object.entries(VEHICLE_LABELS) as [TransportVehicleType, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Registration</FieldLabel>
            <FieldInput
              value={form.vehicle_registration}
              onChange={(v) => set("vehicle_registration", v)}
              placeholder="ABC 123"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Passenger capacity</FieldLabel>
          <FieldInput
            value={form.passenger_capacity}
            onChange={(v) => set("passenger_capacity", v)}
            placeholder="48"
            type="number"
          />
        </div>
      </div>

      {/* ── Driver ── */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3"
           style={{ backgroundColor: "var(--muted)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide"
           style={{ color: "var(--muted-foreground)" }}>
          Driver
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Driver name</FieldLabel>
            <FieldInput
              value={form.driver_name}
              onChange={(v) => set("driver_name", v)}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <FieldLabel>Driver phone</FieldLabel>
            <FieldInput
              value={form.driver_phone}
              onChange={(v) => set("driver_phone", v)}
              placeholder="0400 000 000"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Licence number</FieldLabel>
          <FieldInput
            value={form.driver_licence_number}
            onChange={(v) => set("driver_licence_number", v)}
            placeholder="12345678"
          />
        </div>
      </div>

      {/* ── Pickup / Drop-off ── */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3"
           style={{ backgroundColor: "var(--muted)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide"
           style={{ color: "var(--muted-foreground)" }}>
          Pickup &amp; Drop-off
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Pickup location</FieldLabel>
            <FieldInput
              value={form.pickup_location}
              onChange={(v) => set("pickup_location", v)}
              placeholder="School front gate"
            />
          </div>
          <div>
            <FieldLabel>Pickup time</FieldLabel>
            <FieldInput
              value={form.pickup_time}
              onChange={(v) => set("pickup_time", v)}
              placeholder="08:30"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Drop-off location</FieldLabel>
            <FieldInput
              value={form.dropoff_location}
              onChange={(v) => set("dropoff_location", v)}
              placeholder="School front gate"
            />
          </div>
          <div>
            <FieldLabel>Drop-off time</FieldLabel>
            <FieldInput
              value={form.dropoff_time}
              onChange={(v) => set("dropoff_time", v)}
              placeholder="15:00"
            />
          </div>
        </div>
      </div>

      {/* ── Cost ── */}
      <div className="space-y-3 rounded-[var(--radius-md)] border border-border p-3"
           style={{ backgroundColor: "var(--muted)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide"
           style={{ color: "var(--muted-foreground)" }}>
          Cost &amp; Payment
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Total cost ($)</FieldLabel>
            <FieldInput
              value={form.total_cost_dollars}
              onChange={(v) => set("total_cost_dollars", v)}
              placeholder="450.00"
              type="number"
            />
          </div>
          <div>
            <FieldLabel>Payment status</FieldLabel>
            <select
              value={form.payment_status}
              onChange={(e) => set("payment_status", e.target.value as TransportPaymentStatus)}
              className="w-full rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
            >
              {(Object.entries(PAYMENT_LABELS) as [TransportPaymentStatus, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel>Invoice number</FieldLabel>
          <FieldInput
            value={form.invoice_number}
            onChange={(v) => set("invoice_number", v)}
            placeholder="INV-0042"
          />
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <FieldLabel>Notes (special requirements, accessibility, etc.)</FieldLabel>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="e.g. Wheelchair accessible vehicle required. Driver briefed on allergy protocols."
          className="w-full rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* ── Buttons ── */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !form.company_name.trim()}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: isPending || !form.company_name.trim() ? 0.6 : 1,
          }}
        >
          {isPending ? "Saving…" : "Save booking"}
        </button>
        <button
          type="button"
          onClick={() => { haptics.light(); onCancel(); }}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main panel ────────────────────────────────────────────────

export function TransportBookingPanel({
  excursionId,
  booking: initialBooking,
  canManage,
}: TransportBookingPanelProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [booking, setBooking] = useState(initialBooking);
  const [editing, setEditing] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleSaved(saved: ExcursionTransportBooking) {
    setBooking(saved);
    setEditing(false);
    router.refresh();
  }

  function handleDelete() {
    if (!booking) return;
    if (!confirm("Remove transport booking notes?")) return;
    haptics.medium();

    startDeleteTransition(async () => {
      const result = await deleteTransportBooking(booking.id);
      if (result.error) {
        haptics.error();
        setDeleteError(result.error.message);
        return;
      }
      haptics.success();
      setBooking(null);
      router.refresh();
    });
  }

  // ── No booking yet ──────────────────────────────────────────

  if (!booking && !editing) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span
          className="text-3xl"
          style={{ color: "var(--empty-state-icon)" }}
          aria-hidden="true"
        >
          🚌
        </span>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No transport booking added yet.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => { haptics.light(); setEditing(true); }}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Add transport booking
          </button>
        )}
      </div>
    );
  }

  // ── Edit mode ───────────────────────────────────────────────

  if (editing) {
    return (
      <BookingForm
        excursionId={excursionId}
        initial={booking}
        onSaved={handleSaved}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // ── Read mode ───────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {deleteError && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {deleteError}
        </p>
      )}
      <BookingReadView
        booking={booking!}
        onEdit={() => { haptics.light(); setEditing(true); }}
        onDelete={handleDelete}
        canManage={canManage}
        deleting={deleting}
      />
    </div>
  );
}
