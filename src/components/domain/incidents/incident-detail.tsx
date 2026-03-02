"use client";

// src/components/domain/incidents/incident-detail.tsx
//
// Full incident record view plus the notification workflow:
//   1. Parent notification (24h - all incidents)
//   2. Regulatory notification (24h - serious incidents only)
//   3. Close incident
//
// The 24h countdown is computed client-side from occurred_at.

import type { IncidentWithStudents } from "@/types/domain";
import {
  recordParentNotification,
  recordRegulatorNotification,
  closeIncident,
} from "@/lib/actions/incidents";
import Link from "next/link";
import { useState, useTransition, useEffect } from "react";

interface Props {
  incident: IncidentWithStudents;
  canManage: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  injury: "Injury",
  illness: "Illness",
  trauma: "Trauma",
  near_miss: "Near Miss",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  parent_notified: "Parent Notified",
  regulator_notified: "Regulator Notified",
  closed: "Closed",
};

/** Live countdown that ticks every minute. */
function Countdown({
  occurredAt,
  label,
}: {
  occurredAt: string;
  label: string;
}) {
  const deadline = new Date(
    new Date(occurredAt).getTime() + 24 * 60 * 60 * 1000,
  );

  const getRemaining = () => {
    const diffMs = deadline.getTime() - Date.now();
    return diffMs;
  };

  const [diffMs, setDiffMs] = useState(getRemaining);

  useEffect(() => {
    const id = setInterval(() => setDiffMs(getRemaining()), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurredAt]);

  const isOverdue = diffMs <= 0;
  const absDiff = Math.abs(diffMs);
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  // Urgency thresholds: red < 8h, amber 8–12h, muted > 12h
  const color = isOverdue
    ? "var(--destructive)"
    : hours < 8
      ? "var(--destructive)"
      : hours < 12
        ? "var(--attendance-late)"
        : "var(--muted-foreground)";

  return (
    <div className="shrink-0 text-right">
      <p
        className="text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p className="text-sm font-semibold font-mono mt-0.5" style={{ color }}>
        {isOverdue
          ? `OVERDUE ${hours}h ${minutes}m`
          : `${hours}h ${minutes}m left`}
      </p>
    </div>
  );
}

export function IncidentDetail({ incident, canManage }: Props) {
  const [isPending, startTransition] = useTransition();
  const [currentIncident, setCurrentIncident] = useState(incident);

  // Parent notification form state
  const [showParentForm, setShowParentForm] = useState(false);
  const [parentMethod, setParentMethod] = useState<
    "in_app" | "phone" | "email" | "in_person"
  >("phone");
  const [parentNotes, setParentNotes] = useState("");

  // Regulator notification form state
  const [showRegulatorForm, setShowRegulatorForm] = useState(false);
  const [regulatorRef, setRegulatorRef] = useState("");
  const [regulatorNotifiedAt, setRegulatorNotifiedAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [regulatorNotes, setRegulatorNotes] = useState("");

  const [actionError, setActionError] = useState<string | null>(null);

  const handleParentNotification = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await recordParentNotification(currentIncident.id, {
        method: parentMethod,
        notes: parentNotes || null,
      });
      if (result.error) {
        setActionError(result.error.message);
        return;
      }
      setCurrentIncident({ ...currentIncident, ...result.data! });
      setShowParentForm(false);
    });
  };

  const handleRegulatorNotification = () => {
    if (!regulatorRef.trim()) {
      setActionError("NQA ITS reference number is required.");
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const result = await recordRegulatorNotification(currentIncident.id, {
        notified_at: new Date(regulatorNotifiedAt).toISOString(),
        reference: regulatorRef.trim(),
        notes: regulatorNotes || null,
      });
      if (result.error) {
        setActionError(result.error.message);
        return;
      }
      setCurrentIncident({ ...currentIncident, ...result.data! });
      setShowRegulatorForm(false);
    });
  };

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeIncident(currentIncident.id);
      if (result.error) {
        setActionError(result.error.message);
        return;
      }
      setCurrentIncident({ ...currentIncident, ...result.data! });
    });
  };

  const inc = currentIncident;
  const isClosed = inc.status === "closed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/incidents"
              className="touch-target text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              ← Register
            </Link>
          </div>
          <h1
            className="mt-2 text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {TYPE_LABEL[inc.incident_type]}
            {inc.is_serious_incident && (
              <span
                className="ml-2 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide align-middle"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 12%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                Serious
              </span>
            )}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {new Date(inc.occurred_at).toLocaleString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {inc.location}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize"
          style={{
            background: isClosed
              ? "var(--muted)"
              : "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: isClosed ? "var(--muted-foreground)" : "var(--primary)",
          }}
        >
          {STATUS_LABEL[inc.status]}
        </span>
      </div>

      {/* 24h parent notification countdown (all open incidents) */}
      {!inc.parent_notified_at && !isClosed && (
        <div
          className="rounded-[var(--radius-lg)] border p-4"
          style={{
            borderColor: "var(--attendance-late)",
            background:
              "color-mix(in srgb, var(--attendance-late) 6%, transparent)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Parent notification required - Reg 87
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Notify the parent or guardian within 24 hours of the incident.
              </p>
            </div>
            <Countdown occurredAt={inc.occurred_at} label="to notify parent" />
          </div>
        </div>
      )}

      {/* 24h regulator deadline countdown - serious incidents only */}
      {inc.is_serious_incident && !inc.regulator_notified_at && (
        <div
          className="rounded-[var(--radius-lg)] border p-4"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 6%, transparent)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--destructive)" }}
              >
                Regulatory notification required - Reg 87
              </p>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Notify the regulatory authority via NQA ITS within 24 hours of
                the incident.
              </p>
            </div>
            <Countdown
              occurredAt={inc.occurred_at}
              label="to notify regulator"
            />
          </div>
        </div>
      )}

      {/* Details card */}
      <div
        className="rounded-[var(--radius-lg)] border border-border space-y-0 overflow-hidden"
        style={{ background: "var(--background)" }}
      >
        <Section label="Children involved">
          {inc.students.length > 0
            ? inc.students
                .map((s) => `${s.first_name} ${s.last_name}`)
                .join(", ")
            : inc.student_ids.length > 0
              ? `${inc.student_ids.length} child${inc.student_ids.length > 1 ? "ren" : ""}`
              : "None recorded"}
        </Section>
        <Section label="Severity">
          <span className="capitalize">{inc.severity}</span>
          {inc.is_serious_incident && inc.serious_incident_reason && (
            <span
              className="text-xs ml-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              ({inc.serious_incident_reason})
            </span>
          )}
        </Section>
        <Section label="Description">{inc.description}</Section>
        {inc.first_aid_administered && (
          <Section label="First aid">{inc.first_aid_administered}</Section>
        )}
        {inc.witness_names.length > 0 && (
          <Section label="Witnesses">{inc.witness_names.join(", ")}</Section>
        )}
        {inc.recorded_by_user && (
          <Section label="Recorded by">
            {inc.recorded_by_user.first_name} {inc.recorded_by_user.last_name}
          </Section>
        )}
      </div>

      {/* Notification workflow */}
      {canManage && !isClosed && (
        <div className="space-y-3">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Notification workflow
          </h2>

          {/* Parent notification */}
          <WorkflowStep
            label="Parent notification"
            description="Inform the parent or guardian of the incident."
            completedAt={inc.parent_notified_at}
            completedLabel={
              inc.parent_notification_method
                ? `Notified by ${inc.parent_notification_method.replace("_", " ")} - ${new Date(inc.parent_notified_at!).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : undefined
            }
            onOpen={() => setShowParentForm((v) => !v)}
            showForm={showParentForm}
          >
            {showParentForm && (
              <div className="mt-3 space-y-3">
                <div>
                  <label
                    className="mb-1 block text-xs font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Notification method
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["phone", "in_app", "email", "in_person"] as const).map(
                      (m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setParentMethod(m)}
                          className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium capitalize transition-colors"
                          style={{
                            borderColor:
                              parentMethod === m
                                ? "var(--primary)"
                                : "var(--border)",
                            background:
                              parentMethod === m
                                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                                : "transparent",
                            color:
                              parentMethod === m
                                ? "var(--primary)"
                                : "var(--muted-foreground)",
                          }}
                        >
                          {m.replace("_", " ")}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <textarea
                  value={parentNotes}
                  onChange={(e) => setParentNotes(e.target.value)}
                  rows={2}
                  placeholder="Notes (optional)"
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                />
                <button
                  onClick={handleParentNotification}
                  disabled={isPending}
                  className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isPending ? "Saving…" : "Mark as notified"}
                </button>
              </div>
            )}
          </WorkflowStep>

          {/* Regulatory notification - serious only */}
          {inc.is_serious_incident && (
            <WorkflowStep
              label="Regulatory notification (NQA ITS)"
              description="Notify the regulatory authority within 24 hours. Record the NQA ITS reference number."
              completedAt={inc.regulator_notified_at}
              completedLabel={
                inc.regulator_notification_ref
                  ? `Notified - ref: ${inc.regulator_notification_ref} - ${new Date(inc.regulator_notified_at!).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                  : undefined
              }
              onOpen={() => setShowRegulatorForm((v) => !v)}
              showForm={showRegulatorForm}
              urgent
            >
              {showRegulatorForm && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-1 block text-xs font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        NQA ITS reference number{" "}
                        <span style={{ color: "var(--destructive)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={regulatorRef}
                        onChange={(e) => setRegulatorRef(e.target.value)}
                        placeholder="e.g. NQA-2026-XXXXXX"
                        className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                        style={{ color: "var(--foreground)" }}
                      />
                    </div>
                    <div>
                      <label
                        className="mb-1 block text-xs font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        Notification date/time
                      </label>
                      <input
                        type="datetime-local"
                        value={regulatorNotifiedAt}
                        onChange={(e) => setRegulatorNotifiedAt(e.target.value)}
                        className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                        style={{ color: "var(--foreground)" }}
                      />
                    </div>
                  </div>
                  <textarea
                    value={regulatorNotes}
                    onChange={(e) => setRegulatorNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes (optional)"
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                  <button
                    onClick={handleRegulatorNotification}
                    disabled={isPending}
                    className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    style={{
                      background: "var(--destructive)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {isPending ? "Saving…" : "Record notification"}
                  </button>
                </div>
              )}
            </WorkflowStep>
          )}

          {/* Close incident */}
          {inc.parent_notified_at &&
            (!inc.is_serious_incident || inc.regulator_notified_at) && (
              <div className="pt-2">
                <button
                  onClick={handleClose}
                  disabled={isPending}
                  className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {isPending ? "Closing…" : "Close incident"}
                </button>
              </div>
            )}
        </div>
      )}

      {actionError && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {actionError}
        </p>
      )}

      {/* Closed banner */}
      {isClosed && inc.closed_at && (
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Closed{" "}
          {new Date(inc.closed_at).toLocaleString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          . Records retained per Reg 87 retention requirements.
        </p>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-6"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <dt
        className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </dt>
      <dd className="text-sm" style={{ color: "var(--foreground)" }}>
        {children}
      </dd>
    </div>
  );
}

interface WorkflowStepProps {
  label: string;
  description: string;
  completedAt: string | null;
  completedLabel?: string;
  onOpen: () => void;
  showForm: boolean;
  urgent?: boolean;
  children?: React.ReactNode;
}

function WorkflowStep({
  label,
  description,
  completedAt,
  completedLabel,
  onOpen,
  showForm,
  urgent,
  children,
}: WorkflowStepProps) {
  const done = !!completedAt;
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 space-y-1"
      style={{
        borderColor: done
          ? "var(--border)"
          : urgent
            ? "var(--destructive)"
            : "var(--border)",
        background: done ? "var(--muted)" : "var(--background)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {done ? (
              <svg
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--attendance-present)" }}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            ) : (
              <span
                className="h-4 w-4 shrink-0 rounded-full border-2"
                style={{
                  borderColor: urgent
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
                }}
              />
            )}
            <span
              className="text-sm font-semibold"
              style={{
                color: done ? "var(--muted-foreground)" : "var(--foreground)",
              }}
            >
              {label}
            </span>
          </div>
          <p
            className="mt-0.5 ml-6 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {done && completedLabel ? completedLabel : description}
          </p>
        </div>
        {!done && (
          <button
            onClick={onOpen}
            className="active-push touch-target shrink-0 rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              borderColor: urgent ? "var(--destructive)" : "var(--primary)",
              color: urgent ? "var(--destructive)" : "var(--primary)",
              background: urgent
                ? showForm
                  ? "color-mix(in srgb, var(--destructive) 8%, transparent)"
                  : "transparent"
                : showForm
                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : "transparent",
            }}
          >
            {showForm ? "Cancel" : "Record"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
