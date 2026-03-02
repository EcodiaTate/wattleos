"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { WellbeingFlagWithStudent, Student } from "@/types/domain";
import {
  createWellbeingFlag,
  updateWellbeingFlag,
  deleteWellbeingFlag,
} from "@/lib/actions/wellbeing";
import { WellbeingSeverityBadge } from "./wellbeing-severity-badge";

const SEVERITIES = [
  { value: "low" as const, label: "Low - monitor and document" },
  { value: "medium" as const, label: "Medium - follow-up action needed" },
  { value: "high" as const, label: "High - prompt intervention required" },
  { value: "critical" as const, label: "Critical - immediate action required" },
];

const CATEGORIES = [
  { value: "behaviour" as const, label: "Behaviour" },
  { value: "emotional" as const, label: "Emotional" },
  { value: "social" as const, label: "Social" },
  { value: "family" as const, label: "Family" },
  { value: "health" as const, label: "Health" },
  { value: "academic" as const, label: "Academic" },
  { value: "other" as const, label: "Other" },
];

interface WellbeingFlagFormProps {
  students: Array<
    Pick<Student, "id" | "first_name" | "last_name" | "preferred_name">
  >;
  flag?: WellbeingFlagWithStudent | null;
  canManage: boolean;
  defaultStudentId?: string;
}

export function WellbeingFlagForm({
  students,
  flag,
  canManage,
  defaultStudentId,
}: WellbeingFlagFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [studentId, setStudentId] = useState(
    flag?.student_id || defaultStudentId || "",
  );
  const [severity, setSeverity] = useState<
    "low" | "medium" | "high" | "critical"
  >(flag?.severity || "medium");
  const [category, setCategory] = useState(flag?.category || "behaviour");
  const [summary, setSummary] = useState(flag?.summary || "");
  const [context, setContext] = useState(flag?.context || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) {
      setError("Please select a student");
      haptics.error();
      return;
    }
    if (!summary.trim()) {
      setError("Summary is required");
      haptics.error();
      return;
    }

    startTransition(async () => {
      const input = {
        student_id: studentId,
        severity,
        category,
        summary: summary.trim(),
        context: context.trim() || null,
        assigned_to: null,
      };
      const result = flag
        ? await updateWellbeingFlag(flag.id, input)
        : await createWellbeingFlag(input);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/wellbeing/flags");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!flag) return;
    startTransition(async () => {
      const result = await deleteWellbeingFlag(flag.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/wellbeing/flags");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Student *
        </label>
        <select
          disabled={!canManage || !!flag}
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            haptics.selection();
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.preferred_name || `${s.first_name} ${s.last_name}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Severity *
        </label>
        <div className="flex items-center gap-3">
          <select
            disabled={!canManage}
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as typeof severity);
              haptics.selection();
            }}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <WellbeingSeverityBadge severity={severity} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Category *
        </label>
        <select
          disabled={!canManage}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as typeof category);
            haptics.selection();
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Summary *
        </label>
        <input
          disabled={!canManage}
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={500}
          placeholder="Brief summary of the concern..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {summary.length}/500
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Context
        </label>
        <textarea
          disabled={!canManage}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Additional context, background, observations..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {context.length}/5000
        </p>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving..." : flag ? "Update Flag" : "Raise Flag"}
          </button>
          {flag &&
            (showDeleteConfirm ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "var(--destructive-foreground)",
                  }}
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  haptics.warning();
                }}
                style={{ color: "var(--destructive)" }}
                className="text-sm font-medium"
              >
                Delete
              </button>
            ))}
        </div>
      )}
    </form>
  );
}
