// src/components/domain/chronic-absence/follow-up-log-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  FOLLOW_UP_METHOD_OPTIONS,
  FOLLOW_UP_OUTCOME_OPTIONS,
} from "@/lib/constants/chronic-absence";
import { logFollowUp } from "@/lib/actions/chronic-absence";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { AbsenceFollowUpLog, FollowUpMethod, FollowUpOutcome } from "@/types/domain";

// ── Log form ─────────────────────────────────────────────────

interface FollowUpFormProps {
  flagId: string;
  studentId: string;
  onSuccess?: (entry: AbsenceFollowUpLog) => void;
}

export function FollowUpForm({ flagId, studentId, onSuccess }: FollowUpFormProps) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [contactDate, setContactDate]       = useState(today);
  const [method, setMethod]                 = useState<FollowUpMethod>("phone_call");
  const [outcome, setOutcome]               = useState<FollowUpOutcome>("contacted");
  const [contactName, setContactName]       = useState("");
  const [notes, setNotes]                   = useState("");
  const [nextFollowUp, setNextFollowUp]     = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.medium();
    startTransition(async () => {
      const result = await logFollowUp({
        flag_id:        flagId,
        student_id:     studentId,
        contact_date:   contactDate,
        method,
        outcome,
        contact_name:   contactName || null,
        notes:          notes || null,
        next_follow_up: nextFollowUp || null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else if (result.data) {
        haptics.success();
        onSuccess?.(result.data);
        // Reset form
        setContactDate(today);
        setMethod("phone_call");
        setOutcome("contacted");
        setContactName("");
        setNotes("");
        setNextFollowUp("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
      <h4 className="text-sm font-semibold">Log follow-up contact</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium mb-1">Contact date</label>
          <input
            type="date"
            value={contactDate}
            onChange={(e) => setContactDate(e.target.value)}
            max={today}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Contact name */}
        <div>
          <label className="block text-xs font-medium mb-1">
            Who was contacted <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="E.g. Jane Smith (mother)"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Method */}
        <div>
          <label className="block text-xs font-medium mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as FollowUpMethod)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FOLLOW_UP_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-xs font-medium mb-1">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as FollowUpOutcome)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FOLLOW_UP_OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium mb-1">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={3000}
          placeholder="Details of the conversation or action taken..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* Next follow-up */}
      <div>
        <label className="block text-xs font-medium mb-1">
          Next follow-up date <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={nextFollowUp}
          onChange={(e) => setNextFollowUp(e.target.value)}
          min={today}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="touch-target active-push rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--chronic-absence-at-risk)" }}
        >
          {isPending ? "Saving…" : "Save contact"}
        </button>
      </div>
    </form>
  );
}

// ── Timeline view ────────────────────────────────────────────

interface FollowUpTimelineProps {
  entries: AbsenceFollowUpLog[];
}

export function FollowUpTimeline({ entries }: FollowUpTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
        No follow-up contacts logged yet.
      </p>
    );
  }

  const methodLabel = (m: FollowUpMethod) =>
    FOLLOW_UP_METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m;

  const outcomeLabel = (o: FollowUpOutcome) =>
    FOLLOW_UP_OUTCOME_OPTIONS.find((op) => op.value === o)?.label ?? o;

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className={`flex gap-3 ${i < entries.length - 1 ? "pb-3 border-b border-border" : ""}`}
        >
          <div className="text-base mt-0.5">
            {entry.outcome === "contacted" || entry.outcome === "resolved" ? "✅" :
             entry.outcome === "no_answer" ? "📵" :
             entry.outcome === "referred" ? "↗️" :
             entry.outcome === "escalated" ? "⚠️" : "📋"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-medium">{methodLabel(entry.method)}</span>
              <span style={{ color: "var(--muted-foreground)" }}>→</span>
              <span>{outcomeLabel(entry.outcome)}</span>
              <span className="ml-auto text-xs" style={{ color: "var(--muted-foreground)" }}>
                {entry.contact_date}
              </span>
            </div>
            {entry.contact_name && (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Contact: {entry.contact_name}
              </p>
            )}
            {entry.notes && (
              <p className="text-sm mt-1">{entry.notes}</p>
            )}
            {entry.next_follow_up && (
              <p className="text-xs mt-1" style={{ color: "var(--chronic-absence-at-risk)" }}>
                📅 Follow up by: {entry.next_follow_up}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
