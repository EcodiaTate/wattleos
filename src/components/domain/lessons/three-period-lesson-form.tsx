"use client";

// src/components/domain/lessons/three-period-lesson-form.tsx
// ============================================================
// Form to create or update a Three-Period Lesson session.
// Progression gating: Period 2 is enabled only when Period 1
// is completed; Period 3 only when Period 2 is completed.
// ============================================================

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createThreePeriodLesson,
  updateThreePeriodLesson,
} from "@/lib/actions/three-period-lessons";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  MontessoriMaterial,
  Student,
  ThreePeriodLesson,
  ThreePeriodStatus,
} from "@/types/domain";

import { ThreePeriodStatusBadge } from "./three-period-status-badge";

// ── Period config ────────────────────────────────────────────

const PERIOD_META = [
  {
    num: 1 as const,
    title: "Period 1 - Introduction",
    description: '"This is..."',
    detail: "Educator names and demonstrates the concept. The child observes.",
    colorVar: "--3pl-period-1",
  },
  {
    num: 2 as const,
    title: "Period 2 - Association",
    description: '"Show me..."',
    detail:
      "Ask the child to identify or select the concept. Child recognises.",
    colorVar: "--3pl-period-2",
  },
  {
    num: 3 as const,
    title: "Period 3 - Recall",
    description: '"What is this?"',
    detail: "Child names the concept independently. Confirms internalisation.",
    colorVar: "--3pl-period-3",
  },
] as const;

// ── Props ────────────────────────────────────────────────────

interface ThreePeriodLessonFormProps {
  students: Pick<Student, "id" | "first_name" | "last_name">[];
  materials: Pick<MontessoriMaterial, "id" | "name" | "area" | "age_level">[];
  existing?: ThreePeriodLesson;
  preSelectedStudentId?: string;
  preSelectedMaterialId?: string;
  onSuccess?: (lesson: ThreePeriodLesson) => void;
}

type PeriodState = {
  status: ThreePeriodStatus;
  notes: string;
};

// ── Component ────────────────────────────────────────────────

export function ThreePeriodLessonForm({
  students,
  materials,
  existing,
  preSelectedStudentId,
  preSelectedMaterialId,
  onSuccess,
}: ThreePeriodLessonFormProps) {
  const router = useRouter();
  const haptics = useHaptics();

  const [studentId, setStudentId] = useState(
    existing?.student_id ?? preSelectedStudentId ?? "",
  );
  const [materialId, setMaterialId] = useState(
    existing?.material_id ?? preSelectedMaterialId ?? "",
  );
  const [lessonDate, setLessonDate] = useState(
    existing?.lesson_date ?? new Date().toISOString().split("T")[0],
  );
  const [sessionNotes, setSessionNotes] = useState(
    existing?.session_notes ?? "",
  );

  const [periods, setPeriods] = useState<PeriodState[]>([
    {
      status: existing?.period_1_status ?? "not_started",
      notes: existing?.period_1_notes ?? "",
    },
    {
      status: existing?.period_2_status ?? "not_started",
      notes: existing?.period_2_notes ?? "",
    },
    {
      status: existing?.period_3_status ?? "not_started",
      notes: existing?.period_3_notes ?? "",
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Area filter for materials
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const AREAS = [
    { id: "all", label: "All" },
    { id: "practical_life", label: "Practical Life" },
    { id: "sensorial", label: "Sensorial" },
    { id: "language", label: "Language" },
    { id: "mathematics", label: "Mathematics" },
    { id: "cultural", label: "Cultural" },
  ];

  const filteredMaterials =
    areaFilter === "all"
      ? materials
      : materials.filter((m) => m.area === areaFilter);

  // Progression gating: is period N available to change?
  function isPeriodEnabled(periodIndex: number) {
    if (periodIndex === 0) return true;
    return periods[periodIndex - 1].status === "completed";
  }

  function updatePeriod(
    index: number,
    field: keyof PeriodState,
    value: string,
  ) {
    setPeriods((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // If a period moves away from completed, reset all subsequent periods
      if (field === "status" && value !== "completed") {
        for (let i = index + 1; i < 3; i++) {
          next[i] = { status: "not_started", notes: "" };
        }
      }
      return next;
    });
    haptics.light();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    haptics.medium();

    const payload = {
      period_1_status: periods[0].status,
      period_1_notes: periods[0].notes || null,
      period_2_status: periods[1].status,
      period_2_notes: periods[1].notes || null,
      period_3_status: periods[2].status,
      period_3_notes: periods[2].notes || null,
      session_notes: sessionNotes || null,
    };

    let result;
    if (existing) {
      result = await updateThreePeriodLesson(existing.id, payload);
    } else {
      result = await createThreePeriodLesson({
        student_id: studentId,
        material_id: materialId,
        lesson_date: lessonDate,
        ...payload,
      });
    }

    if (result.error) {
      setError(result.error.message);
      haptics.error();
      setIsSubmitting(false);
      return;
    }

    haptics.success();
    if (onSuccess) {
      onSuccess(result.data!);
    } else {
      router.push("/pedagogy/three-period-lessons");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student + Material + Date */}
      {!existing && (
        <div className="grid gap-4 sm:grid-cols-2">
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

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Lesson date
            </label>
            <input
              type="date"
              required
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className="touch-target w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </div>
      )}

      {!existing && (
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Material
          </label>

          {/* Area tabs */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => {
                  setAreaFilter(area.id);
                  haptics.light();
                }}
                className="active-push rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={
                  areaFilter === area.id
                    ? {
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }
                    : {
                        backgroundColor: "var(--muted)",
                        color: "var(--muted-foreground)",
                      }
                }
              >
                {area.label}
              </button>
            ))}
          </div>

          <select
            required
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="touch-target w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            <option value="">Select material…</option>
            {filteredMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Three periods */}
      <div className="space-y-4">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Three-Period Lesson Stages
        </h3>

        {PERIOD_META.map((meta, idx) => {
          const enabled = isPeriodEnabled(idx);
          const period = periods[idx];

          return (
            <div
              key={meta.num}
              className="rounded-xl border border-border p-4 transition-opacity"
              style={{
                opacity: enabled ? 1 : 0.45,
                borderLeft: `3px solid var(${meta.colorVar})`,
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: `var(${meta.colorVar})` }}
                    >
                      {meta.title}
                    </span>
                    <ThreePeriodStatusBadge status={period.status} size="sm" />
                  </div>
                  <p
                    className="mt-0.5 text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {meta.description}
                  </p>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {meta.detail}
                  </p>
                </div>
              </div>

              {/* Status selector */}
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  [
                    "not_started",
                    "completed",
                    "needs_repeat",
                  ] as ThreePeriodStatus[]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!enabled}
                    onClick={() => updatePeriod(idx, "status", s)}
                    className="active-push rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={
                      period.status === s
                        ? {
                            backgroundColor:
                              s === "completed"
                                ? "var(--3pl-completed)"
                                : s === "needs_repeat"
                                  ? "var(--3pl-needs-repeat)"
                                  : "var(--3pl-not-started)",
                            color:
                              s === "completed"
                                ? "var(--3pl-completed-fg)"
                                : s === "needs_repeat"
                                  ? "var(--3pl-needs-repeat-fg)"
                                  : "var(--3pl-not-started-fg)",
                          }
                        : {
                            backgroundColor: "var(--muted)",
                            color: "var(--muted-foreground)",
                          }
                    }
                  >
                    {s === "not_started"
                      ? "Not started"
                      : s === "completed"
                        ? "Completed ✓"
                        : "Needs repeat"}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <textarea
                disabled={!enabled}
                placeholder={`Notes for Period ${meta.num}…`}
                value={period.notes}
                onChange={(e) => updatePeriod(idx, "notes", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                style={{ color: "var(--foreground)" }}
              />
            </div>
          );
        })}
      </div>

      {/* Session notes */}
      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Session notes (optional)
        </label>
        <textarea
          placeholder="Overall observations for this session…"
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
          style={{ color: "var(--foreground)" }}
        />
      </div>

      {error && (
        <p
          className="rounded-lg p-3 text-sm"
          style={{
            color: "var(--destructive)",
            backgroundColor: "var(--destructive-muted, hsl(0 65% 97%))",
          }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || (!existing && (!studentId || !materialId))}
          className="active-push touch-target flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isSubmitting
            ? "Saving…"
            : existing
              ? "Update lesson"
              : "Record lesson"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-xl border border-border px-5 py-3 text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
