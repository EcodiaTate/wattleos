"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createPolicy,
  updatePolicy,
  publishPolicy,
  archivePolicy,
} from "@/lib/actions/policies";
import type { Policy } from "@/types/domain";
import type { CreatePolicyInput } from "@/lib/validations/policies";

interface PolicyEditorProps {
  policy?: Policy;
}

const CATEGORIES = [
  { value: "governance", label: "Governance" },
  { value: "health_safety", label: "Health & Safety" },
  { value: "child_protection", label: "Child Protection" },
  { value: "staffing", label: "Staffing" },
  { value: "curriculum", label: "Curriculum" },
  { value: "inclusion", label: "Inclusion" },
  { value: "families", label: "Families" },
  { value: "environment", label: "Environment" },
  { value: "administration", label: "Administration" },
  { value: "other", label: "Other" },
] as const;

export function PolicyEditor({ policy }: PolicyEditorProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(policy?.title ?? "");
  const [category, setCategory] = useState(policy?.category ?? "governance");
  const [regulationRef, setRegulationRef] = useState(
    policy?.regulation_reference ?? "",
  );
  const [content, setContent] = useState(policy?.content ?? "");
  const [documentUrl, setDocumentUrl] = useState(policy?.document_url ?? "");
  const [effectiveDate, setEffectiveDate] = useState(
    policy?.effective_date ?? "",
  );
  const [reviewDate, setReviewDate] = useState(policy?.review_date ?? "");
  const [requiresParentNotice, setRequiresParentNotice] = useState(
    policy?.requires_parent_notice ?? false,
  );

  // Publish modal state
  const [showPublish, setShowPublish] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: CreatePolicyInput = {
      title,
      category: category as CreatePolicyInput["category"],
      regulation_reference: regulationRef || undefined,
      content: content || undefined,
      document_url: documentUrl || undefined,
      effective_date: effectiveDate || undefined,
      review_date: reviewDate || undefined,
      requires_parent_notice: requiresParentNotice,
    };

    startTransition(async () => {
      const result = policy
        ? await updatePolicy(policy.id, input)
        : await createPolicy(input);

      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        haptics.error();
        return;
      }

      haptics.success();
      router.push(`/admin/policies/${result.data!.id}`);
    });
  }

  function handlePublish() {
    if (!policy) return;
    setError(null);
    startTransition(async () => {
      const result = await publishPolicy({
        policy_id: policy.id,
        change_summary: changeSummary,
      });
      if (result.error) {
        setError(result.error.message ?? "Failed to publish");
        haptics.error();
        return;
      }
      haptics.heavy();
      setShowPublish(false);
      router.refresh();
    });
  }

  function handleArchive() {
    if (!policy) return;
    startTransition(async () => {
      const result = await archivePolicy(policy.id);
      if (result.error) {
        setError(result.error.message ?? "Failed to archive");
        haptics.error();
        return;
      }
      haptics.warning();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Title + Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Policy Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sun Protection Policy"
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Regulation reference */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Regulation Reference
        </label>
        <input
          type="text"
          value={regulationRef}
          onChange={(e) => setRegulationRef(e.target.value)}
          placeholder="e.g. Reg 113, Reg 114"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Policy Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the full policy text here..."
          rows={12}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm font-mono"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Document URL */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Document URL (optional - link to uploaded PDF)
        </label>
        <input
          type="url"
          value={documentUrl}
          onChange={(e) => setDocumentUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Effective Date
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Review Date
          </label>
          <input
            type="date"
            value={reviewDate}
            onChange={(e) => setReviewDate(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Parent notice toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={requiresParentNotice}
          onChange={(e) => {
            setRequiresParentNotice(e.target.checked);
            haptics.light();
          }}
          className="rounded border-border"
        />
        <span className="text-sm" style={{ color: "var(--foreground)" }}>
          Requires parent notification when published
        </span>
      </label>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>

        {policy && policy.status === "active" && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              borderColor: "var(--destructive)",
              color: "var(--destructive)",
            }}
          >
            Archive
          </button>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ color: "var(--foreground)" }}
        >
          {isPending ? "Saving..." : policy ? "Save Changes" : "Create Draft"}
        </button>

        {policy && policy.status !== "archived" && (
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              setShowPublish(true);
            }}
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Publish v{policy.version + 1}
          </button>
        )}
      </div>

      {/* Publish modal */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-border p-6 space-y-4"
            style={{ background: "var(--card)" }}
          >
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Publish Policy Update
            </h3>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                What changed? *
              </label>
              <textarea
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Brief summary of changes in this version..."
                rows={3}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                style={{
                  background: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPublish(false)}
                className="active-push rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPending || !changeSummary.trim()}
                className="active-push rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isPending ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
