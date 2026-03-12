"use client";

// src/components/domain/environment-planner/environment-plan-form.tsx

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type {
  EnvironmentPlan,
  EnvironmentPlanStatus,
  MaterialShelfLocation,
} from "@/types/domain";
import {
  createEnvironmentPlan,
  updateEnvironmentPlan,
} from "@/lib/actions/environment-planner";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  plan?: EnvironmentPlan;
  locations: MaterialShelfLocation[];
  backHref: string;
}

const STATUS_OPTIONS: Array<{ value: EnvironmentPlanStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export function EnvironmentPlanForm({ plan, locations, backHref }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    location_id: plan?.location_id ?? "",
    theme: plan?.theme ?? "",
    effective_from: plan?.effective_from ?? "",
    effective_to: plan?.effective_to ?? "",
    notes: plan?.notes ?? "",
    status: (plan?.status ?? "draft") as EnvironmentPlanStatus,
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
        name: form.name,
        description: form.description || null,
        location_id: form.location_id || null,
        theme: form.theme || null,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        notes: form.notes || null,
        status: form.status,
      };

      const result = plan
        ? await updateEnvironmentPlan(plan.id, payload)
        : await createEnvironmentPlan(payload);

      if (result.error) {
        haptics.error();
        setError(result.error.message);
        return;
      }

      haptics.success();
      const planId = plan ? plan.id : result.data?.id;
      router.push(`/pedagogy/environment-planner/plans/${planId}`);
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";
  const inputStyle = {
    background: "var(--input-bg)",
    color: "var(--text-primary)",
  };
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

      {/* Name */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Plan name *
        </label>
        <input
          required
          className={inputClass}
          style={inputStyle}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Autumn 2025 - Sensorial Shelf"
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Shelf location
        </label>
        <select
          className={inputClass}
          style={inputStyle}
          value={form.location_id}
          onChange={(e) => set("location_id", e.target.value)}
        >
          <option value="">- No specific location -</option>
          {locations
            .filter((l) => l.is_active)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
      </div>

      {/* Status */}
      {plan && (
        <div>
          <label className={labelClass} style={labelStyle}>
            Status
          </label>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  haptics.impact("light");
                  set("status", opt.value);
                }}
                className="active-push touch-target px-3 py-1.5 rounded-lg border text-sm font-medium"
                style={{
                  borderColor:
                    form.status === opt.value
                      ? "var(--primary)"
                      : "var(--border)",
                  background:
                    form.status === opt.value
                      ? "var(--primary)"
                      : "var(--surface)",
                  color:
                    form.status === opt.value
                      ? "var(--primary-fg)"
                      : "var(--text-primary)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Theme / season label
        </label>
        <input
          className={inputClass}
          style={inputStyle}
          value={form.theme}
          onChange={(e) => set("theme", e.target.value)}
          placeholder="e.g. Autumn Term, Ocean Creatures"
        />
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Effective from
          </label>
          <input
            type="date"
            className={inputClass}
            style={inputStyle}
            value={form.effective_from}
            onChange={(e) => set("effective_from", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Effective to
          </label>
          <input
            type="date"
            className={inputClass}
            style={inputStyle}
            value={form.effective_to}
            onChange={(e) => set("effective_to", e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Description
        </label>
        <textarea
          rows={3}
          className={inputClass}
          style={inputStyle}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Pedagogical rationale for this layout..."
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Internal notes
        </label>
        <textarea
          rows={2}
          className={inputClass}
          style={inputStyle}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{
            background: "var(--env-rotation-overdue-bg)",
            color: "var(--env-rotation-overdue-fg)",
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-lg py-2.5 text-sm font-semibold"
        style={{
          background: "var(--primary)",
          color: "var(--primary-fg)",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "Saving…" : plan ? "Save changes" : "Create plan"}
      </button>
    </form>
  );
}
