// src/components/domain/chronic-absence/absence-flag-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createAbsenceFlag,
  resolveAbsenceFlag,
  dismissAbsenceFlag,
} from "@/lib/actions/chronic-absence";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceMonitoringFlag } from "@/types/domain";

// ── Create Flag ──────────────────────────────────────────────

interface CreateFlagFormProps {
  studentId: string;
  onSuccess?: (flag: AbsenceMonitoringFlag) => void;
  onCancel?: () => void;
}

export function CreateFlagForm({
  studentId,
  onSuccess,
  onCancel,
}: CreateFlagFormProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.medium();
    startTransition(async () => {
      const result = await createAbsenceFlag({
        student_id: studentId,
        notes: notes || null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else if (result.data) {
        haptics.success();
        onSuccess?.(result.data);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Monitoring notes{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="E.g. Parents contacted, pattern since Term 2..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="touch-target active-push rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: `var(--chronic-absence-chronic)` }}
        >
          {isPending ? "Creating…" : "🚩 Create flag"}
        </button>
      </div>
    </form>
  );
}

// ── Resolve / Dismiss Flag ───────────────────────────────────

interface ResolveFlagFormProps {
  flagId: string;
  mode: "resolve" | "dismiss";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ResolveFlagForm({
  flagId,
  mode,
  onSuccess,
  onCancel,
}: ResolveFlagFormProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.medium();
    startTransition(async () => {
      const action =
        mode === "resolve" ? resolveAbsenceFlag : dismissAbsenceFlag;
      const result = await action({
        flag_id: flagId,
        resolution_note: note || null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {mode === "resolve" ? "Resolution note" : "Reason for dismissal"}{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={
            mode === "resolve"
              ? "E.g. Attendance improved consistently over 4 weeks..."
              : "E.g. Records reviewed - absence was excused medical leave..."
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="touch-target active-push rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            background:
              mode === "resolve"
                ? "var(--chronic-absence-good)"
                : "var(--muted)",
            color:
              mode === "resolve"
                ? "var(--chronic-absence-good-fg)"
                : "var(--foreground)",
          }}
        >
          {isPending
            ? "…"
            : mode === "resolve"
              ? "✓ Mark resolved"
              : "Dismiss flag"}
        </button>
      </div>
    </form>
  );
}
