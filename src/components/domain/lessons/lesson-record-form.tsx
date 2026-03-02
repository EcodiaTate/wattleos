"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createLessonRecord } from "@/lib/actions/lesson-tracking";
import type { MontessoriMaterial, MontessoriArea } from "@/types/domain";
import type { CreateLessonRecordInput } from "@/lib/validations/lessons";

interface LessonRecordFormProps {
  students: { id: string; name: string }[];
  materials: MontessoriMaterial[];
}

const STAGES = [
  { value: "introduction", label: "Introduction" },
  { value: "practice", label: "Practice" },
  { value: "mastery", label: "Mastery" },
] as const;

const RESPONSES = [
  { value: "engaged", label: "Engaged" },
  { value: "struggled", label: "Struggled" },
  { value: "not_ready", label: "Not Ready" },
  { value: "mastered", label: "Mastered" },
  { value: "other", label: "Other" },
] as const;

const AREA_LABELS: Record<MontessoriArea, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

export function LessonRecordForm({
  students,
  materials,
}: LessonRecordFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [stage, setStage] = useState<string>("introduction");
  const [childResponse, setChildResponse] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Area filter for material picker
  const [areaFilter, setAreaFilter] = useState<MontessoriArea | "all">("all");
  const filteredMaterials =
    areaFilter === "all"
      ? materials
      : materials.filter((m) => m.area === areaFilter);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: CreateLessonRecordInput = {
      student_id: studentId,
      material_id: materialId,
      presentation_date: date,
      stage: stage as CreateLessonRecordInput["stage"],
      child_response: childResponse
        ? (childResponse as CreateLessonRecordInput["child_response"])
        : undefined,
      notes: notes || undefined,
    };

    startTransition(async () => {
      const result = await createLessonRecord(input);
      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/pedagogy/lessons");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Student + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Student *
          </label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Date *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Material picker */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Material *
        </label>
        <div className="flex gap-1 overflow-x-auto pb-1 scroll-native">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setAreaFilter("all");
            }}
            className="active-push flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background:
                areaFilter === "all" ? "var(--primary)" : "var(--muted)",
              color:
                areaFilter === "all"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            All
          </button>
          {(Object.entries(AREA_LABELS) as [MontessoriArea, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  haptics.light();
                  setAreaFilter(key);
                }}
                className="active-push flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background:
                    areaFilter === key ? "var(--primary)" : "var(--muted)",
                  color:
                    areaFilter === key
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <select
          value={materialId}
          onChange={(e) => {
            haptics.selection();
            setMaterialId(e.target.value);
          }}
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="">Select material...</option>
          {filteredMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {AREA_LABELS[m.area]} - {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stage + Response */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Stage *
          </label>
          <div className="flex gap-2">
            {STAGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setStage(s.value);
                }}
                className="active-push flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  borderColor:
                    stage === s.value ? "var(--primary)" : "var(--border)",
                  background:
                    stage === s.value ? "var(--primary)" : "transparent",
                  color:
                    stage === s.value
                      ? "var(--primary-foreground)"
                      : "var(--foreground)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Child Response
          </label>
          <select
            value={childResponse}
            onChange={(e) => setChildResponse(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">Not recorded</option>
            {RESPONSES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations about the child's engagement..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Saving..." : "Record Lesson"}
        </button>
      </div>
    </form>
  );
}
