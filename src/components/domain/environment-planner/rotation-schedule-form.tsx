"use client";

// src/components/domain/environment-planner/rotation-schedule-form.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type {
  EnvironmentPlan,
  MaterialShelfLocation,
  RotationSchedule,
  RotationThemeType,
} from "@/types/domain";
import {
  createRotationSchedule,
  updateRotationSchedule,
} from "@/lib/actions/environment-planner";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  schedule?: RotationSchedule;
  locations: MaterialShelfLocation[];
  plans: EnvironmentPlan[];
  backHref: string;
}

const THEME_OPTIONS: Array<{ value: RotationThemeType; label: string }> = [
  { value: "seasonal",      label: "Seasonal" },
  { value: "thematic",      label: "Thematic" },
  { value: "developmental", label: "Developmental" },
  { value: "custom",        label: "Custom" },
];

export function RotationScheduleForm({ schedule, locations, plans, backHref }: Props) {
  const router  = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title:          schedule?.title          ?? "",
    theme_type:     (schedule?.theme_type    ?? "seasonal") as RotationThemeType,
    theme_label:    schedule?.theme_label    ?? "",
    location_id:    schedule?.location_id    ?? "",
    plan_id:        schedule?.plan_id        ?? "",
    scheduled_date: schedule?.scheduled_date ?? "",
    rationale:      schedule?.rationale      ?? "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    haptics.impact("medium");
    setError(null);

    startTransition(async () => {
      const payload = {
        title:          form.title,
        theme_type:     form.theme_type,
        theme_label:    form.theme_label    || null,
        location_id:    form.location_id    || null,
        plan_id:        form.plan_id        || null,
        scheduled_date: form.scheduled_date,
        rationale:      form.rationale      || null,
      };

      const result = schedule
        ? await updateRotationSchedule(schedule.id, payload)
        : await createRotationSchedule(payload);

      if (result.error) {
        haptics.error();
        setError(result.error.message);
        return;
      }

      haptics.success();
      router.push("/pedagogy/environment-planner/rotations");
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  const inputStyle = { background: "var(--input-bg)", color: "var(--text-primary)" };
  const labelClass = "block text-sm font-medium mb-1.5";
  const labelStyle = { color: "var(--text-secondary)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="flex items-center gap-1.5 text-sm mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Title */}
      <div>
        <label className={labelClass} style={labelStyle}>Title *</label>
        <input
          required
          className={inputClass}
          style={inputStyle}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Term 2 Sensorial Rotation"
        />
      </div>

      {/* Theme type */}
      <div>
        <label className={labelClass} style={labelStyle}>Theme type</label>
        <div className="flex gap-2 flex-wrap">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { haptics.impact("light"); set("theme_type", opt.value); }}
              className="active-push touch-target px-3 py-1.5 rounded-lg border text-sm font-medium"
              style={{
                borderColor: form.theme_type === opt.value ? "var(--primary)" : "var(--border)",
                background:  form.theme_type === opt.value ? "var(--primary)" : "var(--surface)",
                color:       form.theme_type === opt.value ? "var(--primary-fg)" : "var(--text-primary)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme label */}
      <div>
        <label className={labelClass} style={labelStyle}>Theme label</label>
        <input
          className={inputClass}
          style={inputStyle}
          value={form.theme_label}
          onChange={(e) => set("theme_label", e.target.value)}
          placeholder="e.g. Autumn Term, Ocean Creatures"
        />
      </div>

      {/* Scheduled date */}
      <div>
        <label className={labelClass} style={labelStyle}>Scheduled date *</label>
        <input
          type="date"
          required
          className={inputClass}
          style={inputStyle}
          value={form.scheduled_date}
          onChange={(e) => set("scheduled_date", e.target.value)}
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelClass} style={labelStyle}>Location</label>
        <select
          className={inputClass}
          style={inputStyle}
          value={form.location_id}
          onChange={(e) => set("location_id", e.target.value)}
        >
          <option value="">- All / unspecified -</option>
          {locations.filter((l) => l.is_active).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Plan */}
      {plans.length > 0 && (
        <div>
          <label className={labelClass} style={labelStyle}>Link to plan (optional)</label>
          <select
            className={inputClass}
            style={inputStyle}
            value={form.plan_id}
            onChange={(e) => set("plan_id", e.target.value)}
          >
            <option value="">- No linked plan -</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Rationale */}
      <div>
        <label className={labelClass} style={labelStyle}>Pedagogical rationale</label>
        <textarea
          rows={3}
          className={inputClass}
          style={inputStyle}
          value={form.rationale}
          onChange={(e) => set("rationale", e.target.value)}
          placeholder="Why is this rotation happening? What are the children ready for?"
        />
      </div>

      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: "var(--env-rotation-overdue-bg)", color: "var(--env-rotation-overdue-fg)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-lg py-2.5 text-sm font-semibold"
        style={{ background: "var(--primary)", color: "var(--primary-fg)", opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? "Saving…" : schedule ? "Save changes" : "Schedule rotation"}
      </button>
    </form>
  );
}
