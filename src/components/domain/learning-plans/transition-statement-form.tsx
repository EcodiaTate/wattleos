"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createTransitionStatement,
  updateTransitionStatement,
} from "@/lib/actions/ilp";
import type { TransitionStatement } from "@/types/domain";

interface TransitionStatementFormProps {
  statement?: TransitionStatement;
  students: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  plans?: Array<{
    id: string;
    plan_title: string;
  }>;
  onComplete?: () => void;
}

export function TransitionStatementForm({
  statement,
  students,
  plans,
  onComplete,
}: TransitionStatementFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState(statement?.student_id ?? "");
  const [planId, setPlanId] = useState(statement?.plan_id ?? "");
  const [statementYear, setStatementYear] = useState(
    statement?.statement_year ?? new Date().getFullYear(),
  );

  // EYLF outcome areas
  const [identitySummary, setIdentitySummary] = useState(
    statement?.identity_summary ?? "",
  );
  const [communitySummary, setCommunitySummary] = useState(
    statement?.community_summary ?? "",
  );
  const [wellbeingSummary, setWellbeingSummary] = useState(
    statement?.wellbeing_summary ?? "",
  );
  const [learningSummary, setLearningSummary] = useState(
    statement?.learning_summary ?? "",
  );
  const [communicationSummary, setCommunicationSummary] = useState(
    statement?.communication_summary ?? "",
  );

  // Additional sections
  const [strengthsSummary, setStrengthsSummary] = useState(
    statement?.strengths_summary ?? "",
  );
  const [interestsSummary, setInterestsSummary] = useState(
    statement?.interests_summary ?? "",
  );
  const [approachesToLearning, setApproachesToLearning] = useState(
    statement?.approaches_to_learning ?? "",
  );
  const [additionalNeeds, setAdditionalNeeds] = useState(
    statement?.additional_needs_summary ?? "",
  );
  const [familyInput, setFamilyInput] = useState(
    statement?.family_input ?? "",
  );
  const [educatorRecommendations, setEducatorRecommendations] = useState(
    statement?.educator_recommendations ?? "",
  );

  // Receiving school
  const [receivingSchoolName, setReceivingSchoolName] = useState(
    statement?.receiving_school_name ?? "",
  );
  const [receivingSchoolContact, setReceivingSchoolContact] = useState(
    statement?.receiving_school_contact ?? "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!statement && !studentId) {
      setError("Please select a student");
      haptics.error();
      return;
    }

    const input = {
      student_id: studentId,
      plan_id: planId || null,
      statement_year: statementYear,
      identity_summary: identitySummary.trim() || null,
      community_summary: communitySummary.trim() || null,
      wellbeing_summary: wellbeingSummary.trim() || null,
      learning_summary: learningSummary.trim() || null,
      communication_summary: communicationSummary.trim() || null,
      strengths_summary: strengthsSummary.trim() || null,
      interests_summary: interestsSummary.trim() || null,
      approaches_to_learning: approachesToLearning.trim() || null,
      additional_needs_summary: additionalNeeds.trim() || null,
      family_input: familyInput.trim() || null,
      educator_recommendations: educatorRecommendations.trim() || null,
      receiving_school_name: receivingSchoolName.trim() || null,
      receiving_school_contact: receivingSchoolContact.trim() || null,
    };

    startTransition(async () => {
      const result = statement
        ? await updateTransitionStatement(statement.id, input)
        : await createTransitionStatement(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (onComplete) {
        onComplete();
      } else if (result.data) {
        router.push(`/admin/learning-plans/transitions/${result.data.id}`);
      }
    });
  }

  const eylfSections = [
    {
      key: "identity",
      label: "Outcome 1 \u2014 Identity",
      description: "Children have a strong sense of identity",
      value: identitySummary,
      setter: setIdentitySummary,
    },
    {
      key: "community",
      label: "Outcome 2 \u2014 Community",
      description: "Children are connected with and contribute to their world",
      value: communitySummary,
      setter: setCommunitySummary,
    },
    {
      key: "wellbeing",
      label: "Outcome 3 \u2014 Wellbeing",
      description: "Children have a strong sense of wellbeing",
      value: wellbeingSummary,
      setter: setWellbeingSummary,
    },
    {
      key: "learning",
      label: "Outcome 4 \u2014 Learning",
      description: "Children are confident and involved learners",
      value: learningSummary,
      setter: setLearningSummary,
    },
    {
      key: "communication",
      label: "Outcome 5 \u2014 Communication",
      description: "Children are effective communicators",
      value: communicationSummary,
      setter: setCommunicationSummary,
    },
  ];

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

      {/* Student & Plan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            required={!statement}
            disabled={!!statement}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">Select a student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Linked Plan (optional)
          </label>
          <select
            value={planId}
            onChange={(e) => {
              haptics.selection();
              setPlanId(e.target.value);
            }}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="">No linked plan</option>
            {plans?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plan_title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statement Year */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Year
        </label>
        <input
          type="number"
          value={statementYear}
          onChange={(e) => setStatementYear(parseInt(e.target.value, 10))}
          min={2020}
          max={2050}
          className="w-32 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* EYLF Outcome Areas */}
      <div className="space-y-1">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          EYLF Learning Outcomes
        </h2>
        <p
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Summarise the child's learning and development against each EYLF outcome.
        </p>
      </div>

      {eylfSections.map((section) => (
        <div key={section.key} className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            {section.label}
          </label>
          <p
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {section.description}
          </p>
          <textarea
            value={section.value}
            onChange={(e) => section.setter(e.target.value)}
            placeholder={`Describe the child's progress in relation to ${section.label.toLowerCase()}...`}
            rows={4}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      ))}

      {/* Additional sections */}
      <div className="space-y-1">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Additional Information
        </h2>
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Strengths
        </label>
        <textarea
          value={strengthsSummary}
          onChange={(e) => setStrengthsSummary(e.target.value)}
          placeholder="The child's key strengths..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Interests
        </label>
        <textarea
          value={interestsSummary}
          onChange={(e) => setInterestsSummary(e.target.value)}
          placeholder="The child's interests, passions, and favourite activities..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Approaches to Learning
        </label>
        <textarea
          value={approachesToLearning}
          onChange={(e) => setApproachesToLearning(e.target.value)}
          placeholder="How the child approaches new learning, problem-solving strategies..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Additional Needs
        </label>
        <textarea
          value={additionalNeeds}
          onChange={(e) => setAdditionalNeeds(e.target.value)}
          placeholder="Any additional needs, support requirements, or considerations for the receiving school..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Family Input
        </label>
        <textarea
          value={familyInput}
          onChange={(e) => setFamilyInput(e.target.value)}
          placeholder="Input from the family about their child's transition to school..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Educator Recommendations
        </label>
        <textarea
          value={educatorRecommendations}
          onChange={(e) => setEducatorRecommendations(e.target.value)}
          placeholder="Recommendations from educators for the receiving school..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Receiving School */}
      <div className="space-y-1">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Receiving School
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            School Name
          </label>
          <input
            type="text"
            value={receivingSchoolName}
            onChange={(e) => setReceivingSchoolName(e.target.value)}
            placeholder="Name of the receiving school"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            School Contact
          </label>
          <input
            type="text"
            value={receivingSchoolContact}
            onChange={(e) => setReceivingSchoolContact(e.target.value)}
            placeholder="Contact person or email"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
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
          : statement
            ? "Update Statement"
            : "Create Transition Statement"}
      </button>
    </form>
  );
}
