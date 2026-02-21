// src/components/domain/reports/NewTemplateForm.tsx
"use client";

import { createReportTemplate } from "@/lib/actions/reports";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewTemplateForm() {
  const [name, setName] = useState("");
  const [cycleLevel, setCycleLevel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    const result = await createReportTemplate({
      name: name.trim(),
      cycleLevel: cycleLevel.trim() || null,
    });

    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
    } else if (result.data) {
      router.push(`/reports/templates/${result.data.id}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm max-w-2xl mx-auto"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-bold text-foreground mb-1.5"
        >
          Template Name <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., End of Term 3-6 Report"
          autoFocus
          className="block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm shadow-sm transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="cycleLevel"
          className="block text-sm font-bold text-foreground mb-1"
        >
          Cycle Level
        </label>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Optionally scope this template to a specific age group
        </p>
        <select
          id="cycleLevel"
          value={cycleLevel}
          onChange={(e) => setCycleLevel(e.target.value)}
          className="block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm shadow-sm transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">All cycle levels</option>
          <option value="0-3">Infant / Toddler (0–3)</option>
          <option value="3-6">Primary (3–6)</option>
          <option value="6-9">Lower Elementary (6–9)</option>
          <option value="6-12">Elementary (6–12)</option>
          <option value="9-12">Upper Elementary (9–12)</option>
          <option value="12-15">Adolescent (12–15)</option>
        </select>
      </div>

      <div className="rounded-lg bg-primary-50 border border-primary-100 p-4">
        <p className="text-xs font-medium text-primary-800 leading-relaxed">
          Your template will be created with default sections (Student Info,
          Attendance Summary, Learning Progress, Teacher Comments, Goals). You
          can add, remove, and reorder sections in the builder.
        </p>
      </div>

      {error && (
        <div className="animate-slide-down rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-bold">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <a
          href="/reports/templates"
          className="rounded-lg border border-border bg-background px-5 h-[var(--density-button-height)] text-sm font-bold text-foreground transition-all hover:bg-muted flex items-center justify-center"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="rounded-lg bg-primary px-6 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary-600 disabled:opacity-50 active:scale-95"
        >
          {isLoading ? "Creating..." : "Create & Customize"}
        </button>
      </div>
    </form>
  );
}