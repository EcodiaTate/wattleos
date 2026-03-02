"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createRosterWeek,
  generateShiftsFromTemplate,
} from "@/lib/actions/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { RosterTemplate } from "@/types/domain";

export function RosterWeekFormClient({
  templates,
}: {
  templates: RosterTemplate[];
}) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRosterWeek({
        weekStartDate: weekStart,
        templateId: templateId || undefined,
        notes: notes || undefined,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      // If template selected, auto-generate shifts
      if (templateId && result.data) {
        const genResult = await generateShiftsFromTemplate(
          result.data.id,
          templateId,
        );
        if (genResult.error) {
          setError(genResult.error.message);
          haptics.error();
          return;
        }
      }

      haptics.success();
      router.push(`/admin/rostering/week/${result.data!.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Week Starting (Monday)
        </label>
        <input
          type="date"
          required
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Generate from Template (optional)
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">No template - start blank</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="mb-1 block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target rounded-lg px-6 py-2 text-sm font-medium disabled:opacity-50"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending ? "Creating…" : "Create Roster Week"}
      </button>
    </form>
  );
}
