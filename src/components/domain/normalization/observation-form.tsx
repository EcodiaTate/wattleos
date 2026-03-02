"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { RatingInput } from "./rating-input";
import { INDICATOR_CONFIG, WORK_CYCLE_ENGAGEMENT_CONFIG, SELF_DIRECTION_CONFIG } from "@/lib/constants/normalization";
import { createNormalizationObservation, updateNormalizationObservation } from "@/lib/actions/normalization";
import type { NormalizationObservation, WorkCycleEngagement, SelfDirectionLevel } from "@/types/domain";

interface ObservationFormProps {
  students: Array<{ id: string; first_name: string; last_name: string; preferred_name: string | null }>;
  classes: Array<{ id: string; name: string }>;
  existingObservation?: NormalizationObservation | null;
}

export function ObservationForm({ students, classes, existingObservation }: ObservationFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!existingObservation;

  const [studentId, setStudentId] = useState(existingObservation?.student_id ?? "");
  const [classId, setClassId] = useState(existingObservation?.class_id ?? "");
  const [observationDate, setObservationDate] = useState(
    existingObservation?.observation_date ?? new Date().toISOString().split("T")[0],
  );

  const [concentrationRating, setConcentrationRating] = useState(existingObservation?.concentration_rating ?? 3);
  const [concentrationDuration, setConcentrationDuration] = useState<string>(
    existingObservation?.concentration_duration_minutes?.toString() ?? "",
  );
  const [concentrationNotes, setConcentrationNotes] = useState(existingObservation?.concentration_notes ?? "");

  const [independenceRating, setIndependenceRating] = useState(existingObservation?.independence_rating ?? 3);
  const [independenceNotes, setIndependenceNotes] = useState(existingObservation?.independence_notes ?? "");

  const [orderRating, setOrderRating] = useState(existingObservation?.order_rating ?? 3);
  const [orderNotes, setOrderNotes] = useState(existingObservation?.order_notes ?? "");

  const [coordinationRating, setCoordinationRating] = useState(existingObservation?.coordination_rating ?? 3);
  const [coordinationNotes, setCoordinationNotes] = useState(existingObservation?.coordination_notes ?? "");

  const [socialHarmonyRating, setSocialHarmonyRating] = useState(existingObservation?.social_harmony_rating ?? 3);
  const [socialHarmonyNotes, setSocialHarmonyNotes] = useState(existingObservation?.social_harmony_notes ?? "");

  const [engagement, setEngagement] = useState<WorkCycleEngagement>(existingObservation?.work_cycle_engagement ?? "moderate");
  const [selfDirection, setSelfDirection] = useState<SelfDirectionLevel>(existingObservation?.self_direction ?? "minimal_guidance");
  const [joyfulEngagement, setJoyfulEngagement] = useState(existingObservation?.joyful_engagement ?? false);
  const [overallNotes, setOverallNotes] = useState(existingObservation?.overall_notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Please select a student");
      return;
    }

    const payload = {
      student_id: studentId,
      observation_date: observationDate,
      class_id: classId || null,
      concentration_rating: concentrationRating,
      concentration_duration_minutes: concentrationDuration ? parseInt(concentrationDuration, 10) : null,
      concentration_notes: concentrationNotes || null,
      independence_rating: independenceRating,
      independence_notes: independenceNotes || null,
      order_rating: orderRating,
      order_notes: orderNotes || null,
      coordination_rating: coordinationRating,
      coordination_notes: coordinationNotes || null,
      social_harmony_rating: socialHarmonyRating,
      social_harmony_notes: socialHarmonyNotes || null,
      work_cycle_engagement: engagement,
      self_direction: selfDirection,
      joyful_engagement: joyfulEngagement,
      overall_notes: overallNotes || null,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateNormalizationObservation(existingObservation!.id, payload)
        : await createNormalizationObservation(payload);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        router.push(isEdit ? `/pedagogy/normalization/${studentId}` : "/pedagogy/normalization");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
        {isEdit ? "Edit Observation" : "Record Normalization Observation"}
      </h2>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            backgroundColor: "var(--destructive-bg, hsl(0 60% 94%))",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Student + Class + Date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Student</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            disabled={isEdit}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.preferred_name || s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Class (optional)</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          >
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Date</label>
          <input
            type="date"
            value={observationDate}
            onChange={(e) => setObservationDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Five indicator ratings */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Indicator Ratings (1–5)
        </h3>

        <div className="space-y-4">
          <RatingInput
            value={concentrationRating}
            onChange={(v) => { setConcentrationRating(v); haptics.selection(); }}
            label={INDICATOR_CONFIG.concentration.label}
            indicatorColor={`var(${INDICATOR_CONFIG.concentration.cssVar})`}
          />
          <div className="flex gap-3">
            <input
              type="number"
              min={0}
              max={300}
              placeholder="Duration (min)"
              value={concentrationDuration}
              onChange={(e) => setConcentrationDuration(e.target.value)}
              className="w-32 rounded-lg border border-border px-3 py-1.5 text-sm"
              style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            />
            <input
              type="text"
              placeholder="Notes…"
              value={concentrationNotes}
              onChange={(e) => setConcentrationNotes(e.target.value)}
              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
              style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <RatingInput
            value={independenceRating}
            onChange={(v) => { setIndependenceRating(v); haptics.selection(); }}
            label={INDICATOR_CONFIG.independence.label}
            indicatorColor={`var(${INDICATOR_CONFIG.independence.cssVar})`}
          />
          <input
            type="text"
            placeholder="Notes…"
            value={independenceNotes}
            onChange={(e) => setIndependenceNotes(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
        </div>

        <div className="space-y-2">
          <RatingInput
            value={orderRating}
            onChange={(v) => { setOrderRating(v); haptics.selection(); }}
            label={INDICATOR_CONFIG.order.label}
            indicatorColor={`var(${INDICATOR_CONFIG.order.cssVar})`}
          />
          <input
            type="text"
            placeholder="Notes…"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
        </div>

        <div className="space-y-2">
          <RatingInput
            value={coordinationRating}
            onChange={(v) => { setCoordinationRating(v); haptics.selection(); }}
            label={INDICATOR_CONFIG.coordination.label}
            indicatorColor={`var(${INDICATOR_CONFIG.coordination.cssVar})`}
          />
          <input
            type="text"
            placeholder="Notes…"
            value={coordinationNotes}
            onChange={(e) => setCoordinationNotes(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
        </div>

        <div className="space-y-2">
          <RatingInput
            value={socialHarmonyRating}
            onChange={(v) => { setSocialHarmonyRating(v); haptics.selection(); }}
            label={INDICATOR_CONFIG.social_harmony.label}
            indicatorColor={`var(${INDICATOR_CONFIG.social_harmony.cssVar})`}
          />
          <input
            type="text"
            placeholder="Notes…"
            value={socialHarmonyNotes}
            onChange={(e) => setSocialHarmonyNotes(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Aggregate observations */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          Overall Assessment
        </h3>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Work Cycle Engagement
          </label>
          <div className="flex flex-wrap gap-2">
            {(["deep", "moderate", "surface", "disengaged"] as WorkCycleEngagement[]).map((eng) => {
              const cfg = WORK_CYCLE_ENGAGEMENT_CONFIG[eng];
              const isActive = engagement === eng;
              return (
                <button
                  key={eng}
                  type="button"
                  className="active-push touch-target rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                  onClick={() => { setEngagement(eng); haptics.selection(); }}
                  style={{
                    borderColor: isActive ? `var(${cfg.cssVar})` : "var(--border)",
                    backgroundColor: isActive ? `var(${cfg.cssVar}-bg)` : "transparent",
                    color: isActive ? `var(${cfg.cssVar}-fg)` : "var(--muted-foreground)",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Self-Direction Level
          </label>
          <select
            value={selfDirection}
            onChange={(e) => { setSelfDirection(e.target.value as SelfDirectionLevel); haptics.selection(); }}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          >
            {(Object.entries(SELF_DIRECTION_CONFIG) as [SelfDirectionLevel, { label: string; description: string }][]).map(
              ([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ),
            )}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={joyfulEngagement}
            onChange={(e) => { setJoyfulEngagement(e.target.checked); haptics.selection(); }}
            className="h-5 w-5 rounded border-border"
          />
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Joyful Engagement
            </span>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Child showed visible joy, satisfaction, or deep contentment during work
            </p>
          </div>
        </label>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Overall Notes
          </label>
          <textarea
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            rows={3}
            placeholder="General observations about the child's normalization journey…"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Saving…" : isEdit ? "Update Observation" : "Save Observation"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-lg border border-border px-4 py-2.5 text-sm font-medium"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
