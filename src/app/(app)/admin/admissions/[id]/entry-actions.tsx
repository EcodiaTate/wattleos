// src/app/(app)/admin/admissions/[id]/entry-actions.tsx
//
// ============================================================
// WattleOS V2 - Entry Actions Panel (Module 13)
// ============================================================
// 'use client' - renders contextual action buttons and inline
// forms based on the entry's current pipeline stage.
//
// WHY inline forms (not modals): Stage-specific actions like
// "Make Offer" need multiple fields (program, start date,
// expiry). An inline panel at the top of the detail page is
// more usable than a modal, especially when the admin wants
// to reference the entry details while filling in the form.
//
// The initialAction prop lets the kanban modal redirect here
// with ?action=offered to auto-expand the offer form.
// ============================================================

"use client";

import type {
  WaitlistEntryWithHistory,
  WaitlistStage,
} from "@/lib/actions/admissions/waitlist-pipeline";
import {
  declineOffer,
  makeOffer,
  transitionStage,
  updateWaitlistEntry,
  withdrawEntry,
} from "@/lib/actions/admissions/waitlist-pipeline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ── Allowed transitions (mirrors server) ─────────────────────

const ALLOWED_TRANSITIONS: Record<string, WaitlistStage[]> = {
  inquiry: ["waitlisted", "withdrawn"],
  waitlisted: ["tour_scheduled", "offered", "withdrawn"],
  tour_scheduled: ["tour_completed", "waitlisted", "withdrawn"],
  tour_completed: ["offered", "waitlisted", "withdrawn"],
  offered: ["accepted", "declined", "withdrawn"],
  accepted: ["enrolled", "withdrawn"],
  enrolled: [],
  declined: ["waitlisted"],
  withdrawn: ["inquiry"],
};

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  waitlisted: "Waitlisted",
  tour_scheduled: "Tour Scheduled",
  tour_completed: "Tour Completed",
  offered: "Offered",
  accepted: "Accepted",
  enrolled: "Enrolled",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

// ── Props ────────────────────────────────────────────────────

interface EntryActionsProps {
  entry: WaitlistEntryWithHistory;
  initialAction: string | null;
}

export function EntryActions({ entry, initialAction }: EntryActionsProps) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<string | null>(initialAction);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Make Offer form state ──────────────────────────────────
  const [offerProgram, setOfferProgram] = useState(
    entry.requested_program ?? "",
  );
  const [offerStartDate, setOfferStartDate] = useState("");
  const [offerExpiry, setOfferExpiry] = useState("");
  const [offerNotes, setOfferNotes] = useState("");

  // ── Generic transition state ───────────────────────────────
  const [transitionNotes, setTransitionNotes] = useState("");

  // ── Admin notes edit state ─────────────────────────────────
  const [adminNotes, setAdminNotes] = useState(entry.admin_notes ?? "");
  const [priority, setPriority] = useState(entry.priority);

  // Auto-expand if redirected with ?action=offered
  useEffect(() => {
    if (initialAction === "offered") {
      setActiveForm("offer");
    }
  }, [initialAction]);

  const allowed = ALLOWED_TRANSITIONS[entry.stage] ?? [];

  // ── Handle Make Offer ──────────────────────────────────────
  async function handleMakeOffer() {
    if (!offerProgram.trim() || !offerStartDate) return;

    setIsSubmitting(true);
    setError(null);

    const result = await makeOffer({
      entry_id: entry.id,
      offered_program: offerProgram,
      offered_start_date: offerStartDate,
      offer_expires_at: offerExpiry || null,
      notes: offerNotes.trim() || null,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSuccess("Offer sent successfully");
    setActiveForm(null);
    router.refresh();
  }

  // ── Handle simple transition ───────────────────────────────
  async function handleTransition(toStage: WaitlistStage) {
    setIsSubmitting(true);
    setError(null);

    let result;

    if (toStage === "declined") {
      result = await declineOffer(
        entry.id,
        transitionNotes.trim() || undefined,
      );
    } else if (toStage === "withdrawn") {
      result = await withdrawEntry(
        entry.id,
        transitionNotes.trim() || undefined,
      );
    } else {
      result = await transitionStage({
        entry_id: entry.id,
        to_stage: toStage,
        notes: transitionNotes.trim() || null,
      });
    }

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSuccess(`Moved to ${STAGE_LABELS[toStage] ?? toStage}`);
    setActiveForm(null);
    setTransitionNotes("");
    router.refresh();
  }

  // ── Handle admin notes / priority save ─────────────────────
  async function handleSaveDetails() {
    setIsSubmitting(true);
    setError(null);

    const result = await updateWaitlistEntry(entry.id, {
      admin_notes: adminNotes.trim() || null,
      priority,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSuccess("Details updated");
    setActiveForm(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Error / Success messages */}
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 text-success hover:text-success"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Actions:</span>

        {/* Stage-specific primary actions */}
        {allowed.includes("offered") &&
          !["offered", "accepted", "enrolled"].includes(entry.stage) && (
            <button
              onClick={() =>
                setActiveForm(activeForm === "offer" ? null : "offer")
              }
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-primary"
            >
              Make Offer
            </button>
          )}

        {allowed.includes("accepted") && entry.stage === "offered" && (
          <button
            onClick={() => handleTransition("accepted")}
            disabled={isSubmitting}
            className="rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-success disabled:opacity-50"
          >
            Accept Offer
          </button>
        )}

        {allowed.includes("declined") && entry.stage === "offered" && (
          <button
            onClick={() =>
              setActiveForm(activeForm === "decline" ? null : "decline")
            }
            className="rounded-lg border border-destructive/30 bg-card px-3 py-1.5 text-sm font-medium text-destructive shadow-sm hover:bg-destructive/10"
          >
            Decline
          </button>
        )}

        {allowed.includes("enrolled") && entry.stage === "accepted" && (
          <button
            onClick={() => handleTransition("enrolled")}
            disabled={isSubmitting}
            className="rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-success disabled:opacity-50"
          >
            Mark Enrolled
          </button>
        )}

        {/* Generic transitions */}
        {allowed
          .filter(
            (s) => !["offered", "accepted", "declined", "enrolled"].includes(s),
          )
          .map((stage) => (
            <button
              key={stage}
              onClick={() => {
                if (stage === "withdrawn") {
                  setActiveForm(activeForm === "withdraw" ? null : "withdraw");
                } else {
                  handleTransition(stage);
                }
              }}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted disabled:opacity-50"
            >
              → {STAGE_LABELS[stage] ?? stage}
            </button>
          ))}

        {/* Edit details */}
        <button
          onClick={() => setActiveForm(activeForm === "edit" ? null : "edit")}
          className="ml-auto rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          Edit Details
        </button>
      </div>

      {/* ── Expandable forms ────────────────────────────────── */}

      {/* Make Offer form */}
      {activeForm === "offer" && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary">
            Make Offer
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Program *
              </label>
              <input
                type="text"
                value={offerProgram}
                onChange={(e) => setOfferProgram(e.target.value)}
                placeholder="e.g., Primary 3-6"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Start Date *
              </label>
              <input
                type="date"
                value={offerStartDate}
                onChange={(e) => setOfferStartDate(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Offer Expires{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={offerExpiry}
                onChange={(e) => setOfferExpiry(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Notes{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                placeholder="Internal notes about this offer"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setActiveForm(null)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleMakeOffer}
              disabled={isSubmitting || !offerProgram.trim() || !offerStartDate}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-primary disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send Offer"}
            </button>
          </div>
        </div>
      )}

      {/* Decline form */}
      {activeForm === "decline" && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <h3 className="mb-3 text-sm font-semibold text-destructive">
            Decline Offer
          </h3>
          <textarea
            value={transitionNotes}
            onChange={(e) => setTransitionNotes(e.target.value)}
            rows={2}
            placeholder="Reason for declining (optional)"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setActiveForm(null);
                setTransitionNotes("");
              }}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => handleTransition("declined")}
              disabled={isSubmitting}
              className="rounded-lg bg-destructive px-4 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-destructive disabled:opacity-50"
            >
              {isSubmitting ? "Declining…" : "Confirm Decline"}
            </button>
          </div>
        </div>
      )}

      {/* Withdraw form */}
      {activeForm === "withdraw" && (
        <div className="mt-4 rounded-lg border border-border bg-muted p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Withdraw Entry
          </h3>
          <textarea
            value={transitionNotes}
            onChange={(e) => setTransitionNotes(e.target.value)}
            rows={2}
            placeholder="Reason for withdrawal (optional)"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setActiveForm(null);
                setTransitionNotes("");
              }}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => handleTransition("withdrawn")}
              disabled={isSubmitting}
              className="rounded-lg bg-muted-foreground px-4 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-muted-foreground disabled:opacity-50"
            >
              {isSubmitting ? "Withdrawing…" : "Confirm Withdraw"}
            </button>
          </div>
        </div>
      )}

      {/* Edit details form */}
      {activeForm === "edit" && (
        <div className="mt-4 rounded-lg border border-border bg-muted p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Edit Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Priority (0 = standard, higher = more urgent)
              </label>
              <input
                type="number"
                min={0}
                max={99}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-foreground">
                Admin Notes{" "}
                <span className="font-normal text-muted-foreground">
                  (not visible to parents)
                </span>
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this inquiry…"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setActiveForm(null)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDetails}
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-background shadow-sm hover:bg-primary disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save Details"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
