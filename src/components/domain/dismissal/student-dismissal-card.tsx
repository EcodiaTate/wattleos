"use client";

// src/components/domain/dismissal/student-dismissal-card.tsx
//
// Per-student card used in the end-of-day dismissal dashboard.
// Staff tap the card to confirm a dismissal or flag an exception.

import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { confirmDismissal, flagDismissalException } from "@/lib/actions/dismissal";
import type {
  BusRoute,
  DismissalMethod,
  DismissalRecordWithStudent,
  PickupAuthorization,
} from "@/types/domain";
import { DismissalMethodBadge, DismissalStatusBadge } from "./dismissal-status-badge";

// ─── Exception reason labels ─────────────────────────────────

const EXCEPTION_LABELS: Record<string, string> = {
  not_collected:    "Not collected",
  unknown_person:   "Unknown person",
  late_pickup:      "Late pickup",
  refused_collection: "Refused collection",
  bus_no_show:      "Bus no-show",
  other:            "Other",
};

// ─── Component ───────────────────────────────────────────────

interface StudentDismissalCardProps {
  record: DismissalRecordWithStudent;
  busRoutes: BusRoute[];
  pickupAuthorizations: PickupAuthorization[];
  onUpdate: () => void;
  canManage: boolean;
}

export function StudentDismissalCard({
  record,
  busRoutes,
  pickupAuthorizations,
  onUpdate,
  canManage,
}: StudentDismissalCardProps) {
  const haptics = useHaptics();
  const [expanded, setExpanded] = useState(false);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Confirm form state
  const [actualMethod, setActualMethod]         = useState(
    record.actual_method ?? record.expected_method ?? "parent_pickup",
  );
  const [collectedByName, setCollectedByName]   = useState(record.collected_by_name ?? "");
  const [selectedAuthId, setSelectedAuthId]     = useState(record.authorization_id ?? "");
  const [selectedBusId, setSelectedBusId]       = useState(record.bus_route_id ?? "");
  const [confirmNotes, setConfirmNotes]         = useState(record.notes ?? "");

  // Exception form state
  const [exceptionReason, setExceptionReason]   = useState("");
  const [exceptionNotes, setExceptionNotes]     = useState("");

  const student = record.student;
  const fullName = `${student.first_name} ${student.last_name}`;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    haptics.impact("medium");

    const result = await confirmDismissal({
      student_id:       student.id,
      dismissal_date:   record.dismissal_date,
      actual_method:    actualMethod as "parent_pickup" | "bus" | "oshc" | "walker" | "other",
      bus_route_id:     actualMethod === "bus" ? selectedBusId || null : null,
      authorization_id: actualMethod === "parent_pickup" ? selectedAuthId || null : null,
      collected_by_name: collectedByName || null,
      notes:            confirmNotes || null,
    });

    if (result.error) {
      haptics.impact("heavy");
      setError(result.error.message);
    } else {
      haptics.success();
      setShowConfirmForm(false);
      onUpdate();
    }
    setLoading(false);
  }

  async function handleException() {
    if (!exceptionReason) {
      setError("Please select an exception reason");
      return;
    }
    setLoading(true);
    setError(null);
    haptics.impact("heavy");

    const result = await flagDismissalException({
      student_id:      student.id,
      dismissal_date:  record.dismissal_date,
      exception_reason: exceptionReason as "not_collected" | "unknown_person" | "late_pickup" | "refused_collection" | "bus_no_show" | "other",
      exception_notes: exceptionNotes || null,
    });

    if (result.error) {
      setError(result.error.message);
    } else {
      haptics.success();
      setShowExceptionForm(false);
      onUpdate();
    }
    setLoading(false);
  }

  // ── Status-based border accent ────────────────────────────
  const borderAccent =
    record.status === "confirmed"
      ? "var(--dismissal-confirmed)"
      : record.status === "exception"
      ? "var(--dismissal-exception)"
      : "var(--border)";

  return (
    <div
      className="card-interactive rounded-xl border border-border overflow-hidden"
      style={{ borderLeftWidth: "4px", borderLeftColor: borderAccent }}
    >
      {/* ── Card header: student name + status ── */}
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 p-4 text-left active-push touch-target"
        onClick={() => {
          haptics.selection();
          setExpanded((e) => !e);
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar initials */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: "var(--foreground)" }}>
              {fullName}
            </p>
            {record.expected_method && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Expected: {record.expected_method.replace("_", " ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {record.actual_method && record.status !== "exception" && (
            <DismissalMethodBadge method={record.actual_method} size="sm" />
          )}
          <DismissalStatusBadge status={record.status} size="sm" />
          <span style={{ color: "var(--muted-foreground)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">

          {/* Exception detail */}
          {record.status === "exception" && record.exception_reason && (
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                backgroundColor: "var(--dismissal-exception-bg)",
                color: "var(--dismissal-exception-fg)",
              }}
            >
              <p className="font-medium">
                ⚠️ {EXCEPTION_LABELS[record.exception_reason] ?? record.exception_reason}
              </p>
              {record.exception_notes && (
                <p className="mt-1 opacity-80">{record.exception_notes}</p>
              )}
            </div>
          )}

          {/* Confirmed detail */}
          {record.status === "confirmed" && (
            <div className="text-sm space-y-1" style={{ color: "var(--muted-foreground)" }}>
              {record.collected_by_name && (
                <p>Collected by: <span style={{ color: "var(--foreground)" }}>{record.collected_by_name}</span></p>
              )}
              {record.pickup_authorization && (
                <p>Authorised: <span style={{ color: "var(--foreground)" }}>
                  {record.pickup_authorization.authorized_name}
                  {record.pickup_authorization.relationship && ` (${record.pickup_authorization.relationship})`}
                </span></p>
              )}
              {record.bus_route && (
                <p>Bus: <span style={{ color: "var(--foreground)" }}>{record.bus_route.route_name}</span></p>
              )}
              {record.confirmer && (
                <p>Confirmed by: <span style={{ color: "var(--foreground)" }}>
                  {record.confirmer.first_name} {record.confirmer.last_name}
                </span></p>
              )}
              {record.notes && <p className="italic">{record.notes}</p>}
            </div>
          )}

          {error && (
            <p className="text-sm rounded-lg p-2" style={{ color: "var(--destructive)", backgroundColor: "var(--destructive-bg, color-mix(in srgb, var(--destructive) 10%, transparent))" }}>
              {error}
            </p>
          )}

          {/* Action buttons (only for staff with manage permission) */}
          {canManage && !showConfirmForm && !showExceptionForm && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className="flex-1 touch-target rounded-lg px-3 py-2 text-sm font-medium active-push"
                style={{
                  backgroundColor: "var(--dismissal-confirmed-bg)",
                  color: "var(--dismissal-confirmed-fg)",
                  border: "1px solid var(--dismissal-confirmed)",
                }}
                onClick={() => {
                  haptics.selection();
                  setShowConfirmForm(true);
                  setShowExceptionForm(false);
                  setError(null);
                }}
              >
                ✓ {record.status === "confirmed" ? "Update" : "Confirm"}
              </button>
              <button
                type="button"
                className="touch-target rounded-lg px-3 py-2 text-sm font-medium active-push"
                style={{
                  backgroundColor: "var(--dismissal-exception-bg)",
                  color: "var(--dismissal-exception-fg)",
                  border: "1px solid var(--dismissal-exception)",
                }}
                onClick={() => {
                  haptics.selection();
                  setShowExceptionForm(true);
                  setShowConfirmForm(false);
                  setError(null);
                }}
              >
                ⚠ Exception
              </button>
            </div>
          )}

          {/* Confirm form */}
          {showConfirmForm && canManage && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Dismissal method
                </label>
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  value={actualMethod}
                  onChange={(e) => setActualMethod(e.target.value as DismissalMethod)}
                >
                  <option value="parent_pickup">Parent / Guardian pickup</option>
                  <option value="bus">Bus</option>
                  <option value="oshc">OSHC</option>
                  <option value="walker">Walker</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {actualMethod === "bus" && busRoutes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                    Bus route
                  </label>
                  <select
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                  >
                    <option value="">Select route…</option>
                    {busRoutes.map((r) => (
                      <option key={r.id} value={r.id}>{r.route_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {actualMethod === "parent_pickup" && pickupAuthorizations.length > 0 && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                    Authorised person (optional)
                  </label>
                  <select
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                    value={selectedAuthId}
                    onChange={(e) => setSelectedAuthId(e.target.value)}
                  >
                    <option value="">Parent / Guardian (no record)</option>
                    {pickupAuthorizations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.authorized_name}{a.relationship ? ` (${a.relationship})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Collected by name (optional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  placeholder="e.g. Sarah Johnson"
                  value={collectedByName}
                  onChange={(e) => setCollectedByName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Notes (optional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  rows={2}
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
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
                  onClick={handleConfirm}
                >
                  {loading ? "Saving…" : "Confirm dismissal"}
                </button>
                <button
                  type="button"
                  className="touch-target rounded-lg border border-border px-3 py-2 text-sm active-push"
                  style={{ color: "var(--muted-foreground)" }}
                  onClick={() => { setShowConfirmForm(false); setError(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Exception form */}
          {showExceptionForm && canManage && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Exception reason *
                </label>
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                >
                  <option value="">Select reason…</option>
                  {Object.entries(EXCEPTION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  Notes (optional)
                </label>
                <textarea
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  rows={3}
                  placeholder="Describe what happened…"
                  value={exceptionNotes}
                  onChange={(e) => setExceptionNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  className="flex-1 touch-target rounded-lg px-3 py-2 text-sm font-medium active-push"
                  style={{
                    backgroundColor: "var(--dismissal-exception-bg)",
                    color: "var(--dismissal-exception-fg)",
                    border: "1px solid var(--dismissal-exception)",
                    opacity: loading ? 0.6 : 1,
                  }}
                  onClick={handleException}
                >
                  {loading ? "Saving…" : "Flag exception"}
                </button>
                <button
                  type="button"
                  className="touch-target rounded-lg border border-border px-3 py-2 text-sm active-push"
                  style={{ color: "var(--muted-foreground)" }}
                  onClick={() => { setShowExceptionForm(false); setError(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
