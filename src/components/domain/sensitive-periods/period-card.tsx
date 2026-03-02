"use client";

// src/components/domain/sensitive-periods/period-card.tsx
// ============================================================
// Card for one student sensitive period, showing:
//   - Period name + intensity badge
//   - Linked materials (from junction table) with intro dates
//   - Add/remove material buttons
//   - Recent observation count
//   - Status badge: Active / Ending soon / Past
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addMaterialToSensitivePeriod,
  removeMaterialFromSensitivePeriod,
} from "@/lib/actions/three-period-lessons";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  MontessoriSensitivePeriod,
  SensitivePeriodIntensity,
  SensitivePeriodMaterialWithDetails,
} from "@/types/domain";

// ── Constants ────────────────────────────────────────────────

const PERIOD_LABELS: Record<MontessoriSensitivePeriod, string> = {
  language: "Language",
  order: "Order",
  movement: "Movement",
  small_objects: "Small Objects",
  music: "Music",
  social_behavior: "Social Behaviour",
  reading: "Reading",
  writing: "Writing",
  mathematics: "Mathematics",
  refinement_of_senses: "Refinement of Senses",
};

const PERIOD_EMOJI: Record<MontessoriSensitivePeriod, string> = {
  language: "🗣️",
  order: "📐",
  movement: "🏃",
  small_objects: "🔍",
  music: "🎵",
  social_behavior: "🤝",
  reading: "📖",
  writing: "✏️",
  mathematics: "🔢",
  refinement_of_senses: "👁️",
};

const INTENSITY_STYLES: Record<
  SensitivePeriodIntensity,
  { label: string; bg: string; text: string }
> = {
  emerging: {
    label: "Emerging",
    bg: "var(--muted)",
    text: "var(--muted-foreground)",
  },
  active: {
    label: "Active",
    bg: "var(--info)",
    text: "var(--info-foreground)",
  },
  peak: {
    label: "Peak",
    bg: "var(--success)",
    text: "var(--success-foreground)",
  },
  waning: {
    label: "Waning",
    bg: "var(--warning)",
    text: "var(--warning-foreground)",
  },
};

// ── Types ────────────────────────────────────────────────────

interface AvailableMaterial {
  id: string;
  name: string;
  area: string;
}

interface PeriodCardProps {
  periodId: string;
  sensitivePeriod: MontessoriSensitivePeriod;
  intensity: SensitivePeriodIntensity;
  observedStartDate: string | null;
  observedEndDate: string | null;
  notes: string | null;
  linkedMaterials: SensitivePeriodMaterialWithDetails[];
  recentObservationCount: number;
  /** All materials available to link - passed from server. */
  availableMaterials: AvailableMaterial[];
  /** Whether the current user can manage (add/remove) materials. */
  canManage: boolean;
}

// ── Status helper ────────────────────────────────────────────

function getPeriodStatus(
  endDate: string | null,
): "active" | "ending_soon" | "past" {
  if (endDate) return "past";
  // "ending soon" = no end date but started > 6 weeks ago (heuristic)
  return "active";
}

function StatusDot({ status }: { status: "active" | "ending_soon" | "past" }) {
  if (status === "past")
    return (
      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
        ⚪ Past
      </span>
    );
  if (status === "ending_soon")
    return (
      <span className="text-xs" style={{ color: "var(--warning)" }}>
        🟡 Ending soon
      </span>
    );
  return (
    <span className="text-xs" style={{ color: "var(--success)" }}>
      🟢 Active
    </span>
  );
}

// ── Component ────────────────────────────────────────────────

export function PeriodCard({
  periodId,
  sensitivePeriod,
  intensity,
  observedStartDate,
  observedEndDate,
  notes,
  linkedMaterials,
  recentObservationCount,
  availableMaterials,
  canManage,
}: PeriodCardProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const status = getPeriodStatus(observedEndDate);
  const intensityStyle = INTENSITY_STYLES[intensity];

  // Materials not yet linked
  const linkedIds = new Set(linkedMaterials.map((lm) => lm.material_id));
  const unlinkableMaterials = availableMaterials.filter(
    (m) =>
      !linkedIds.has(m.id) &&
      (materialSearch.trim() === "" ||
        m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
        m.area.toLowerCase().includes(materialSearch.toLowerCase())),
  );

  function handleAddMaterial(materialId: string) {
    haptics.impact("medium");
    setError(null);
    startTransition(async () => {
      const result = await addMaterialToSensitivePeriod(periodId, materialId);
      if (result.error) {
        setError(result.error.message);
      } else {
        setShowAddModal(false);
        setMaterialSearch("");
        router.refresh();
      }
    });
  }

  function handleRemoveMaterial(materialId: string) {
    haptics.impact("light");
    setError(null);
    startTransition(async () => {
      const result = await removeMaterialFromSensitivePeriod(
        periodId,
        materialId,
      );
      if (result.error) {
        setError(result.error.message);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div
      className="rounded-xl border border-border p-4 space-y-3"
      style={{
        opacity: status === "past" ? 0.7 : 1,
        background: "var(--card)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">
            {PERIOD_EMOJI[sensitivePeriod]}
          </span>
          <div className="min-w-0">
            <p
              className="font-medium truncate"
              style={{ color: "var(--foreground)" }}
            >
              {PERIOD_LABELS[sensitivePeriod]}
            </p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: intensityStyle.bg,
                  color: intensityStyle.text,
                }}
              >
                {intensityStyle.label}
              </span>
              <StatusDot status={status} />
            </div>
          </div>
        </div>

        {/* Date range */}
        {observedStartDate && (
          <span
            className="flex-shrink-0 text-xs whitespace-nowrap"
            style={{ color: "var(--muted-foreground)" }}
          >
            {observedStartDate}
            {observedEndDate ? ` → ${observedEndDate}` : " →"}
          </span>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {notes}
        </p>
      )}

      {/* Linked materials */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Linked materials ({linkedMaterials.length})
          </p>
          {canManage && status !== "past" && (
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setError(null);
              }}
              disabled={isPending}
              className="text-xs font-medium"
              style={{ color: "var(--primary)" }}
            >
              + Add
            </button>
          )}
        </div>

        {linkedMaterials.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto scroll-native">
            {linkedMaterials.map((lm) => (
              <div
                key={lm.material_id}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--muted)" }}
              >
                <div className="min-w-0">
                  <span
                    className="truncate font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {lm.material.name}
                  </span>
                  {lm.introduced_date && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Introduced {lm.introduced_date}
                    </span>
                  )}
                </div>
                {canManage && status !== "past" && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMaterial(lm.material_id)}
                    disabled={isPending}
                    className="flex-shrink-0 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-label={`Remove ${lm.material.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-xs italic"
            style={{ color: "var(--muted-foreground)" }}
          >
            No materials linked yet.
          </p>
        )}
      </div>

      {/* Observations count */}
      {recentObservationCount > 0 && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {recentObservationCount} observation
          {recentObservationCount !== 1 ? "s" : ""} tagged
        </p>
      )}

      {/* Inline error */}
      {error && (
        <p className="text-xs" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Add material modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 space-y-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="font-semibold text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Link material to {PERIOD_LABELS[sensitivePeriod]}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              placeholder="Search materials..."
              autoFocus
              className="w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />

            <div className="max-h-64 overflow-y-auto scroll-native space-y-1">
              {unlinkableMaterials.length === 0 ? (
                <p
                  className="py-4 text-center text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {availableMaterials.length === linkedMaterials.length
                    ? "All materials are already linked."
                    : "No materials match your search."}
                </p>
              ) : (
                unlinkableMaterials.slice(0, 40).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleAddMaterial(m.id)}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-primary/10 disabled:opacity-50"
                  >
                    <span
                      className="flex-1 font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {m.name}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {m.area.replace(/_/g, " ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
