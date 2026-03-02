"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  getComplaint,
  addComplaintResponse,
  resolveComplaint,
  escalateComplaint,
} from "@/lib/actions/policies";
import type { ComplaintWithResponses } from "@/lib/actions/policies";
import { ComplaintStatusBadge } from "@/components/domain/policies/complaint-status-badge";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ComplaintDetailPage({ params }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [complaint, setComplaint] = useState<ComplaintWithResponses | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response form state
  const [actionTaken, setActionTaken] = useState("");
  const [responseNotes, setResponseNotes] = useState("");

  // Resolve form state
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionOutcome, setResolutionOutcome] = useState("");

  // Escalate form state
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalatedTo, setEscalatedTo] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      getComplaint(id).then((result) => {
        if (!result.error && result.data) {
          setComplaint(result.data);
        } else {
          setError(result.error?.message ?? "Complaint not found");
        }
        setLoading(false);
      });
    });
  }, [params]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--muted-foreground)" }}>Loading...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {error ?? "Complaint not found."}
        </p>
        <Link
          href="/admin/policies"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to complaints
        </Link>
      </div>
    );
  }

  function handleAddResponse() {
    if (!complaint) return;
    startTransition(async () => {
      const result = await addComplaintResponse({
        complaint_id: complaint.id,
        action_taken: actionTaken,
        notes: responseNotes || undefined,
      });
      if (!result.error) {
        haptics.success();
        setActionTaken("");
        setResponseNotes("");
        // Refresh complaint data
        const refreshed = await getComplaint(complaint.id);
        if (!refreshed.error && refreshed.data) setComplaint(refreshed.data);
      } else {
        haptics.error();
      }
    });
  }

  function handleResolve() {
    if (!complaint) return;
    startTransition(async () => {
      const result = await resolveComplaint({
        complaint_id: complaint.id,
        resolution_outcome: resolutionOutcome,
      });
      if (!result.error) {
        haptics.heavy();
        setShowResolve(false);
        const refreshed = await getComplaint(complaint.id);
        if (!refreshed.error && refreshed.data) setComplaint(refreshed.data);
      } else {
        haptics.error();
      }
    });
  }

  function handleEscalate() {
    if (!complaint) return;
    startTransition(async () => {
      const result = await escalateComplaint({
        complaint_id: complaint.id,
        escalated_to: escalatedTo,
      });
      if (!result.error) {
        haptics.warning();
        setShowEscalate(false);
        const refreshed = await getComplaint(complaint.id);
        if (!refreshed.error && refreshed.data) setComplaint(refreshed.data);
      } else {
        haptics.error();
      }
    });
  }

  const isOpen =
    complaint.status === "open" || complaint.status === "in_progress";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/policies"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Complaints
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span className="truncate" style={{ color: "var(--foreground)" }}>
          {complaint.subject}
        </span>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {complaint.subject}
            </h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {complaint.description}
            </p>
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span className="capitalize">{complaint.complainant_type}</span>
              {complaint.complainant_name && (
                <span>{complaint.complainant_name}</span>
              )}
              <span>Received {formatDate(complaint.received_at)}</span>
              {complaint.target_resolution_date && (
                <span>Due {formatDate(complaint.target_resolution_date)}</span>
              )}
            </div>
          </div>
          <ComplaintStatusBadge status={complaint.status} size="md" />
        </div>

        {/* Resolution / Escalation info */}
        {complaint.resolved_at && (
          <div
            className="mt-4 rounded-[var(--radius-md)] border p-3 text-sm"
            style={{
              borderColor: "var(--success)",
              background: "color-mix(in srgb, var(--success) 8%, transparent)",
              color: "var(--success)",
            }}
          >
            Resolved on {formatDate(complaint.resolved_at)}
            {complaint.resolution_outcome &&
              ` - ${complaint.resolution_outcome}`}
          </div>
        )}

        {complaint.escalated_at && (
          <div
            className="mt-4 rounded-[var(--radius-md)] border p-3 text-sm"
            style={{
              borderColor: "var(--complaint-escalated)",
              background: "var(--complaint-escalated-bg)",
              color: "var(--complaint-escalated)",
            }}
          >
            Escalated to {complaint.escalated_to} on{" "}
            {formatDate(complaint.escalated_at)}
          </div>
        )}

        {/* Action buttons */}
        {isOpen && (
          <div
            className="mt-4 flex flex-wrap gap-2 border-t pt-4"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                setShowResolve(true);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
              style={{ background: "var(--success)", color: "#fff" }}
            >
              Resolve
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.medium();
                setShowEscalate(true);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: "var(--complaint-escalated)",
                color: "var(--complaint-escalated)",
              }}
            >
              Escalate
            </button>
          </div>
        )}
      </div>

      {/* Response history */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Response Log ({complaint.responses.length})
        </h2>

        {complaint.responses.length > 0 && (
          <div className="space-y-3 mb-4">
            {complaint.responses.map((response) => (
              <div
                key={response.id}
                className="rounded-[var(--radius-md)] border border-border p-3"
              >
                <p className="text-sm" style={{ color: "var(--foreground)" }}>
                  {response.action_taken}
                </p>
                {response.notes && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {response.notes}
                  </p>
                )}
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {new Date(response.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add response form */}
        {isOpen && (
          <div
            className="space-y-3 border-t pt-4"
            style={{ borderColor: "var(--border)" }}
          >
            <h3
              className="text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Add Response
            </h3>
            <textarea
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Describe the action taken..."
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
            <input
              type="text"
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddResponse}
                disabled={isPending || !actionTaken.trim()}
                className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isPending ? "Saving..." : "Add Response"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resolve modal */}
      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border p-6 space-y-4"
            style={{ background: "var(--card)" }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Resolve Complaint
            </h3>
            <textarea
              value={resolutionOutcome}
              onChange={(e) => setResolutionOutcome(e.target.value)}
              placeholder="Describe the resolution outcome..."
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResolve(false)}
                className="active-push rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={isPending || !resolutionOutcome.trim()}
                className="active-push rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--success)", color: "#fff" }}
              >
                {isPending ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate modal */}
      {showEscalate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border p-6 space-y-4"
            style={{ background: "var(--card)" }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Escalate Complaint
            </h3>
            <input
              type="text"
              value={escalatedTo}
              onChange={(e) => setEscalatedTo(e.target.value)}
              placeholder="e.g. Approved Provider, ACECQA, etc."
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEscalate(false)}
                className="active-push rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEscalate}
                disabled={isPending || !escalatedTo.trim()}
                className="active-push rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "var(--complaint-escalated)",
                  color: "#fff",
                }}
              >
                {isPending ? "Escalating..." : "Escalate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
