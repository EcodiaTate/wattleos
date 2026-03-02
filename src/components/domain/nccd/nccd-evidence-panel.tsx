"use client";

// src/components/domain/nccd/nccd-evidence-panel.tsx
//
// Panel for viewing and adding evidence items on an NCCD entry detail page.

import { useState } from "react";

import { NCCD_EVIDENCE_CONFIG } from "@/lib/constants/nccd";
import { addNccdEvidence, deleteNccdEvidence } from "@/lib/actions/nccd";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { NccdEvidenceItem, NccdEvidenceType } from "@/types/domain";

interface NccdEvidencePanelProps {
  entryId: string;
  evidence: NccdEvidenceItem[];
  canManage: boolean;
  onRefresh: () => void;
}

export function NccdEvidencePanel({
  entryId,
  evidence,
  canManage,
  onRefresh,
}: NccdEvidencePanelProps) {
  const haptics = useHaptics();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    evidence_type: "professional_report" as NccdEvidenceType,
    description: "",
    evidence_date: "",
    document_url: "",
    document_name: "",
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !form.description.trim()) return;
    setSaving(true);
    setError(null);
    haptics.medium();

    const result = await addNccdEvidence({
      entry_id: entryId,
      evidence_type: form.evidence_type,
      description: form.description,
      evidence_date: form.evidence_date || null,
      document_url: form.document_url || null,
      document_name: form.document_name || null,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error.message ?? "Failed to add evidence");
      haptics.error();
      return;
    }

    haptics.success();
    setForm({ evidence_type: "professional_report", description: "", evidence_date: "", document_url: "", document_name: "" });
    setAdding(false);
    onRefresh();
  }

  async function handleDelete(id: string) {
    haptics.medium();
    const result = await deleteNccdEvidence(id);
    if (result.error) {
      haptics.error();
      return;
    }
    haptics.success();
    onRefresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Supporting Evidence
        </h3>
        {canManage && !adding && (
          <button
            type="button"
            onClick={() => { haptics.light(); setAdding(true); }}
            className="touch-target active-push rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            + Add Evidence
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-border p-4 space-y-3"
          style={{ background: "var(--card)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={form.evidence_type}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  evidence_type: e.target.value as NccdEvidenceType,
                }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              {(Object.keys(NCCD_EVIDENCE_CONFIG) as NccdEvidenceType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {NCCD_EVIDENCE_CONFIG[t].emoji}{" "}
                    {NCCD_EVIDENCE_CONFIG[t].label}
                  </option>
                ),
              )}
            </select>
            <input
              type="date"
              value={form.evidence_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, evidence_date: e.target.value }))
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>
          <textarea
            required
            rows={2}
            placeholder="Describe the evidence…"
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            style={{ color: "var(--foreground)" }}
          />
          {error && (
            <p className="text-xs" style={{ color: "var(--nccd-extensive)" }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { haptics.light(); setAdding(false); setError(null); }}
              className="touch-target active-push rounded-lg border border-border px-3 py-1.5 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="touch-target active-push rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* Evidence list */}
      {evidence.length === 0 && !adding ? (
        <p className="text-sm py-4 text-center" style={{ color: "var(--muted-foreground)" }}>
          No evidence items yet
        </p>
      ) : (
        <div className="space-y-2">
          {evidence.map((item) => {
            const config = NCCD_EVIDENCE_CONFIG[item.evidence_type];
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-border p-3"
                style={{ background: "var(--card)" }}
              >
                <span className="text-xl mt-0.5 shrink-0">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                    {config.label}
                    {item.evidence_date && ` · ${new Date(item.evidence_date).toLocaleDateString("en-AU")}`}
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--foreground)" }}>
                    {item.description}
                  </p>
                  {item.document_url && (
                    <a
                      href={item.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs mt-1 inline-flex items-center gap-1"
                      style={{ color: "var(--primary)" }}
                    >
                      📎 {item.document_name ?? "View document"}
                    </a>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="touch-target active-push shrink-0 rounded-lg p-1.5 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                    title="Remove evidence"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
