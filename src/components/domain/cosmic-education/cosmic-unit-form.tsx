"use client";

// src/components/domain/cosmic-education/cosmic-unit-form.tsx
//
// Create / edit form for a cosmic unit plan.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createCosmicUnit,
  updateCosmicUnit,
} from "@/lib/actions/cosmic-education";
import type { CosmicUnit, CosmicGreatLessonRow } from "@/types/domain";

interface Props {
  greatLessons: CosmicGreatLessonRow[];
  unit?: CosmicUnit;
  onSuccess?: (unit: CosmicUnit) => void;
}

export function CosmicUnitForm({ greatLessons, unit, onSuccess }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(unit?.title ?? "");
  const [greatLessonId, setGreatLessonId] = useState(
    unit?.great_lesson_id ?? greatLessons[0]?.id ?? "",
  );
  const [description, setDescription] = useState(unit?.description ?? "");
  const [ageRange, setAgeRange] = useState(unit?.age_range ?? "6-12");
  const [plannedStart, setPlannedStart] = useState(unit?.planned_start ?? "");
  const [plannedEnd, setPlannedEnd] = useState(unit?.planned_end ?? "");
  const [notes, setNotes] = useState(unit?.notes ?? "");
  // key_questions stored as newline-separated text
  const [keyQuestions, setKeyQuestions] = useState(
    (unit?.key_questions ?? []).join("\n"),
  );

  const isEdit = !!unit;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const questions = keyQuestions
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    startTransition(async () => {
      const payload = {
        great_lesson_id: greatLessonId,
        title: title.trim(),
        description: description.trim() || null,
        key_questions: questions,
        age_range: ageRange,
        planned_start: plannedStart || null,
        planned_end: plannedEnd || null,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        const result = await updateCosmicUnit(unit.id, payload);
        if (result.error) {
          haptics.error();
          setError(result.error.message);
          return;
        }
        haptics.success();
        if (onSuccess) onSuccess(result.data!);
        else router.push(`/pedagogy/cosmic-education/units/${unit.id}`);
      } else {
        const result = await createCosmicUnit(payload);
        if (result.error) {
          haptics.error();
          setError(result.error.message);
          return;
        }
        haptics.impact("heavy");
        router.push(`/pedagogy/cosmic-education/units/${result.data!.id}`);
      }
    });
  }

  const fieldClass =
    "w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-offset-1";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg border"
          style={{
            color: "var(--destructive)",
            background: "var(--destructive-bg, hsl(0 60% 97%))",
            borderColor: "var(--destructive)",
          }}
        >
          {error}
        </p>
      )}

      {/* Great Lesson */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Great Lesson <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <select
          value={greatLessonId}
          onChange={(e) => setGreatLessonId(e.target.value)}
          className={fieldClass}
          style={{ background: "var(--input)", color: "var(--foreground)" }}
          required
        >
          {greatLessons.map((gl) => (
            <option key={gl.id} value={gl.id}>
              {gl.title}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Unit Title <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass}
          style={{ background: "var(--input)", color: "var(--foreground)" }}
          placeholder="e.g. Ancient Egypt - Nile Civilisations"
          required
          maxLength={400}
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={fieldClass}
          style={{
            background: "var(--input)",
            color: "var(--foreground)",
            resize: "vertical",
          }}
          placeholder="Overview of this unit and its connections to the Great Lesson…"
          maxLength={6000}
        />
      </div>

      {/* Key Questions */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Key Questions
          <span
            className="ml-1 font-normal text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            (one per line, up to 10)
          </span>
        </label>
        <textarea
          value={keyQuestions}
          onChange={(e) => setKeyQuestions(e.target.value)}
          rows={4}
          className={fieldClass}
          style={{
            background: "var(--input)",
            color: "var(--foreground)",
            resize: "vertical",
          }}
          placeholder={
            "What makes humans different from other animals?\nHow did writing change civilisation?"
          }
        />
      </div>

      {/* Age Range */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Age Range
        </label>
        <input
          type="text"
          value={ageRange}
          onChange={(e) => setAgeRange(e.target.value)}
          className={fieldClass}
          style={{ background: "var(--input)", color: "var(--foreground)" }}
          placeholder="6-12"
          maxLength={20}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={{ color: "var(--foreground)" }}>
            Planned Start
          </label>
          <input
            type="date"
            value={plannedStart}
            onChange={(e) => setPlannedStart(e.target.value)}
            className={fieldClass}
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--foreground)" }}>
            Planned End
          </label>
          <input
            type="date"
            value={plannedEnd}
            onChange={(e) => setPlannedEnd(e.target.value)}
            className={fieldClass}
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={fieldClass}
          style={{
            background: "var(--input)",
            color: "var(--foreground)",
            resize: "vertical",
          }}
          placeholder="Internal planning notes…"
          maxLength={4000}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || !title.trim() || !greatLessonId}
          className="touch-target active-push px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Unit"}
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.impact("light");
            router.back();
          }}
          className="touch-target px-4 py-2 rounded-lg text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
