"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { recordHeadcount } from "@/lib/actions/excursions";
import type { ExcursionHeadcount } from "@/types/domain";

interface HeadcountRecorderProps {
  excursionId: string;
  /** All students attending this excursion */
  students: { id: string; name: string }[];
  /** Previously recorded headcounts */
  headcounts: ExcursionHeadcount[];
  canManage: boolean;
}

export function HeadcountRecorder({
  excursionId,
  students,
  headcounts,
  canManage,
}: HeadcountRecorderProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Start with all students selected (typical case: everyone is present)
  const [selected, setSelected] = useState<Set<string>>(
    new Set(students.map((s) => s.id)),
  );
  const [locationNote, setLocationNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  function toggleStudent(id: string) {
    haptics.selection();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    haptics.light();
    setSelected(new Set(students.map((s) => s.id)));
  }

  function deselectAll() {
    haptics.light();
    setSelected(new Set());
  }

  function handleRecord() {
    setError(null);
    startTransition(async () => {
      const result = await recordHeadcount({
        excursion_id: excursionId,
        student_ids_present: Array.from(selected),
        location_note: locationNote || undefined,
      });

      if (result.error) {
        setError(result.error.message ?? "Failed to record headcount");
        haptics.error();
        return;
      }

      haptics.heavy();
      setShowForm(false);
      setLocationNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Previous headcounts */}
      {headcounts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            Previous Headcounts
          </h4>
          {headcounts.map((hc) => (
            <div
              key={hc.id}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2"
              style={{ background: "var(--card)" }}
            >
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {hc.count}/{students.length} present
                </span>
                {hc.location_note && (
                  <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    at {hc.location_note}
                  </span>
                )}
              </div>
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {new Date(hc.recorded_at).toLocaleTimeString("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* New headcount form */}
      {canManage && !showForm && (
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            setShowForm(true);
          }}
          className="active-push touch-target w-full rounded-[var(--radius-md)] border-2 border-dashed px-4 py-3 text-sm font-semibold transition-colors"
          style={{
            borderColor: "var(--primary)",
            color: "var(--primary)",
          }}
        >
          Record Headcount (Reg 102)
        </button>
      )}

      {showForm && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4 space-y-4"
          style={{ background: "var(--card)" }}
        >
          {error && (
            <div
              className="rounded-[var(--radius-md)] border p-2 text-xs"
              style={{
                borderColor: "var(--destructive)",
                background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
                color: "var(--destructive)",
              }}
            >
              {error}
            </div>
          )}

          {/* Count summary */}
          <div className="flex items-center justify-between">
            <div>
              <span
                className="text-2xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {selected.size}
              </span>
              <span
                className="text-sm ml-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                / {students.length} present
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-medium"
                style={{ color: "var(--primary)" }}
              >
                All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                None
              </button>
            </div>
          </div>

          {/* Student tap grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto scroll-native">
            {students.map((student) => {
              const isPresent = selected.has(student.id);
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => toggleStudent(student.id)}
                  className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2.5 text-left text-xs font-medium transition-colors"
                  style={{
                    borderColor: isPresent ? "var(--success)" : "var(--border)",
                    background: isPresent
                      ? "color-mix(in srgb, var(--success) 12%, transparent)"
                      : "transparent",
                    color: isPresent ? "var(--success)" : "var(--muted-foreground)",
                  }}
                >
                  {student.name}
                </button>
              );
            })}
          </div>

          {/* Missing students warning */}
          {selected.size < students.length && (
            <div
              className="rounded-[var(--radius-md)] border p-2 text-xs"
              style={{
                borderColor: "var(--warning)",
                background: "color-mix(in srgb, var(--warning) 8%, transparent)",
                color: "var(--warning)",
              }}
            >
              {students.length - selected.size} student
              {students.length - selected.size !== 1 ? "s" : ""} not accounted for
            </div>
          )}

          {/* Location note */}
          <input
            type="text"
            value={locationNote}
            onChange={(e) => setLocationNote(e.target.value)}
            placeholder="Location note (optional)"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                haptics.light();
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRecord}
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Recording..." : "Record Headcount"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
