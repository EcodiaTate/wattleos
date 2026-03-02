// src/components/domain/debt/reminder-sequences-client.tsx
"use client";

import { useState, useTransition } from "react";
import type { DebtReminderSequence } from "@/types/domain";
import { upsertReminderSequence } from "@/lib/actions/debt";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  sequences: DebtReminderSequence[];
}

export function ReminderSequencesClient({ sequences: initial }: Props) {
  const haptics = useHaptics();
  const [sequences, setSequences] = useState(initial);
  const [editingSeq, setEditingSeq] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Find or create an edit buffer for a sequence
  const getSeq = (num: number): Partial<DebtReminderSequence> =>
    sequences.find(s => s.sequence_number === num) ?? {
      sequence_number: num,
      trigger_days_overdue: num * 7,
      subject_template: "",
      body_template: "",
      send_via_notification: true,
      send_via_email: true,
      is_active: true,
    };

  const [editBuffer, setEditBuffer] = useState<Partial<DebtReminderSequence>>({});

  function startEdit(num: number) {
    haptics.impact("light");
    setEditBuffer({ ...getSeq(num) });
    setEditingSeq(num);
  }

  function handleSave() {
    if (!editBuffer.sequence_number) return;
    haptics.impact("medium");
    startTransition(async () => {
      const result = await upsertReminderSequence({
        sequence_number: editBuffer.sequence_number!,
        trigger_days_overdue: editBuffer.trigger_days_overdue ?? 7,
        subject_template: editBuffer.subject_template ?? "",
        body_template: editBuffer.body_template ?? "",
        send_via_notification: editBuffer.send_via_notification ?? true,
        send_via_email: editBuffer.send_via_email ?? true,
        is_active: editBuffer.is_active ?? true,
      });
      if (result.error) {
        setError(result.error.message);
        setTimeout(() => setError(null), 5000);
      } else {
        setSuccess(`Sequence #${editBuffer.sequence_number} saved`);
        setTimeout(() => setSuccess(null), 3000);
        setSequences(prev => {
          const idx = prev.findIndex(s => s.sequence_number === editBuffer.sequence_number);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = result.data!;
            return next;
          }
          return [...prev, result.data!];
        });
        setEditingSeq(null);
      }
    });
  }

  const PLACEHOLDERS = [
    "{{invoice_number}}", "{{student_name}}", "{{guardian_name}}",
    "{{amount_owing}}", "{{due_date}}", "{{school_name}}",
  ];

  return (
    <div className="flex flex-col gap-6 pb-tab-bar">
      <div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--foreground)" }}>
          Reminder Templates
        </h1>
        <p style={{ fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
          Configure automated reminder sequences sent to families with overdue accounts.
        </p>
      </div>

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

      {/* Placeholder reference */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-lg)",
          background: "var(--muted)",
          fontSize: "0.8rem",
          color: "var(--muted-foreground)",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "var(--foreground)" }}>Available placeholders:</strong>
        <br />
        {PLACEHOLDERS.map(p => (
          <code key={p} style={{ marginRight: "0.5rem", background: "var(--background)", padding: "0.1rem 0.3rem", borderRadius: "var(--radius-sm)", fontSize: "0.78rem" }}>
            {p}
          </code>
        ))}
      </div>

      {[1, 2, 3].map(num => {
        const seq = getSeq(num);
        const isEditing = editingSeq === num;
        const triggerLabel = seq.trigger_days_overdue
          ? `Sent at ${seq.trigger_days_overdue} days overdue`
          : "";

        return (
          <div
            key={num}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0.8rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>
                  Reminder #{num}
                </p>
                {triggerLabel && (
                  <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>{triggerLabel}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {seq.is_active !== undefined && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "var(--radius-full)",
                      background: seq.is_active ? "var(--debt-resolved-bg)" : "var(--muted)",
                      color: seq.is_active ? "var(--debt-resolved-fg)" : "var(--muted-foreground)",
                    }}
                  >
                    {seq.is_active ? "Active" : "Inactive"}
                  </span>
                )}
                {!isEditing && (
                  <button
                    onClick={() => startEdit(num)}
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--primary)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: "1rem 1.25rem" }}>
              {!isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div>
                    <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: "0.2rem" }}>
                      Subject
                    </p>
                    <p style={{ fontSize: "0.85rem", color: "var(--foreground)" }}>
                      {seq.subject_template || <em style={{ color: "var(--muted-foreground)" }}>Not configured</em>}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: "0.2rem" }}>
                      Body Preview
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>
                      {seq.body_template || <em>Not configured</em>}
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: "0.3rem" }}>
                      Trigger (days overdue)
                    </label>
                    <input
                      type="number"
                      value={editBuffer.trigger_days_overdue ?? ""}
                      onChange={e => setEditBuffer(b => ({ ...b, trigger_days_overdue: parseInt(e.target.value, 10) }))}
                      min={1}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: "0.3rem" }}>
                      Subject
                    </label>
                    <input
                      type="text"
                      value={editBuffer.subject_template ?? ""}
                      onChange={e => setEditBuffer(b => ({ ...b, subject_template: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: "0.3rem" }}>
                      Body
                    </label>
                    <textarea
                      value={editBuffer.body_template ?? ""}
                      onChange={e => setEditBuffer(b => ({ ...b, body_template: e.target.value }))}
                      rows={8}
                      style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "var(--font-mono, monospace)" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.83rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editBuffer.send_via_email ?? true}
                        onChange={e => setEditBuffer(b => ({ ...b, send_via_email: e.target.checked }))}
                      />
                      Send via Email
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.83rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editBuffer.send_via_notification ?? true}
                        onChange={e => setEditBuffer(b => ({ ...b, send_via_notification: e.target.checked }))}
                      />
                      Send Notification
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.83rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editBuffer.is_active ?? true}
                        onChange={e => setEditBuffer(b => ({ ...b, is_active: e.target.checked }))}
                      />
                      Active
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="touch-target active-push"
                      style={{
                        padding: "0.4rem 0.9rem",
                        borderRadius: "var(--radius)",
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingSeq(null)}
                      style={{
                        padding: "0.4rem 0.8rem",
                        borderRadius: "var(--radius)",
                        background: "var(--card)",
                        color: "var(--muted-foreground)",
                        fontSize: "0.82rem",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: "0.85rem",
  outline: "none",
};
