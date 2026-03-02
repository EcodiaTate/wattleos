"use client";

// src/components/domain/lessons/sensitive-period-form.tsx
// ============================================================
// Form for recording or updating a Montessori sensitive period
// observation for a student.
// ============================================================

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  closeSensitivePeriod,
  deleteSensitivePeriod,
  getMaterialSuggestions,
  upsertSensitivePeriod,
} from "@/lib/actions/three-period-lessons";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  MontessoriMaterial,
  MontessoriSensitivePeriod,
  SensitivePeriodIntensity,
  Student,
  StudentSensitivePeriod,
} from "@/types/domain";

// ── Period info ───────────────────────────────────────────────

const SENSITIVE_PERIOD_INFO: Record<
  MontessoriSensitivePeriod,
  { label: string; emoji: string; description: string }
> = {
  language: {
    label: "Language",
    emoji: "🗣️",
    description: "Intense absorption of spoken language; birth to ~6 years.",
  },
  order: {
    label: "Order",
    emoji: "📐",
    description:
      "Need for consistency, predictability, and arrangement; ~1.5–4 years.",
  },
  movement: {
    label: "Movement",
    emoji: "🏃",
    description:
      "Developing gross and fine motor coordination; birth to ~2.5 years.",
  },
  small_objects: {
    label: "Small Objects",
    emoji: "🔍",
    description:
      "Fascination with tiny objects and precise manipulation; ~18 months–3 years.",
  },
  music: {
    label: "Music",
    emoji: "🎵",
    description: "Receptivity to pitch, rhythm, and melody; birth to ~6 years.",
  },
  social_behavior: {
    label: "Social Behaviour",
    emoji: "🤝",
    description:
      "Learning social norms and forming relationships; ~2.5–6 years.",
  },
  reading: {
    label: "Reading",
    emoji: "📖",
    description: "Emergence of symbol–sound connections; ~3.5–5.5 years.",
  },
  writing: {
    label: "Writing",
    emoji: "✏️",
    description: "Muscle readiness and letter formation; ~3.5–5 years.",
  },
  mathematics: {
    label: "Mathematics",
    emoji: "🔢",
    description: "Abstract quantity and symbol abstraction; ~4–6 years.",
  },
  refinement_of_senses: {
    label: "Refinement of Senses",
    emoji: "👁️",
    description: "Isolating and discriminating sensory input; ~2–6 years.",
  },
};

const INTENSITY_META: Record<
  SensitivePeriodIntensity,
  { label: string; emoji: string; description: string }
> = {
  emerging: {
    label: "Emerging",
    emoji: "🌱",
    description: "Early signs of the period beginning",
  },
  active: {
    label: "Active",
    emoji: "⚡",
    description: "Clearly observable; child returning repeatedly",
  },
  peak: {
    label: "Peak",
    emoji: "🔥",
    description: "Strongest point - child is highly focused",
  },
  waning: {
    label: "Waning",
    emoji: "🌅",
    description: "Period naturally subsiding",
  },
};

// ── Props ────────────────────────────────────────────────────

interface SensitivePeriodFormProps {
  students: Pick<Student, "id" | "first_name" | "last_name">[];
  materials: Pick<MontessoriMaterial, "id" | "name" | "area">[];
  existing?: StudentSensitivePeriod;
  preSelectedStudentId?: string;
  onSuccess?: () => void;
}

// ── Component ────────────────────────────────────────────────

export function SensitivePeriodForm({
  students,
  materials,
  existing,
  preSelectedStudentId,
  onSuccess,
}: SensitivePeriodFormProps) {
  const router = useRouter();
  const haptics = useHaptics();

  const [studentId, setStudentId] = useState(
    existing?.student_id ?? preSelectedStudentId ?? "",
  );
  const [sensitivePeriod, setSensitivePeriod] = useState<
    MontessoriSensitivePeriod | ""
  >(existing?.sensitive_period ?? "");
  const [intensity, setIntensity] = useState<SensitivePeriodIntensity>(
    existing?.intensity ?? "emerging",
  );
  const [startDate, setStartDate] = useState(
    existing?.observed_start_date ?? "",
  );
  const [endDate, setEndDate] = useState(existing?.observed_end_date ?? "");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(
    existing?.suggested_material_ids ?? [],
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [suggestedMaterials, setSuggestedMaterials] = useState<
    Pick<MontessoriMaterial, "id" | "name" | "area">[]
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const periodInfo = sensitivePeriod
    ? SENSITIVE_PERIOD_INFO[sensitivePeriod]
    : null;

  async function fetchSuggestions(period: MontessoriSensitivePeriod) {
    setLoadingSuggestions(true);
    const result = await getMaterialSuggestions(period);
    setSuggestedMaterials(result.data ?? []);
    setLoadingSuggestions(false);
  }

  // Pre-load suggestions when editing an existing period
  useEffect(() => {
    if (existing?.sensitive_period) {
      void fetchSuggestions(existing.sensitive_period);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMaterial(id: string) {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
    haptics.light();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sensitivePeriod) {
      setError("Please select a sensitive period.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    haptics.medium();

    const result = await upsertSensitivePeriod({
      student_id: studentId,
      sensitive_period: sensitivePeriod,
      intensity,
      observed_start_date: startDate || null,
      observed_end_date: endDate || null,
      suggested_material_ids: selectedMaterialIds,
      notes: notes || null,
    });

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      setIsSubmitting(false);
      return;
    }

    haptics.success();
    if (onSuccess) {
      onSuccess();
    } else {
      router.back();
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setIsSubmitting(true);
    haptics.heavy();
    const result = await deleteSensitivePeriod(existing.id);
    if (result.error) {
      setError(result.error.message);
      haptics.error();
      setIsSubmitting(false);
      return;
    }
    haptics.success();
    if (onSuccess) onSuccess();
    else router.back();
  }

  async function handleClose() {
    if (!existing) return;
    const today = new Date().toISOString().split("T")[0];
    setIsSubmitting(true);
    haptics.medium();
    const result = await closeSensitivePeriod(existing.id, today);
    if (result.error) {
      setError(result.error.message);
      haptics.error();
      setIsSubmitting(false);
      return;
    }
    haptics.success();
    if (onSuccess) onSuccess();
    else router.back();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Student */}
      {!existing && (
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Student
          </label>
          <select
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="touch-target w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sensitive period selector */}
      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Sensitive period
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(
            Object.entries(SENSITIVE_PERIOD_INFO) as [
              MontessoriSensitivePeriod,
              (typeof SENSITIVE_PERIOD_INFO)[MontessoriSensitivePeriod],
            ][]
          ).map(([key, info]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSensitivePeriod(key);
                haptics.light();
                void fetchSuggestions(key);
              }}
              className="active-push flex items-start gap-2 rounded-xl border border-border p-3 text-left transition-all"
              style={
                sensitivePeriod === key
                  ? {
                      borderColor: "var(--primary)",
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : {
                      color: "var(--foreground)",
                    }
              }
            >
              <span className="text-lg leading-none">{info.emoji}</span>
              <div>
                <p className="text-xs font-semibold">{info.label}</p>
              </div>
            </button>
          ))}
        </div>
        {periodInfo && (
          <p
            className="mt-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {periodInfo.description}
          </p>
        )}
      </div>

      {/* Intensity */}
      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Intensity
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            Object.entries(INTENSITY_META) as [
              SensitivePeriodIntensity,
              (typeof INTENSITY_META)[SensitivePeriodIntensity],
            ][]
          ).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setIntensity(key);
                haptics.light();
              }}
              className="active-push flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium transition-all"
              style={
                intensity === key
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                      borderColor: "var(--primary)",
                    }
                  : { color: "var(--foreground)" }
              }
            >
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {INTENSITY_META[intensity].description}
        </p>
      </div>

      {/* Date range */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            First observed (optional)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="touch-target w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Period ended (leave blank if active)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="touch-target w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Suggested materials */}
      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Suggested materials
        </label>

        {!sensitivePeriod && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Select a sensitive period above to see material suggestions.
          </p>
        )}

        {sensitivePeriod && loadingSuggestions && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Loading suggestions…
          </p>
        )}

        {sensitivePeriod &&
          !loadingSuggestions &&
          suggestedMaterials.length === 0 && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              No materials found for this period - use the full list below.
            </p>
          )}

        {sensitivePeriod &&
          !loadingSuggestions &&
          suggestedMaterials.length > 0 && (
            <div className="space-y-1">
              {suggestedMaterials.map((m) => {
                const isSelected = selectedMaterialIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMaterial(m.id)}
                    className="active-push flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                    style={
                      isSelected
                        ? {
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }
                        : { color: "var(--foreground)" }
                    }
                  >
                    <span className="shrink-0">{isSelected ? "✓" : "○"}</span>
                    <span className="flex-1">{m.name}</span>
                    <span
                      className="text-xs capitalize"
                      style={{ opacity: 0.7 }}
                    >
                      {m.area.replace(/_/g, " ")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

        {/* Full material list (materials not already in suggestions) */}
        {sensitivePeriod && materials.length > 0 && (
          <details className="mt-3">
            <summary
              className="cursor-pointer select-none text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              All materials ({materials.length})
            </summary>
            <div className="scroll-native mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {materials
                .filter((m) => !suggestedMaterials.some((s) => s.id === m.id))
                .map((m) => {
                  const isSelected = selectedMaterialIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMaterial(m.id)}
                      className="active-push flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
                      style={
                        isSelected
                          ? {
                              backgroundColor: "var(--primary)",
                              color: "var(--primary-foreground)",
                            }
                          : { color: "var(--foreground)" }
                      }
                    >
                      <span className="shrink-0">{isSelected ? "✓" : "○"}</span>
                      <span className="flex-1">{m.name}</span>
                      <span
                        className="text-xs capitalize"
                        style={{ opacity: 0.7 }}
                      >
                        {m.area.replace(/_/g, " ")}
                      </span>
                    </button>
                  );
                })}
            </div>
          </details>
        )}
      </div>

      {/* Notes */}
      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes (optional)
        </label>
        <textarea
          placeholder="Observations about this sensitive period…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
          style={{ color: "var(--foreground)" }}
        />
      </div>

      {error && (
        <p
          className="rounded-lg p-3 text-sm"
          style={{ color: "var(--destructive)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !studentId || !sensitivePeriod}
          className="active-push touch-target flex-1 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isSubmitting ? "Saving…" : existing ? "Update" : "Record period"}
        </button>

        {existing && !existing.observed_end_date && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="active-push touch-target rounded-xl border border-border px-4 py-3 text-sm font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Close period
          </button>
        )}

        {existing && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowDelete(true)}
            className="active-push touch-target rounded-xl border px-4 py-3 text-sm font-medium"
            style={{
              borderColor: "var(--destructive)",
              color: "var(--destructive)",
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--destructive)" }}
        >
          <p
            className="mb-3 text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Delete this sensitive period record permanently?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="active-push rounded-xl px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--destructive)",
                color: "var(--destructive-foreground, hsl(0 0% 100%))",
              }}
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(false)}
              className="active-push rounded-xl border border-border px-4 py-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
