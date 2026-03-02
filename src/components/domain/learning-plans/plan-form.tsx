"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createPlan, updatePlan } from "@/lib/actions/ilp";
import type {
  IndividualLearningPlan,
  IlpSupportCategory,
  IlpFundingSource,
} from "@/types/domain";
import {
  SUPPORT_CATEGORY_CONFIG,
  FUNDING_SOURCE_CONFIG,
} from "@/lib/constants/ilp";

const SUPPORT_CATEGORY_OPTIONS = Object.entries(SUPPORT_CATEGORY_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpSupportCategory,
    label: cfg.label,
    emoji: cfg.emoji,
  }),
);

const FUNDING_SOURCE_OPTIONS = Object.entries(FUNDING_SOURCE_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpFundingSource,
    label: cfg.label,
  }),
);

interface PlanFormProps {
  plan?: IndividualLearningPlan;
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  }>;
  onComplete?: () => void;
}

export function PlanForm({ plan, students, onComplete }: PlanFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState(plan?.student_id ?? "");
  const [planTitle, setPlanTitle] = useState(plan?.plan_title ?? "");
  const [supportCategories, setSupportCategories] = useState<IlpSupportCategory[]>(
    plan?.support_categories ?? [],
  );
  const [fundingSource, setFundingSource] = useState<IlpFundingSource | "">(
    plan?.funding_source ?? "",
  );
  const [fundingReference, setFundingReference] = useState(plan?.funding_reference ?? "");
  const [startDate, setStartDate] = useState(plan?.start_date ?? "");
  const [reviewDueDate, setReviewDueDate] = useState(plan?.review_due_date ?? "");
  const [childStrengths, setChildStrengths] = useState(plan?.child_strengths ?? "");
  const [childInterests, setChildInterests] = useState(plan?.child_interests ?? "");
  const [backgroundInfo, setBackgroundInfo] = useState(plan?.background_information ?? "");
  const [familyGoals, setFamilyGoals] = useState(plan?.family_goals ?? "");
  const [consentGiven, setConsentGiven] = useState(plan?.parent_consent_given ?? false);
  const [consentDate, setConsentDate] = useState(plan?.parent_consent_date ?? "");
  const [consentBy, setConsentBy] = useState(plan?.parent_consent_by ?? "");

  function toggleCategory(cat: IlpSupportCategory) {
    setSupportCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Please select a student");
      haptics.error();
      return;
    }

    if (!planTitle.trim()) {
      setError("Please enter a plan title");
      haptics.error();
      return;
    }

    if (!startDate) {
      setError("Please enter a start date");
      haptics.error();
      return;
    }

    const input = {
      student_id: studentId,
      plan_title: planTitle.trim(),
      support_categories: supportCategories,
      funding_source: fundingSource || null,
      funding_reference: fundingReference.trim() || null,
      start_date: startDate,
      review_due_date: reviewDueDate || null,
      child_strengths: childStrengths.trim() || null,
      child_interests: childInterests.trim() || null,
      background_information: backgroundInfo.trim() || null,
      family_goals: familyGoals.trim() || null,
      parent_consent_given: consentGiven,
      parent_consent_date: consentGiven && consentDate ? consentDate : null,
      parent_consent_by: consentGiven && consentBy.trim() ? consentBy.trim() : null,
    };

    startTransition(async () => {
      const result = plan
        ? await updatePlan(plan.id, input)
        : await createPlan(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (onComplete) {
        onComplete();
      } else if (result.data) {
        router.push(`/admin/learning-plans/${result.data.id}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Student Selector */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Student
        </label>
        <select
          value={studentId}
          onChange={(e) => {
            haptics.selection();
            setStudentId(e.target.value);
          }}
          required
          disabled={!!plan}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm disabled:opacity-50"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.preferred_name
                ? `${s.preferred_name} ${s.last_name} (${s.first_name})`
                : `${s.first_name} ${s.last_name}`}
            </option>
          ))}
        </select>
      </div>

      {/* Plan Title */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Plan Title
        </label>
        <input
          type="text"
          value={planTitle}
          onChange={(e) => setPlanTitle(e.target.value)}
          placeholder="e.g., Speech & Language Support Plan 2026"
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Support Categories (multi-select chips) */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Support Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_CATEGORY_OPTIONS.map((opt) => {
            const isSelected = supportCategories.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  haptics.selection();
                  toggleCategory(opt.value);
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: isSelected ? "var(--primary)" : "var(--border)",
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

      {/* Funding Source */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Funding Source
          </label>
          <select
            value={fundingSource}
            onChange={(e) => {
              haptics.selection();
              setFundingSource(e.target.value as IlpFundingSource | "");
            }}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">Select funding source...</option>
            {FUNDING_SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Funding Reference
          </label>
          <input
            type="text"
            value={fundingReference}
            onChange={(e) => setFundingReference(e.target.value)}
            placeholder="e.g., NDIS plan number"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Review Due Date
          </label>
          <input
            type="date"
            value={reviewDueDate}
            onChange={(e) => setReviewDueDate(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Child Strengths */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Child Strengths
        </label>
        <textarea
          value={childStrengths}
          onChange={(e) => setChildStrengths(e.target.value)}
          placeholder="Describe the child's strengths, abilities, and things they enjoy..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Child Interests */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Child Interests
        </label>
        <textarea
          value={childInterests}
          onChange={(e) => setChildInterests(e.target.value)}
          placeholder="What does the child enjoy? Activities, topics, materials..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Background Information */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Background Information
        </label>
        <textarea
          value={backgroundInfo}
          onChange={(e) => setBackgroundInfo(e.target.value)}
          placeholder="Relevant background information, diagnoses, assessments, allied health involvement..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Family Goals */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Family Goals
        </label>
        <textarea
          value={familyGoals}
          onChange={(e) => setFamilyGoals(e.target.value)}
          placeholder="What goals does the family have for the child?"
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Parent Consent */}
      <div
        className="space-y-3 rounded-[var(--radius-lg)] border border-border p-4"
        style={{ background: "var(--card)" }}
      >
        <label
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Parent/Guardian Consent
        </label>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            setConsentGiven(!consentGiven);
          }}
          className="active-push flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm transition-colors"
          style={{
            background: consentGiven ? "var(--primary)" : "var(--input)",
            color: consentGiven
              ? "var(--primary-foreground)"
              : "var(--foreground)",
          }}
        >
          <span>{consentGiven ? "\u2713" : ""}</span>
          Parent/guardian consent has been obtained
        </button>

        {consentGiven && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Consent Date
              </label>
              <input
                type="date"
                value={consentDate}
                onChange={(e) => setConsentDate(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                style={{ background: "var(--input)", color: "var(--foreground)" }}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Consent Given By
              </label>
              <input
                type="text"
                value={consentBy}
                onChange={(e) => setConsentBy(e.target.value)}
                placeholder="Name of parent/guardian"
                className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                style={{ background: "var(--input)", color: "var(--foreground)" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending
          ? "Saving..."
          : plan
            ? "Update Plan"
            : "Create Plan"}
      </button>
    </form>
  );
}
