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

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [approvedClassId, setApprovedClassId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [changeNotes, setChangeNotes] = useState("");

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);

  useEffect(() => {
    if (activePanel === "approve" && classes.length === 0) {
      setClassesLoading(true);
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
        .catch(() => setClasses([]))
        .finally(() => setClassesLoading(false));
    }
  }, [activePanel, classes.length]);

  useEffect(() => {
    if (currentStatus === "submitted") {
      startTransition(async () => {
        await markUnderReview(applicationId);
        router.refresh();
      });
    }
  }, [applicationId, currentStatus, router]);

  async function handleApprove() {
    setError(null);
    setSuccess(null);
    if (!approvedClassId) { setError("Please select a class before approving."); return; }

    startTransition(async () => {
      const result = await approveApplication(applicationId, {
        approved_class_id: approvedClassId,
        admin_notes: adminNotes.trim() || null,
      });

      if (result.error) setError(result.error.message);
      else {
        setSuccess(`Application approved!`);
        setActivePanel(null);
        router.refresh();
      }
    });
  }

  async function handleReject() {
    setError(null);
    setSuccess(null);
    if (!rejectionReason.trim()) { setError("Please provide a rejection reason."); return; }

    startTransition(async () => {
      const result = await rejectApplication(applicationId, rejectionReason.trim());
      if (result.error) setError(result.error.message);
      else {
        setSuccess("Application rejected.");
        setActivePanel(null);
        router.refresh();
      }
    });
  }

  async function handleRequestChanges() {
    setError(null);
    setSuccess(null);
    if (!changeNotes.trim()) { setError("Please describe what changes are needed."); return; }

    startTransition(async () => {
      const result = await requestApplicationChanges(applicationId, changeNotes.trim());
      if (result.error) setError(result.error.message);
      else {
        setSuccess("Change request sent.");
        setActivePanel(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm animate-fade-in-up">
      <div className="border-b border-border bg-muted/10 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Review Actions</h2>
      </div>
      <div className="px-5 py-4">
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-success/10 px-4 py-3 text-sm text-success border border-success/20">{success}</div>}

        {!activePanel && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActivePanel("approve")}
              disabled={isPending}
              className="rounded-lg bg-success px-5 py-2.5 text-sm font-bold text-success-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              Approve & Enroll
            </button>
            <button
              onClick={() => setActivePanel("changes")}
              disabled={isPending}
              className="rounded-lg bg-warning px-5 py-2.5 text-sm font-bold text-warning-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              Request Changes
            </button>
            <button
              onClick={() => setActivePanel("reject")}
              disabled={isPending}
              className="rounded-lg bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-danger"
            >
              Reject
            </button>
          </div>
        )}

        {activePanel === "approve" && (
          <div className="animate-scale-in">
            <div className="rounded-lg bg-success/5 border border-success/20 p-4">
              <h3 className="mb-3 text-sm font-bold text-success">Approve & Enroll</h3>
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Assign to Class <span className="text-destructive">*</span></label>
                {classesLoading ? <p className="text-xs animate-pulse">Loading...</p> : (
                  <select
                    value={approvedClassId}
                    onChange={(e) => setApprovedClassId(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-success focus:ring-1 focus:ring-success"
                  >
                    <option value="">Select a class…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes…"
                className="mb-4 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-success focus:ring-1 focus:ring-success"
              />
              <div className="flex gap-2">
                <button onClick={handleApprove} disabled={isPending} className="rounded-lg bg-success px-5 py-2 text-sm font-bold text-success-foreground">Confirm Approval</button>
                <button onClick={() => setActivePanel(null)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {activePanel === "changes" && (
          <div className="animate-scale-in">
            <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
              <h3 className="mb-3 text-sm font-bold text-warning-foreground uppercase tracking-wider">Request Changes</h3>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={3}
                className="mb-4 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-warning focus:ring-1 focus:ring-warning"
                placeholder="What needs to change?"
              />
              <div className="flex gap-2">
                <button onClick={handleRequestChanges} disabled={isPending} className="rounded-lg bg-warning px-5 py-2 text-sm font-bold text-warning-foreground">Send Request</button>
                <button onClick={() => setActivePanel(null)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {activePanel === "reject" && (
          <div className="animate-scale-in">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
              <h3 className="mb-3 text-sm font-bold text-destructive uppercase tracking-wider">Reject Application</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="mb-4 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-destructive focus:ring-1 focus:ring-destructive"
                placeholder="Rejection reason..."
              />
              <div className="flex gap-2">
                <button onClick={handleReject} disabled={isPending} className="rounded-lg bg-destructive px-5 py-2 text-sm font-bold text-destructive-foreground">Confirm Rejection</button>
                <button onClick={() => setActivePanel(null)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}