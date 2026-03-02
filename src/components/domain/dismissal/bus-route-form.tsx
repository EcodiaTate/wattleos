"use client";

// src/components/domain/dismissal/bus-route-form.tsx
//
// Create / edit bus route form

import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createBusRoute, updateBusRoute } from "@/lib/actions/dismissal";
import type { BusRoute } from "@/types/domain";

const DAYS = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
  { key: "sunday",    label: "Sun" },
] as const;

interface BusRouteFormProps {
  route?: BusRoute;
  onSaved: (route: BusRoute) => void;
  onCancel: () => void;
}

export function BusRouteForm({ route, onSaved, onCancel }: BusRouteFormProps) {
  const haptics = useHaptics();
  const isEdit  = !!route;

  const [routeName, setRouteName]               = useState(route?.route_name ?? "");
  const [operatorName, setOperatorName]         = useState(route?.operator_name ?? "");
  const [vehicleReg, setVehicleReg]             = useState(route?.vehicle_registration ?? "");
  const [driverName, setDriverName]             = useState(route?.driver_name ?? "");
  const [driverPhone, setDriverPhone]           = useState(route?.driver_phone ?? "");
  const [departTime, setDepartTime]             = useState(
    route?.depart_time ? route.depart_time.substring(0, 5) : "",
  );
  const [selectedDays, setSelectedDays]         = useState<string[]>(
    route?.days_of_operation ?? ["monday", "tuesday", "wednesday", "thursday", "friday"],
  );
  const [notes, setNotes]                       = useState(route?.notes ?? "");
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  function toggleDay(day: string) {
    haptics.selection();
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    haptics.impact("medium");

    const input = {
      route_name:            routeName,
      operator_name:         operatorName || null,
      vehicle_registration:  vehicleReg || null,
      driver_name:           driverName || null,
      driver_phone:          driverPhone || null,
      depart_time:           departTime || null,
      days_of_operation:     selectedDays as ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[],
      notes:                 notes || null,
    };

    const result = isEdit
      ? await updateBusRoute(route!.id, input)
      : await createBusRoute(input);

    if (result.error) {
      haptics.error();
      setError(result.error.message);
    } else {
      haptics.success();
      if (result.data) onSaved(result.data);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Route name *
        </label>
        <input
          type="text"
          required
          maxLength={200}
          className="w-full rounded-xl border border-border px-4 py-2.5 text-sm"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          placeholder="e.g. East Side Bus"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Operator / Company
          </label>
          <input
            type="text"
            maxLength={200}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            placeholder="Bus company name"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Vehicle rego
          </label>
          <input
            type="text"
            maxLength={20}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            placeholder="ABC 123"
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Driver name
          </label>
          <input
            type="text"
            maxLength={200}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            value={driverName}
            onChange={(e) => setDriverName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Driver phone
          </label>
          <input
            type="tel"
            maxLength={30}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            value={driverPhone}
            onChange={(e) => setDriverPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Departure time
        </label>
        <input
          type="time"
          className="rounded-xl border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          value={departTime}
          onChange={(e) => setDepartTime(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Days of operation
        </label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="rounded-full px-3 py-1.5 text-sm font-medium active-push touch-target"
              style={{
                backgroundColor: selectedDays.includes(key)
                  ? "var(--primary)"
                  : "var(--muted)",
                color: selectedDays.includes(key)
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
                border: "1px solid var(--border)",
              }}
              onClick={() => toggleDay(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Notes
        </label>
        <textarea
          maxLength={2000}
          rows={3}
          className="w-full rounded-xl border border-border px-4 py-2.5 text-sm resize-none"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          placeholder="Any additional details…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm rounded-lg p-3" style={{ color: "var(--destructive)", backgroundColor: "color-mix(in srgb, var(--destructive) 10%, transparent)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 touch-target rounded-xl px-4 py-3 font-semibold active-push"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving…" : isEdit ? "Update route" : "Add bus route"}
        </button>
        <button
          type="button"
          className="touch-target rounded-xl border border-border px-4 py-3 active-push"
          style={{ color: "var(--muted-foreground)" }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
