"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { attachEvidence, removeEvidence } from "@/lib/actions/ilp";
import type { IlpEvidence, IlpEvidenceType } from "@/types/domain";
import { EVIDENCE_TYPE_CONFIG } from "@/lib/constants/ilp";

const EVIDENCE_TYPE_OPTIONS = Object.entries(EVIDENCE_TYPE_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpEvidenceType,
    label: cfg.label,
    emoji: cfg.emoji,
  }),
);

interface EvidenceLinkerProps {
  planId: string;
  goalId?: string;
  evidence: IlpEvidence[];
  canManage: boolean;
}

export function EvidenceLinker({
  planId,
  goalId,
  evidence,
  canManage,
}: EvidenceLinkerProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [evidenceType, setEvidenceType] = useState<IlpEvidenceType>("observation");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  function resetForm() {
    setEvidenceType("observation");
    setTitle("");
    setDescription("");
    setFileUrl("");
    setError(null);
  }

  function handleAttach(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title");
      haptics.error();
      return;
    }

    const input = {
      plan_id: planId,
      goal_id: goalId || null,
      evidence_type: evidenceType,
      title: title.trim(),
      description: description.trim() || null,
      file_url: fileUrl.trim() || null,
    };

    startTransition(async () => {
      const result = await attachEvidence(input);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      resetForm();
      setShowForm(false);
      router.refresh();
    });
  }

  function handleRemove(evidenceId: string) {
    startTransition(async () => {
      const result = await removeEvidence(evidenceId);
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.light();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Header with attach button */}
      {canManage && !showForm && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setShowForm(true);
            }}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Attach Evidence
          </button>
        </div>
      )}

      {/* Attach form */}
      {showForm && (
        <form
          onSubmit={handleAttach}
          className="rounded-[var(--radius-lg)] border border-border p-4 space-y-4"
          style={{ background: "var(--card)" }}
        >
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Attach Evidence
          </h3>

          {error && (
            <div
              className="rounded-[var(--radius-md)] border p-2 text-xs"
              style={{
                borderColor: "var(--destructive)",
                background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
                color: "var(--destructive)",
              }}
            >
              {error}
            </div>
          )}

          {/* Evidence type selector */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {EVIDENCE_TYPE_OPTIONS.map((opt) => {
                const isSelected = evidenceType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setEvidenceType(opt.value);
                    }}
                    className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor: isSelected
                        ? "var(--primary)"
                        : "var(--border)",
                      background: isSelected ? "var(--primary)" : "transparent",
                      color: isSelected
                        ? "var(--primary-foreground)"
                        : "var(--foreground)",
                    }}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Speech pathology report - Feb 2026"
              required
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this evidence..."
              rows={2}
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
          </div>

          {/* File URL */}
          <div className="space-y-1">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              File URL
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                haptics.light();
                resetForm();
                setShowForm(false);
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Attaching..." : "Attach"}
            </button>
          </div>
        </form>
      )}

      {/* Evidence items */}
      {evidence.length === 0 && !showForm ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No evidence attached yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {evidence.map((item) => {
            const typeCfg = EVIDENCE_TYPE_CONFIG[item.evidence_type];
            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-border p-3"
                style={{ background: "var(--card)" }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-lg">{typeCfg.emoji}</span>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: "var(--muted)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {typeCfg.label}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {new Date(item.attached_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {item.description && (
                      <p
                        className="mt-1 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.description}
                      </p>
                    )}
                    {item.file_url && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-medium"
                        style={{ color: "var(--primary)" }}
                      >
                        View file
                      </a>
                    )}
                  </div>
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      handleRemove(item.id);
                    }}
                    disabled={isPending}
                    className="active-push touch-target flex-shrink-0 rounded-[var(--radius-md)] border border-border px-2 py-1 text-xs font-medium transition-opacity disabled:opacity-50"
                    style={{
                      background: "var(--card)",
                      color: "var(--destructive)",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
