// src/components/domain/debt/debt-detail-client.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type {
  DebtCollectionRecordWithDetails,
  DebtCollectionStage,
  DebtReminderLogEntry,
} from "@/types/domain";
import {
  advanceDebtStage,
  sendDebtReminder,
  updateDebtStageNotes,
} from "@/lib/actions/debt";
import { DebtStageBadge, DebtAgingBadge } from "./debt-stage-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  record: DebtCollectionRecordWithDetails;
  reminders: DebtReminderLogEntry[];
  canManage: boolean;
  canApproveWriteOff: boolean;
}

type Tab = "overview" | "reminders" | "plan" | "write-off";

const NEXT_STAGES: Record<DebtCollectionStage, { label: string; next: DebtCollectionStage }[]> = {
  overdue:         [{ label: "Send Reminder 1", next: "reminder_1_sent" }, { label: "Escalate", next: "escalated" }],
  reminder_1_sent: [{ label: "Send Reminder 2", next: "reminder_2_sent" }, { label: "Escalate", next: "escalated" }],
  reminder_2_sent: [{ label: "Send Final Notice", next: "reminder_3_sent" }, { label: "Escalate", next: "escalated" }],
  reminder_3_sent: [{ label: "Escalate to Management", next: "escalated" }, { label: "Create Payment Plan", next: "payment_plan" }],
  escalated:       [{ label: "Create Payment Plan", next: "payment_plan" }, { label: "Refer to Collection", next: "referred" }],
  payment_plan:    [{ label: "Refer to Collection", next: "referred" }, { label: "Mark Resolved", next: "resolved" }],
  referred:        [{ label: "Mark Resolved", next: "resolved" }],
  written_off:     [],
  resolved:        [],
};

export function DebtDetailClient({ record, reminders, canManage, canApproveWriteOff }: Props) {
  const haptics = useHaptics();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(record.internal_notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const outstanding = record.invoice
    ? record.invoice.total_cents - record.invoice.amount_paid_cents
    : record.outstanding_cents;

  const guardianUser = record.guardian?.user;
  const nextStages = NEXT_STAGES[record.stage] ?? [];

  function showMsg(msg: string, isError = false) {
    if (isError) { setError(msg); setTimeout(() => setError(null), 5000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 5000); }
  }

  function handleAdvance(next: DebtCollectionStage) {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await advanceDebtStage({
        collection_stage_id: record.id,
        stage: next as "reminder_1_sent" | "reminder_2_sent" | "reminder_3_sent" | "escalated" | "payment_plan" | "referred" | "written_off" | "resolved",
        internal_notes: null,
      });
      if (result.error) showMsg(result.error.message, true);
      else showMsg(`Stage advanced to: ${next.replace(/_/g, " ")}`);
    });
  }

  function handleSendReminder() {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await sendDebtReminder({ collection_stage_id: record.id, sequence_number: null, send_via_sms: false });
      if (result.error) showMsg(result.error.message, true);
      else showMsg("Reminder sent and stage updated");
    });
  }

  function handleSaveNotes() {
    haptics.impact("light");
    startTransition(async () => {
      const result = await updateDebtStageNotes({ collection_stage_id: record.id, internal_notes: notes, assigned_to_user_id: null });
      if (result.error) showMsg(result.error.message, true);
      else { setEditingNotes(false); showMsg("Notes saved"); }
    });
  }

  const isResolved = record.stage === "resolved" || record.stage === "written_off";

  return (
    <div className="flex flex-col gap-4 pb-tab-bar">

      {/* ── Back + Title ── */}
      <div>
        <Link
          href="/admin/debt"
          style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", textDecoration: "none" }}
        >
          ← Debt Management
        </Link>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)", marginTop: "0.35rem" }}>
          {record.student
            ? `${record.student.first_name} ${record.student.last_name}`
            : "Debt Record"}
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
          Invoice {record.invoice?.invoice_number ?? "-"}
          {record.invoice && ` · Due ${formatDate(record.invoice.due_date)}`}
        </p>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div style={{ padding: "0.65rem 1rem", borderRadius: "var(--radius)", background: "var(--debt-overdue-bg)", color: "var(--debt-overdue-fg)", fontSize: "0.84rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "0.65rem 1rem", borderRadius: "var(--radius)", background: "var(--debt-resolved-bg)", color: "var(--debt-resolved-fg)", fontSize: "0.84rem" }}>
          {success}
        </div>
      )}

      {/* ── Status Bar ── */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <DebtStageBadge stage={record.stage} />
            <DebtAgingBadge daysOverdue={record.days_overdue} />
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--foreground)" }}>
            {formatCents(outstanding)}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
            outstanding
            {record.invoice && ` of ${formatCents(record.invoice.total_cents)}`}
          </p>
        </div>

        {!isResolved && canManage && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Quick reminder button */}
            {["overdue", "reminder_1_sent", "reminder_2_sent"].includes(record.stage) && (
              <button
                onClick={handleSendReminder}
                disabled={isPending}
                className="touch-target active-push"
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--debt-reminder-bg)",
                  color: "var(--debt-reminder-fg)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isPending ? "wait" : "pointer",
                }}
              >
                Send Reminder
              </button>
            )}
            {nextStages.map(({ label, next }) => (
              <button
                key={next}
                onClick={() => handleAdvance(next)}
                disabled={isPending}
                className="touch-target active-push"
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: isPending ? "wait" : "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 0 }}>
        {(["overview", "reminders", "plan", "write-off"] as Tab[]).map(tab => {
          const labels: Record<Tab, string> = { overview: "Overview", reminders: "Reminders", plan: "Payment Plan", "write-off": "Write-Off" };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => { haptics.impact("light"); setActiveTab(tab); }}
              className="touch-target"
              style={{
                padding: "0.55rem 1rem",
                fontSize: "0.85rem",
                fontWeight: active ? 700 : 500,
                color: active ? "var(--primary)" : "var(--muted-foreground)",
                borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Account details */}
          <DetailCard title="Account">
            <DetailRow label="Invoice" value={record.invoice?.invoice_number ?? "-"} />
            <DetailRow label="Student" value={record.student ? `${record.student.first_name} ${record.student.last_name}` : "-"} />
            <DetailRow
              label="Guardian"
              value={guardianUser ? `${guardianUser.first_name ?? ""} ${guardianUser.last_name ?? ""}`.trim() : "-"}
            />
            <DetailRow label="Email" value={guardianUser?.email ?? "-"} />
            <DetailRow label="Invoice Total" value={record.invoice ? formatCents(record.invoice.total_cents) : "-"} />
            <DetailRow label="Amount Paid" value={record.invoice ? formatCents(record.invoice.amount_paid_cents) : "-"} />
            <DetailRow label="Outstanding" value={formatCents(outstanding)} bold />
            <DetailRow label="Due Date" value={record.invoice ? formatDate(record.invoice.due_date) : "-"} />
            <DetailRow label="Days Overdue" value={`${record.days_overdue} days`} />
            <DetailRow label="In Collection Since" value={formatDate(record.created_at)} />
          </DetailCard>

          {/* Internal notes */}
          <DetailCard
            title="Internal Notes"
            action={canManage && !editingNotes ? { label: "Edit", onClick: () => setEditingNotes(true) } : undefined}
          >
            {editingNotes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add internal notes about this debt (not visible to guardian)…"
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.85rem",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isPending}
                    className="touch-target active-push"
                    style={{ padding: "0.4rem 0.85rem", borderRadius: "var(--radius)", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.82rem", fontWeight: 600, border: "none", cursor: "pointer" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingNotes(false)}
                    style={{ padding: "0.4rem 0.85rem", borderRadius: "var(--radius)", background: "var(--card)", color: "var(--muted-foreground)", fontSize: "0.82rem", border: "1px solid var(--border)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: notes ? "var(--foreground)" : "var(--muted-foreground)", whiteSpace: "pre-wrap" }}>
                {notes || "No internal notes"}
              </p>
            )}
          </DetailCard>

          {/* Last reminder */}
          {record.latest_reminder && (
            <DetailCard title="Last Reminder Sent">
              <DetailRow
                label="Date"
                value={formatDate(record.latest_reminder.sent_at)}
              />
              <DetailRow label="Subject" value={record.latest_reminder.subject} />
              {record.latest_reminder.sequence_number && (
                <DetailRow label="Sequence" value={`Reminder #${record.latest_reminder.sequence_number}`} />
              )}
            </DetailCard>
          )}
        </div>
      )}

      {/* ── Tab: Reminders ── */}
      {activeTab === "reminders" && (
        <div className="flex flex-col gap-3">
          {canManage && !isResolved && (
            <button
              onClick={handleSendReminder}
              disabled={isPending}
              className="touch-target active-push"
              style={{
                alignSelf: "flex-start",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius)",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "0.83rem",
                fontWeight: 600,
                border: "none",
                cursor: isPending ? "wait" : "pointer",
              }}
            >
              Send Next Reminder
            </button>
          )}

          {reminders.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", padding: "1rem 0" }}>
              No reminders sent yet
            </p>
          ) : (
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              {reminders.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    padding: "0.9rem 1.25rem",
                    borderBottom: i < reminders.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--foreground)" }}>
                      {r.subject}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", whiteSpace: "nowrap", marginLeft: "0.75rem" }}>
                      {formatDate(r.sent_at)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {r.sequence_number && (
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", background: "var(--debt-reminder-bg)", color: "var(--debt-reminder-fg)" }}>
                        #{r.sequence_number}
                      </span>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                      {r.reminder_type === "manual" ? "Manual send" : "Auto"}
                    </span>
                    {r.sent_via_email && <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Email</span>}
                    {r.sent_via_notification && <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>Notification</span>}
                    {r.sent_via_sms && <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>SMS</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Payment Plan ── */}
      {activeTab === "plan" && (
        <div className="flex flex-col gap-3">
          {record.payment_plan ? (
            <PaymentPlanSummary planId={record.payment_plan.id} />
          ) : (
            <div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                No payment plan exists for this account.
              </p>
              {canManage && !isResolved && (
                <Link
                  href={`/admin/debt/${record.id}/plan/new`}
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius)",
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "0.83rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Create Payment Plan
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Write-Off ── */}
      {activeTab === "write-off" && (
        <div className="flex flex-col gap-3">
          {record.write_off ? (
            <DetailCard title="Write-Off Record">
              <DetailRow label="Amount Written Off" value={formatCents(record.write_off.write_off_amount_cents)} bold />
              <DetailRow label="Reason" value={record.write_off.reason.replace(/_/g, " ")} />
              <DetailRow label="Approved" value={formatDate(record.write_off.approved_at)} />
              {record.write_off.write_off_reference && (
                <DetailRow label="Reference" value={record.write_off.write_off_reference} />
              )}
              {record.write_off.reason_notes && (
                <DetailRow label="Notes" value={record.write_off.reason_notes} />
              )}
            </DetailCard>
          ) : (
            <div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                No write-off has been processed for this account.
              </p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                Write-offs require the <strong>Approve Write-Offs</strong> permission. The debt will be marked as written off and the invoice will be voided.
              </p>
              {canApproveWriteOff && !isResolved && (
                <Link
                  href={`/admin/debt/${record.id}/write-off`}
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius)",
                    background: "var(--debt-written-off-bg)",
                    color: "var(--debt-written-off-fg)",
                    fontSize: "0.83rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    border: "1px solid var(--border)",
                  }}
                >
                  Process Write-Off
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Small reusable sub-components ────────────────────────────

function DetailCard({
  title, children, action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.7rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--foreground)" }}>{title}</p>
        {action && (
          <button
            onClick={action.onClick}
            style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
          >
            {action.label}
          </button>
        )}
      </div>
      <div style={{ padding: "0.9rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
      <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.85rem", color: "var(--foreground)", fontWeight: bold ? 700 : 400, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function PaymentPlanSummary({ planId }: { planId: string }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.25rem",
      }}
    >
      <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--foreground)", marginBottom: "0.5rem" }}>
        Payment Plan Active
      </p>
      <Link
        href={`/admin/debt/plans/${planId}`}
        style={{
          display: "inline-block",
          padding: "0.4rem 0.85rem",
          borderRadius: "var(--radius)",
          background: "var(--debt-payment-plan-bg)",
          color: "var(--debt-payment-plan-fg)",
          fontSize: "0.82rem",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        View Plan Details →
      </Link>
    </div>
  );
}
