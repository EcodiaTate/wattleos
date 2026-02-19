// src/app/(app)/admin/enrollment/applications/[id]/approval-actions.tsx
//
// ============================================================
// WattleOS V2 - Application Approval Actions (Module 10)
// ============================================================
// 'use client' - interactive panel with the three admin actions:
//   1. Approve (requires class assignment)
//   2. Reject (requires reason)
//   3. Request Changes (requires notes)
//
// WHY separate from the page: The page is a server component
// for fast data fetching. These buttons need client state
// (form inputs, pending states, confirmation dialogs).
// ============================================================

"use client";

import {
  approveApplication,
  markUnderReview,
  rejectApplication,
  requestApplicationChanges,
} from "@/lib/actions/enroll";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface ApprovalActionsProps {
  applicationId: string;
  currentStatus: string;
}

interface ClassOption {
  id: string;
  name: string;
  room: string | null;
  cycle_level: string | null;
}

export function ApprovalActions({
  applicationId,
  currentStatus,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active panel: null, 'approve', 'reject', 'changes'
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // Approve form state
  const [approvedClassId, setApprovedClassId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState("");

  // Changes form state
  const [changeNotes, setChangeNotes] = useState("");

  // Classes list (fetched from the API)
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  // Fetch classes when approve panel opens
  useEffect(() => {
    if (activePanel === "approve" && classes.length === 0) {
      setClassesLoading(true);
      // Import dynamically to avoid circular deps
      import("@/lib/actions/classes")
        .then((mod) => mod.listClasses())
        .then((result) => {
          if (result.data) {
            setClasses(
              (result.data as ClassOption[]).map((c) => ({
                id: c.id,
                name: c.name,
                room: c.room,
                cycle_level: c.cycle_level,
              })),
            );
          }
        })
        .catch(() => {
          // If classes action doesn't exist yet, provide empty list
          setClasses([]);
        })
        .finally(() => setClassesLoading(false));
    }
  }, [activePanel, classes.length]);

  // Auto-mark as under review when first opened
  useEffect(() => {
    if (currentStatus === "submitted") {
      startTransition(async () => {
        await markUnderReview(applicationId);
        router.refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove() {
    setError(null);
    setSuccess(null);

    if (!approvedClassId) {
      setError("Please select a class before approving.");
      return;
    }

    startTransition(async () => {
      const result = await approveApplication(applicationId, {
        approved_class_id: approvedClassId,
        admin_notes: adminNotes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(
          `Application approved! Student created. ${result.data?.invitation_count ?? 0} parent invitation(s) sent.`,
        );
        setActivePanel(null);
        router.refresh();
      }
    });
  }

  async function handleReject() {
    setError(null);
    setSuccess(null);

    if (!rejectionReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    startTransition(async () => {
      const result = await rejectApplication(
        applicationId,
        rejectionReason.trim(),
      );

      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess("Application rejected.");
        setActivePanel(null);
        router.refresh();
      }
    });
  }

  async function handleRequestChanges() {
    setError(null);
    setSuccess(null);

    if (!changeNotes.trim()) {
      setError("Please describe what changes are needed.");
      return;
    }

    startTransition(async () => {
      const result = await requestApplicationChanges(
        applicationId,
        changeNotes.trim(),
      );

      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess("Change request sent to parent.");
        setActivePanel(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Review Actions</h2>
      </div>
      <div className="px-5 py-4">
        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Action buttons */}
        {!activePanel && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActivePanel("approve")}
              disabled={isPending}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Approve & Enroll
            </button>
            <button
              onClick={() => setActivePanel("changes")}
              disabled={isPending}
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              Request Changes
            </button>
            <button
              onClick={() => setActivePanel("reject")}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}

        {/* ── Approve Panel ───────────────────────────────── */}
        {activePanel === "approve" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-green-900">
                Approve & Enroll
              </h3>
              <p className="mb-4 text-xs text-green-700">
                This will create the student record, guardian links, medical
                conditions, emergency contacts, and send parent invitations.
              </p>

              {/* Class selection */}
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-green-900">
                  Assign to Class <span className="text-red-500">*</span>
                </label>
                {classesLoading ? (
                  <p className="text-xs text-green-600">Loading classes…</p>
                ) : classes.length === 0 ? (
                  <div>
                    <p className="text-xs text-amber-700">
                      No classes found. You may need to create classes first, or
                      enter the class ID manually:
                    </p>
                    <input
                      type="text"
                      value={approvedClassId}
                      onChange={(e) => setApprovedClassId(e.target.value)}
                      placeholder="Class UUID"
                      className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <select
                    value={approvedClassId}
                    onChange={(e) => setApprovedClassId(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">Select a class…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.room ? ` - ${c.room}` : ""}
                        {c.cycle_level ? ` (${c.cycle_level})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Admin notes */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-green-900">
                  Admin Notes{" "}
                  <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes about this enrollment…"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={isPending}
                  className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isPending ? "Approving…" : "Confirm Approval"}
                </button>
                <button
                  onClick={() => setActivePanel(null)}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Request Changes Panel ───────────────────────── */}
        {activePanel === "changes" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-amber-900">
                Request Changes
              </h3>
              <p className="mb-4 text-xs text-amber-700">
                The parent will be notified and can update their application.
              </p>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-amber-900">
                  What needs to change? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  rows={3}
                  placeholder="Please update the emergency contact phone number…"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRequestChanges}
                  disabled={isPending}
                  className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isPending ? "Sending…" : "Send Change Request"}
                </button>
                <button
                  onClick={() => setActivePanel(null)}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reject Panel ────────────────────────────────── */}
        {activePanel === "reject" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-red-900">
                Reject Application
              </h3>
              <p className="mb-4 text-xs text-red-700">
                The parent will see this reason. This action is final.
              </p>

              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-red-900">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Unfortunately, we are unable to offer a place at this time because…"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={isPending}
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? "Rejecting…" : "Confirm Rejection"}
                </button>
                <button
                  onClick={() => setActivePanel(null)}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
