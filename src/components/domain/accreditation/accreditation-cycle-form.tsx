"use client";

// src/components/domain/accreditation/accreditation-cycle-form.tsx
//
// Create / edit accreditation cycle.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createAccreditationCycle,
  updateAccreditationCycle,
} from "@/lib/actions/accreditation";
import type { AccreditationBodyCode, AccreditationCycle } from "@/types/domain";

const BODY_OPTIONS: { value: AccreditationBodyCode; label: string }[] = [
  { value: "ami", label: "AMI - Association Montessori Internationale" },
  { value: "ams", label: "AMS - American Montessori Society" },
  {
    value: "msaa",
    label: "MSAA - Montessori Schools Association of Australia",
  },
];

interface Props {
  cycle?: AccreditationCycle;
  defaultBodyCode?: AccreditationBodyCode;
}

export function AccreditationCycleForm({ cycle, defaultBodyCode }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [bodyCode, setBodyCode] = useState<AccreditationBodyCode>(
    cycle?.body_code ?? defaultBodyCode ?? "ami",
  );
  const [cycleLabel, setCycleLabel] = useState(cycle?.cycle_label ?? "");
  const [selfStudyStart, setSelfStudyStart] = useState(
    cycle?.self_study_start ?? "",
  );
  const [selfStudyEnd, setSelfStudyEnd] = useState(cycle?.self_study_end ?? "");
  const [submissionDate, setSubmissionDate] = useState(
    cycle?.submission_date ?? "",
  );
  const [notes, setNotes] = useState(cycle?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.impact("medium");

    startTransition(async () => {
      const payload = {
        body_code: bodyCode,
        cycle_label: cycleLabel,
        self_study_start: selfStudyStart || null,
        self_study_end: selfStudyEnd || null,
        submission_date: submissionDate || null,
        notes: notes || null,
      };

      const result = cycle
        ? await updateAccreditationCycle(cycle.id, payload)
        : await createAccreditationCycle(payload);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      router.push(
        cycle
          ? `/pedagogy/accreditation/cycles/${cycle.id}`
          : `/pedagogy/accreditation/cycles/${result.data!.id}`,
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Body */}
      {!cycle && (
        <div className="space-y-2">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Accrediting Body
          </label>
          <select
            value={bodyCode}
            onChange={(e) =>
              setBodyCode(e.target.value as AccreditationBodyCode)
            }
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            {BODY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Label */}
      <div className="space-y-2">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cycle Label <span style={{ color: "var(--destructive)" }}>*</span>
        </label>
        <input
          type="text"
          required
          placeholder="e.g. 2025 AMI Self-Study"
          value={cycleLabel}
          onChange={(e) => setCycleLabel(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Self-Study Start
          </label>
          <input
            type="date"
            value={selfStudyStart}
            onChange={(e) => setSelfStudyStart(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-2">
          <label
            className="block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Self-Study End
          </label>
          <input
            type="date"
            value={selfStudyEnd}
            onChange={(e) => setSelfStudyEnd(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Target Submission Date
        </label>
        <input
          type="date"
          value={submissionDate}
          onChange={(e) => setSubmissionDate(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label
          className="block text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context about this accreditation cycle…"
          className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || !cycleLabel}
          className="touch-target active-push flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {pending ? "Saving…" : cycle ? "Save Changes" : "Create Cycle"}
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.impact("light");
            router.back();
          }}
          className="touch-target active-push px-4 py-2 rounded-lg text-sm font-medium border border-border"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
