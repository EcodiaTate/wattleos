"use client";

// src/components/domain/dismissal/dismissal-setup-client.tsx
//
// Per-student dismissal method setup: configure default method and
// day-specific overrides, plus manage pickup authorizations.

import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { setStudentDismissalMethod } from "@/lib/actions/dismissal";
import type {
  BusRoute,
  DismissalMethod,
  StudentDismissalMethodWithRoute,
  StudentDismissalSetup,
} from "@/types/domain";
import { DismissalMethodBadge } from "./dismissal-status-badge";
import { PickupAuthorizationList } from "./pickup-authorization-list";

const METHOD_OPTIONS: { value: DismissalMethod; label: string; emoji: string }[] = [
  { value: "parent_pickup", label: "Parent / Guardian pickup", emoji: "👤" },
  { value: "bus",           label: "Bus",                      emoji: "🚌" },
  { value: "oshc",          label: "OSHC",                     emoji: "🏫" },
  { value: "walker",        label: "Walker",                   emoji: "🚶" },
  { value: "other",         label: "Other",                    emoji: "📋" },
];

const DAY_CONFIG: { key: string; label: string }[] = [
  { key: "default",   label: "Default (all days)" },
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
];

interface DismissalSetupClientProps {
  setup: StudentDismissalSetup;
  busRoutes: BusRoute[];
  canManage: boolean;
}

export function DismissalSetupClient({
  setup,
  busRoutes,
  canManage,
}: DismissalSetupClientProps) {
  const haptics = useHaptics();
  const [editDay, setEditDay]         = useState<string | null>(null);
  const [method, setMethod]           = useState<DismissalMethod>("parent_pickup");
  const [busRouteId, setBusRouteId]   = useState<string>("");
  const [notes, setNotes]             = useState<string>("");
  const [methods, setMethods]         = useState(setup.methods);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function getMethodForDay(dayKey: string) {
    return methods.find((m) => m.day_of_week === dayKey);
  }

  function openEdit(dayKey: string) {
    haptics.selection();
    const existing = getMethodForDay(dayKey);
    setMethod((existing?.dismissal_method as DismissalMethod) ?? "parent_pickup");
    setBusRouteId(existing?.bus_route_id ?? "");
    setNotes(existing?.notes ?? "");
    setEditDay(dayKey);
    setError(null);
  }

  async function handleSave() {
    if (!editDay) return;
    setLoading(true);
    setError(null);
    haptics.impact("medium");

    const result = await setStudentDismissalMethod({
      student_id:       setup.student.id,
      day_of_week:      editDay as "default" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday",
      dismissal_method: method,
      bus_route_id:     method === "bus" ? busRouteId || null : null,
      notes:            notes || null,
    });

    if (result.error) {
      haptics.error();
      setError(result.error.message);
    } else {
      haptics.success();
      if (result.data) {
        const saved: StudentDismissalMethodWithRoute = { ...result.data, bus_route: null };
        setMethods((prev) => {
          const idx = prev.findIndex((m) => m.day_of_week === editDay);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = saved;
            return updated;
          }
          return [...prev, saved];
        });
      }
      setEditDay(null);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* ── Student header ── */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold"
          style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          {setup.student.first_name[0]}{setup.student.last_name[0]}
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
            {setup.student.first_name} {setup.student.last_name}
          </h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Dismissal preferences & pickup authorizations
          </p>
        </div>
      </div>

      {/* ── Dismissal method by day ── */}
      <div className="space-y-3">
        <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
          Dismissal method
        </h3>

        {error && (
          <p className="text-sm p-3 rounded-lg" style={{ color: "var(--destructive)", backgroundColor: "color-mix(in srgb, var(--destructive) 10%, transparent)" }}>
            {error}
          </p>
        )}

        <div className="space-y-2">
          {DAY_CONFIG.map(({ key, label }) => {
            const existing = getMethodForDay(key);
            const isEditing = editDay === key;

            return (
              <div
                key={key}
                className="rounded-xl border border-border overflow-hidden"
                style={{ backgroundColor: "var(--background)" }}
              >
                {/* Row header */}
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-28" style={{ color: "var(--foreground)" }}>
                      {label}
                    </span>
                    {existing ? (
                      <DismissalMethodBadge
                        method={existing.dismissal_method as DismissalMethod}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        Not set
                      </span>
                    )}
                  </div>
                  {canManage && !isEditing && (
                    <button
                      type="button"
                      className="touch-target text-xs rounded-lg border border-border px-3 py-1.5 active-push"
                      style={{ color: "var(--foreground)" }}
                      onClick={() => openEdit(key)}
                    >
                      {existing ? "Change" : "Set"}
                    </button>
                  )}
                </div>

                {/* Edit form */}
                {isEditing && (
                  <div className="border-t border-border p-3 space-y-3" style={{ backgroundColor: "var(--muted)" }}>
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>
                        Method
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {METHOD_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="touch-target rounded-lg border px-3 py-2 text-xs font-medium active-push text-left"
                            style={{
                              backgroundColor:
                                method === opt.value
                                  ? `var(--dismissal-${opt.value.replace("_", "-")}-bg)`
                                  : "var(--background)",
                              color:
                                method === opt.value
                                  ? `var(--dismissal-${opt.value.replace("_", "-")}-fg)`
                                  : "var(--muted-foreground)",
                              borderColor:
                                method === opt.value
                                  ? `var(--dismissal-${opt.value.replace("_", "-")})`
                                  : "var(--border)",
                            }}
                            onClick={() => {
                              haptics.selection();
                              setMethod(opt.value);
                            }}
                          >
                            {opt.emoji} {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {method === "bus" && busRoutes.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                          Bus route
                        </label>
                        <select
                          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                          value={busRouteId}
                          onChange={(e) => setBusRouteId(e.target.value)}
                        >
                          <option value="">Select route…</option>
                          {busRoutes.filter((r) => r.is_active).map((r) => (
                            <option key={r.id} value={r.id}>{r.route_name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        maxLength={500}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        className="flex-1 touch-target rounded-lg px-3 py-2 text-sm font-medium active-push"
                        style={{
                          backgroundColor: "var(--primary)",
                          color: "var(--primary-foreground)",
                          opacity: loading ? 0.6 : 1,
                        }}
                        onClick={handleSave}
                      >
                        {loading ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="touch-target rounded-lg border border-border px-3 py-2 text-sm active-push"
                        style={{ color: "var(--muted-foreground)" }}
                        onClick={() => { setEditDay(null); setError(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pickup authorizations ── */}
      <div className="rounded-2xl border border-border p-5" style={{ backgroundColor: "var(--background)" }}>
        <PickupAuthorizationList
          studentId={setup.student.id}
          initialAuthorizations={setup.authorizations}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
