// src/components/domain/reports/NewTemplateForm.tsx
//
// ============================================================
// WattleOS V2 - New Template Form (Client Component)
// ============================================================
// Collects template name and cycle level, creates the template
// with default sections, and redirects to the builder.
// ============================================================

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
      // Redirect to the builder
      router.push(`/reports/templates/${result.data.id}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-gray-200 bg-white p-6"
    >
      {/* Template name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., End of Term 3-6 Report"
          autoFocus
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Cycle level */}
      <div>
        <label
          htmlFor="cycleLevel"
          className="block text-sm font-medium text-gray-700"
        >
          Cycle Level
        </label>
        <p className="text-xs text-gray-500">
          Optionally scope this template to a specific age group
        </p>
        <select
          id="cycleLevel"
          value={cycleLevel}
          onChange={(e) => setCycleLevel(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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

      {/* Info about defaults */}
      <div className="rounded-md bg-amber-50 p-3">
        <p className="text-xs text-amber-800">
          Your template will be created with default sections (Student Info,
          Attendance Summary, Learning Progress, Teacher Comments, Goals). You
          can add, remove, and reorder sections in the builder.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <a
          href="/reports/templates"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create & Customize"}
        </button>
      </div>
    </form>
  );
}
