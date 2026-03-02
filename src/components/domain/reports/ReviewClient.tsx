"use client";

// src/components/domain/reports/ReviewClient.tsx
//
// ============================================================
// WattleOS Report Builder - Admin Review Client
// ============================================================
// Shows the full submitted report content with section-by-
// section reading view, then approve or request changes actions.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveInstance,
  requestInstanceChanges,
} from "@/lib/actions/reports/instances";
import type { ReportInstanceWithContext } from "@/types/domain";

interface Props {
  instance: ReportInstanceWithContext;
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  changes_requested: "Changes Requested",
  approved: "Approved",
  published: "Published",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  submitted: {
    bg: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
    color: "var(--color-primary)",
  },
  changes_requested: {
    bg: "color-mix(in srgb, var(--color-warning, #d97706) 12%, transparent)",
    color: "var(--color-warning-fg, #92400e)",
  },
  approved: {
    bg: "color-mix(in srgb, var(--color-success, #22c55e) 12%, transparent)",
    color: "var(--color-success-fg, #15803d)",
  },
};

export function ReviewClient({ instance }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "request_changes">("idle");
  const [changeNotes, setChangeNotes] = useState(
    instance.change_request_notes ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canApprove =
    instance.status === "submitted" || instance.status === "changes_requested";
  const canRequestChanges =
    instance.status === "submitted" || instance.status === "changes_requested";
  const statusStyle = STATUS_STYLE[instance.status] ?? {
    bg: "var(--color-muted)",
    color: "var(--color-muted-foreground)",
  };

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveInstance(instance.id);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.push(`/reports/periods/${instance.report_period_id}/dashboard`);
    });
  }

  function handleRequestChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!changeNotes.trim()) {
      setError("Please describe what changes are needed.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestInstanceChanges(instance.id, {
        notes: changeNotes.trim(),
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.push(`/reports/periods/${instance.report_period_id}/dashboard`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {STATUS_LABEL[instance.status] ?? instance.status}
          </span>
          {instance.submitted_at && (
            <span className="text-xs text-muted-foreground">
              Submitted{" "}
              {new Date(instance.submitted_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
        {instance.assigned_guide_name && (
          <span className="text-xs text-muted-foreground">
            Guide: {instance.assigned_guide_name}
          </span>
        )}
      </div>

      {/* Previous change request notes (if re-submitted after changes) */}
      {instance.change_request_notes && instance.status === "submitted" && (
        <div
          className="rounded-lg p-4"
          style={{
            background:
              "color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent)",
            borderLeft: "3px solid var(--color-warning, #d97706)",
          }}
        >
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Previous feedback
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {instance.change_request_notes}
          </p>
        </div>
      )}

      {/* Report content */}
      <div className="space-y-4">
        {instance.section_responses.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              This report has no content yet.
            </p>
          </div>
        ) : (
          instance.section_responses.map((section) => (
            <div
              key={section.section_id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.section_id}
                </p>
                {section.word_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {section.word_count} word
                    {section.word_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {section.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg p-3 text-sm"
          style={{
            background:
              "color-mix(in srgb, var(--color-destructive) 10%, transparent)",
            color: "var(--color-destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Action panel */}
      {instance.status === "approved" ? (
        <div
          className="rounded-xl border p-4 text-center"
          style={{
            borderColor: "var(--color-success, #22c55e)",
            background:
              "color-mix(in srgb, var(--color-success, #22c55e) 8%, transparent)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-success-fg, #15803d)" }}
          >
            ✓ Approved
            {instance.approved_at && (
              <>
                {" "}
                on{" "}
                {new Date(instance.approved_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                })}
              </>
            )}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-card)",
          }}
        >
          <h3 className="text-sm font-semibold text-foreground">
            Your decision
          </h3>

          {mode === "idle" && (
            <div className="flex items-center gap-3">
              {canApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "var(--color-success, #22c55e)",
                    color: "#fff",
                  }}
                >
                  {isPending ? "Approving…" : "Approve report"}
                </button>
              )}
              {canRequestChanges && (
                <button
                  type="button"
                  onClick={() => setMode("request_changes")}
                  disabled={isPending}
                  className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
                >
                  Request changes
                </button>
              )}
            </div>
          )}

          {mode === "request_changes" && (
            <form onSubmit={handleRequestChanges} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  What needs to change? *
                </label>
                <textarea
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  rows={4}
                  required
                  placeholder="Be specific - the guide will see this feedback and revise their report."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending || !changeNotes.trim()}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "var(--color-warning-fg, #d97706)",
                    color: "#fff",
                  }}
                >
                  {isPending ? "Sending…" : "Send feedback"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("idle");
                    setError(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Milestone prompt 5 (from brief):
          "You've just approved report N. PDF delivery is one click away." (on approve) */}
    </div>
  );
}
