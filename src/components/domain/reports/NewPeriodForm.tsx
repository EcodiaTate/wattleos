"use client";

// src/components/domain/reports/NewPeriodForm.tsx
//
// ============================================================
// WattleOS V2 - New Report Period Form
// ============================================================
// Creates a report period and redirects to its dashboard.
// Template selection is optional - can be assigned when
// generating instances later.
// ============================================================

import { createReportPeriod } from "@/lib/actions/reports/periods";
import type { ReportTemplate } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  templates: ReportTemplate[];
}

export function NewPeriodForm({ templates }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [academicYear, setAcademicYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [dueAt, setDueAt] = useState("");
  const [templateId, setTemplateId] = useState(
    templates.length === 1 ? templates[0].id : "",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsPending(true);
    setError(null);

    const result = await createReportPeriod({
      name: name.trim(),
      term: term.trim() || null,
      academic_year: academicYear ? parseInt(academicYear, 10) : null,
      due_at: dueAt || null,
    });

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Failed to create period.");
      setIsPending(false);
      return;
    }

    router.push(`/reports/periods/${result.data.id}/dashboard`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5"
    >
      {/* Period name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-foreground mb-1.5"
        >
          Period Name{" "}
          <span style={{ color: "var(--color-destructive)" }}>*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Term 3 2026 Reports"
          autoFocus
          required
          className="block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      {/* Term + Year row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="term"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Term
          </label>
          <select
            id="term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">- None -</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
            <option value="Term 4">Term 4</option>
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Annual">Annual</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="academicYear"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Academic Year
          </label>
          <input
            id="academicYear"
            type="number"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2026"
            min={2020}
            max={2040}
            className="block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Due date */}
      <div>
        <label
          htmlFor="dueAt"
          className="block text-sm font-semibold text-foreground mb-1.5"
        >
          Guide submission deadline
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Guides see this date on their My Reports page.
        </p>
        <input
          id="dueAt"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="block rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Template */}
      {templates.length > 0 && (
        <div>
          <label
            htmlFor="templateId"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Report Template
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            You can also assign the template later when generating instances.
          </p>
          <select
            id="templateId"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="block w-full rounded-lg border border-input bg-background px-4 h-[var(--density-input-height)] text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="">- Select template later -</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.cycle_level ? ` (${t.cycle_level})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {templates.length === 0 && (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{
            borderColor: "var(--color-warning)",
            background:
              "color-mix(in srgb, var(--color-warning) 10%, transparent)",
          }}
        >
          <p style={{ color: "var(--color-warning-fg)" }}>
            No templates found.{" "}
            <a
              href="/reports/templates/new"
              className="font-semibold underline"
            >
              Create a template first
            </a>{" "}
            before activating this period.
          </p>
        </div>
      )}

      {/* Info box */}
      <div
        className="rounded-lg border p-4 text-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-muted)",
        }}
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          The period starts in <strong>Draft</strong> status. After creation,
          open the dashboard to activate it, generate report instances, and
          assign guides.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg border p-4 text-sm font-medium"
          style={{
            borderColor: "var(--color-destructive)",
            color: "var(--color-destructive)",
            background:
              "color-mix(in srgb, var(--color-destructive) 10%, transparent)",
          }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-1">
        <a
          href="/reports/periods"
          className="rounded-lg border border-border bg-background px-5 h-[var(--density-button-height)] text-sm font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-lg px-6 h-[var(--density-button-height)] text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
        >
          {isPending ? "Creating…" : "Create Period"}
        </button>
      </div>
    </form>
  );
}
