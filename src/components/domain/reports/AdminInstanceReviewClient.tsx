"use client";

// src/components/domain/reports/AdminInstanceReviewClient.tsx
//
// ============================================================
// WattleOS V2 - Admin Instance Review Client
// ============================================================
// Displays section-by-section report content, then provides
// review actions: approve, request changes, or publish (PDF).
// ============================================================

import {
  approveInstance,
  requestInstanceChanges,
  publishInstance,
  getInstancePdfUrl,
} from "@/lib/actions/reports/instances";
import type {
  ReportInstanceWithContext,
  ReportInstanceStatus,
} from "@/types/domain";
import type { TemplateSection } from "@/lib/reports/types";
import { useState, useTransition } from "react";

interface Props {
  instance: ReportInstanceWithContext;
  sections: TemplateSection[];
  periodId: string;
  planTier: "free" | "pro" | "enterprise";
}

const STATUS_STYLE: Record<ReportInstanceStatus, React.CSSProperties> = {
  not_started: {
    background: "var(--color-muted)",
    color: "var(--color-muted-fg)",
  },
  in_progress: {
    background: "color-mix(in srgb, var(--color-info) 12%, transparent)",
    color: "var(--color-info-fg)",
  },
  submitted: {
    background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
    color: "var(--color-warning-fg)",
  },
  changes_requested: {
    background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
    color: "var(--color-warning-fg)",
  },
  approved: {
    background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
    color: "var(--color-success-fg)",
  },
  published: {
    background: "color-mix(in srgb, var(--color-success) 20%, transparent)",
    color: "var(--color-success-fg)",
  },
};

export function AdminInstanceReviewClient({
  instance,
  sections,
  periodId,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ReportInstanceStatus>(
    instance.status as ReportInstanceStatus,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [changeNotes, setChangeNotes] = useState("");
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await approveInstance(instance.id);
      if (result.error) {
        setError(result.error.message);
      } else {
        setStatus("approved");
        setSuccessMsg("Report approved.");
      }
    });
  }

  function handleRequestChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!changeNotes.trim()) return;
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await requestInstanceChanges(instance.id, {
        notes: changeNotes.trim(),
      });
      if (result.error) {
        setError(result.error.message);
      } else {
        setStatus("changes_requested");
        setSuccessMsg("Changes requested - guide has been notified.");
        setShowChangesForm(false);
        setChangeNotes("");
      }
    });
  }

  function handlePublish() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await publishInstance(instance.id);
      if (result.error) {
        setError(result.error.message);
      } else {
        setStatus("published");
        setPdfUrl(result.data?.pdf_url ?? null);
        setSuccessMsg("Report published and PDF generated.");
      }
    });
  }

  async function handleDownloadPdf() {
    setError(null);
    const result = await getInstancePdfUrl(instance.id);
    if (result.error) {
      setError(result.error.message);
    } else if (result.data) {
      setPdfUrl(result.data.download_url);
      setPdfFilename(result.data.filename);
      window.open(result.data.download_url, "_blank");
    }
  }

  // Build section map for rendering content
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  return (
    <div className="space-y-5">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
          style={STATUS_STYLE[status]}
        >
          {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
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

      {/* Report content - section by section */}
      {instance.section_responses.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No content written yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {instance.section_responses.map((resp) => {
            const sectionMeta = sectionMap.get(resp.section_id);
            const title = sectionMeta?.title ?? resp.section_id;
            return (
              <div
                key={resp.section_id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {title}
                </p>
                {resp.content ? (
                  <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                    {resp.content}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No content.
                  </p>
                )}
                {resp.word_count != null && resp.word_count > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {resp.word_count} words
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Change request notes (if any) */}
      {instance.change_request_notes && (
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--color-warning)",
            background:
              "color-mix(in srgb, var(--color-warning) 10%, transparent)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--color-warning-fg)" }}
          >
            Previous change request
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-warning-fg)" }}
          >
            {instance.change_request_notes}
          </p>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm font-medium"
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
      {successMsg && (
        <div
          className="rounded-lg border px-4 py-3 text-sm font-medium"
          style={{
            borderColor: "var(--color-success)",
            color: "var(--color-success-fg)",
            background:
              "color-mix(in srgb, var(--color-success) 10%, transparent)",
          }}
        >
          {successMsg}
        </div>
      )}

      {/* PDF download (if published) */}
      {(status === "published" || instance.pdf_storage_path) && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Download PDF
          </button>
          {pdfFilename && (
            <span className="text-xs text-muted-foreground">{pdfFilename}</span>
          )}
        </div>
      )}

      {/* Review action bar */}
      {(status === "submitted" || status === "approved") && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5">
          {status === "submitted" && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-80"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-success) 15%, transparent)",
                  color: "var(--color-success-fg)",
                }}
              >
                {isPending ? "Saving…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => setShowChangesForm((v) => !v)}
                disabled={isPending}
                className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Request Changes
              </button>
            </>
          )}

          {status === "approved" && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: "var(--color-primary)" }}
            >
              {isPending ? "Generating PDF…" : "Publish + Generate PDF"}
            </button>
          )}

          <a
            href={`/reports/periods/${periodId}/instances`}
            className="text-sm text-muted-foreground hover:text-foreground ml-auto"
          >
            Back to list
          </a>
        </div>
      )}

      {/* Request changes inline form */}
      {showChangesForm && status === "submitted" && (
        <form
          onSubmit={handleRequestChanges}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <p className="text-sm font-semibold text-foreground">
            Request changes
          </p>
          <textarea
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            placeholder="Describe what needs to be revised…"
            rows={4}
            required
            className="block w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !changeNotes.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:opacity-90"
              style={{ background: "var(--color-warning-fg)" }}
            >
              {isPending ? "Sending…" : "Send to Guide"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowChangesForm(false);
                setChangeNotes("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Non-actionable statuses */}
      {!["submitted", "approved"].includes(status) &&
        status !== "published" && (
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <p className="text-sm text-muted-foreground">
              {status === "not_started" || status === "in_progress"
                ? "This report has not been submitted yet. The guide is still working on it."
                : status === "changes_requested"
                  ? "Changes have been requested. The guide needs to resubmit."
                  : null}
            </p>
          </div>
        )}
    </div>
  );
}
