"use client";

// src/components/domain/medication/student-medication-profile.tsx
//
// ============================================================
// Student medication profile - tabs for plans, authorisations,
// and the immutable administration log.
// ============================================================

import type {
  MedicalManagementPlan,
  MedicationAuthorisation,
  MedicationAdministration,
  MedicalPlanType,
} from "@/types/domain";
import {
  createMedicalPlan,
  deactivateMedicalPlan,
  markPlanReviewed,
  createMedicationAuthorisation,
  deactivateMedicationAuthorisation,
} from "@/lib/actions/medication-admin";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface StudentInfo {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  photo_url: string | null;
}

interface StaffOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  student: StudentInfo;
  plans: MedicalManagementPlan[];
  authorisations: MedicationAuthorisation[];
  administrations: MedicationAdministration[];
  adminTotal: number;
  staff: StaffOption[];
  currentUserId: string;
  canManage: boolean;
  canAdminister: boolean;
}

type Tab = "plans" | "authorisations" | "log";

const PLAN_TYPE_LABELS: Record<MedicalPlanType, string> = {
  ascia_anaphylaxis: "ASCIA Anaphylaxis",
  asthma: "Asthma",
  diabetes: "Diabetes",
  seizure: "Seizure",
  other: "Other",
};

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  inhaled: "Inhaled",
  injected: "Injected",
  topical: "Topical",
  other: "Other",
};

export function StudentMedicationProfile({
  student,
  plans,
  authorisations,
  administrations,
  adminTotal,
  staff,
  currentUserId,
  canManage,
  canAdminister,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [error, setError] = useState<string | null>(null);

  // Plan creation form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planType, setPlanType] =
    useState<MedicalPlanType>("ascia_anaphylaxis");
  const [conditionName, setConditionName] = useState("");
  const [planExpiry, setPlanExpiry] = useState("");
  const [planReviewDue, setPlanReviewDue] = useState("");
  const [planNotes, setPlanNotes] = useState("");

  // Authorisation creation form
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState<
    "oral" | "inhaled" | "injected" | "topical" | "other"
  >("oral");
  const [frequency, setFrequency] = useState("");
  const [reason, setReason] = useState("");
  const [authByName, setAuthByName] = useState("");
  const [authDate, setAuthDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [storage, setStorage] = useState("");

  const displayName = student.preferred_name
    ? `${student.first_name} "${student.preferred_name}" ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!conditionName.trim()) {
      setError("Condition name is required.");
      return;
    }

    haptics.impact("medium");
    startTransition(async () => {
      const result = await createMedicalPlan({
        student_id: student.id,
        plan_type: planType,
        condition_name: conditionName.trim(),
        expiry_date: planExpiry || null,
        review_due_date: planReviewDue || null,
        notes: planNotes.trim() || null,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      haptics.success();
      setShowPlanForm(false);
      setConditionName("");
      setPlanExpiry("");
      setPlanReviewDue("");
      setPlanNotes("");
      router.refresh();
    });
  };

  const handleDeactivatePlan = (planId: string) => {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await deactivateMedicalPlan(planId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  const handleReviewPlan = (planId: string) => {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await markPlanReviewed(planId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      haptics.success();
      router.refresh();
    });
  };

  const handleCreateAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!medName.trim()) {
      setError("Medication name is required.");
      return;
    }
    if (!dose.trim()) {
      setError("Dose is required.");
      return;
    }
    if (!frequency.trim()) {
      setError("Frequency is required.");
      return;
    }
    if (!authByName.trim()) {
      setError("Authorised by name is required.");
      return;
    }

    haptics.impact("medium");
    startTransition(async () => {
      const result = await createMedicationAuthorisation({
        student_id: student.id,
        medication_name: medName.trim(),
        dose: dose.trim(),
        route,
        frequency: frequency.trim(),
        reason: reason.trim() || null,
        authorised_by_name: authByName.trim(),
        authorisation_date: authDate,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        storage_instructions: storage.trim() || null,
      });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      haptics.success();
      setShowAuthForm(false);
      setMedName("");
      setDose("");
      setFrequency("");
      setReason("");
      setAuthByName("");
      setValidFrom("");
      setValidUntil("");
      setStorage("");
      router.refresh();
    });
  };

  const handleDeactivateAuth = (authId: string) => {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await deactivateMedicationAuthorisation(authId);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  };

  const tabSwitch = (t: Tab) => {
    haptics.impact("light");
    setActiveTab(t);
    setError(null);
  };

  const activePlans = plans.filter((p) => p.is_active);
  const inactivePlans = plans.filter((p) => !p.is_active);
  const activeAuths = authorisations.filter((a) => a.is_active);
  const inactiveAuths = authorisations.filter((a) => !a.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/medication"
          className="touch-target text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Medication
        </Link>
        <h1
          className="mt-2 text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          {displayName}
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Medical management plans, medication authorisations and administration
          log.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-[var(--radius-md)] p-1"
        style={{ background: "var(--muted)" }}
      >
        {[
          { key: "plans" as Tab, label: `Plans (${activePlans.length})` },
          {
            key: "authorisations" as Tab,
            label: `Authorisations (${activeAuths.length})`,
          },
          { key: "log" as Tab, label: `Log (${adminTotal})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => tabSwitch(t.key)}
            className="active-push touch-target flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors"
            style={{
              background:
                activeTab === t.key ? "var(--background)" : "transparent",
              color:
                activeTab === t.key
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
              boxShadow:
                activeTab === t.key ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          className="text-sm font-medium"
          style={{ color: "var(--destructive)" }}
        >
          {error}
        </p>
      )}

      {/* Plans tab */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          {canManage && (
            <button
              onClick={() => {
                setShowPlanForm((v) => !v);
                haptics.impact("light");
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              style={{ color: "var(--primary)" }}
            >
              {showPlanForm ? "Cancel" : "+ Add Plan"}
            </button>
          )}

          {showPlanForm && (
            <form
              onSubmit={handleCreatePlan}
              className="rounded-[var(--radius-lg)] border border-border p-4 space-y-4"
              style={{ background: "var(--background)" }}
            >
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Plan type{" "}
                  <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(PLAN_TYPE_LABELS) as [
                      MedicalPlanType,
                      string,
                    ][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPlanType(key)}
                      className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
                      style={{
                        borderColor:
                          planType === key ? "var(--primary)" : "var(--border)",
                        background:
                          planType === key
                            ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                            : "var(--background)",
                        color:
                          planType === key
                            ? "var(--primary)"
                            : "var(--foreground)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Condition name{" "}
                  <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={conditionName}
                  onChange={(e) => setConditionName(e.target.value)}
                  placeholder="e.g. Peanut allergy (anaphylaxis)"
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Expiry date
                  </label>
                  <input
                    type="date"
                    value={planExpiry}
                    onChange={(e) => setPlanExpiry(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Review due date
                  </label>
                  <input
                    type="date"
                    value={planReviewDue}
                    onChange={(e) => setPlanReviewDue(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Notes
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                  placeholder="e.g. EpiPen stored in kitchen medication cabinet"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isPending ? "Saving…" : "Save Plan"}
                </button>
              </div>
            </form>
          )}

          {activePlans.length === 0 && !showPlanForm && (
            <EmptyState
              label="No active management plans"
              hint="Add a plan for this child's medical condition."
            />
          )}

          {activePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              canManage={canManage}
              onDeactivate={handleDeactivatePlan}
              onReview={handleReviewPlan}
              isPending={isPending}
            />
          ))}

          {inactivePlans.length > 0 && (
            <details className="mt-4">
              <summary
                className="cursor-pointer text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                {inactivePlans.length} inactive/removed plan(s)
              </summary>
              <div className="mt-2 space-y-3 opacity-60">
                {inactivePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    canManage={false}
                    onDeactivate={() => {}}
                    onReview={() => {}}
                    isPending={false}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Authorisations tab */}
      {activeTab === "authorisations" && (
        <div className="space-y-4">
          {canManage && (
            <button
              onClick={() => {
                setShowAuthForm((v) => !v);
                haptics.impact("light");
              }}
              className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              style={{ color: "var(--primary)" }}
            >
              {showAuthForm ? "Cancel" : "+ Add Authorisation"}
            </button>
          )}

          {showAuthForm && (
            <form
              onSubmit={handleCreateAuth}
              className="rounded-[var(--radius-lg)] border border-border p-4 space-y-4"
              style={{ background: "var(--background)" }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Medication name{" "}
                    <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Ventolin"
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Dose <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="e.g. 2 puffs"
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Route <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      Object.entries(ROUTE_LABELS) as [typeof route, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRoute(key)}
                        className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          borderColor:
                            route === key ? "var(--primary)" : "var(--border)",
                          background:
                            route === key
                              ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                              : "transparent",
                          color:
                            route === key
                              ? "var(--primary)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Frequency{" "}
                    <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="e.g. As needed for wheeze"
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Asthma management"
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Authorised by (parent name){" "}
                    <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={authByName}
                    onChange={(e) => setAuthByName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Authorisation date{" "}
                    <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={authDate}
                    onChange={(e) => setAuthDate(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Valid from
                  </label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Valid until
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  />
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Storage instructions
                </label>
                <input
                  type="text"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="e.g. Keep in medication bag, room temperature"
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAuthForm(false)}
                  className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isPending ? "Saving…" : "Save Authorisation"}
                </button>
              </div>
            </form>
          )}

          {activeAuths.length === 0 && !showAuthForm && (
            <EmptyState
              label="No active authorisations"
              hint="Add a parent-authorised medication for this child."
            />
          )}

          {activeAuths.map((auth) => (
            <AuthCard
              key={auth.id}
              auth={auth}
              canManage={canManage}
              onDeactivate={handleDeactivateAuth}
              isPending={isPending}
            />
          ))}

          {inactiveAuths.length > 0 && (
            <details className="mt-4">
              <summary
                className="cursor-pointer text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                {inactiveAuths.length} inactive authorisation(s)
              </summary>
              <div className="mt-2 space-y-3 opacity-60">
                {inactiveAuths.map((auth) => (
                  <AuthCard
                    key={auth.id}
                    auth={auth}
                    canManage={false}
                    onDeactivate={() => {}}
                    isPending={false}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Administration log tab */}
      {activeTab === "log" && (
        <div className="space-y-4">
          {canAdminister && (
            <Link
              href={`/medication/administer?studentId=${student.id}`}
              className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Record Dose
            </Link>
          )}

          {administrations.length === 0 ? (
            <EmptyState
              label="No administrations recorded"
              hint="Doses are recorded from the Administer page."
            />
          ) : (
            <div
              className="overflow-hidden rounded-[var(--radius-lg)] border border-border"
              style={{ background: "var(--background)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: "var(--muted)",
                    }}
                  >
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Date/Time
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Medication
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Dose
                    </th>
                    <th
                      className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide sm:table-cell"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Route
                    </th>
                    <th
                      className="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wide sm:table-cell"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Parent Notified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {administrations.map((admin, i) => (
                    <tr
                      key={admin.id}
                      style={{
                        borderTop:
                          i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {new Date(admin.administered_at).toLocaleString(
                          "en-AU",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                      <td
                        className="px-4 py-3 font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {admin.medication_name}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ color: "var(--foreground)" }}
                      >
                        {admin.dose_given}
                      </td>
                      <td
                        className="hidden px-4 py-3 capitalize sm:table-cell"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {admin.route}
                      </td>
                      <td className="hidden px-4 py-3 text-center sm:table-cell">
                        {admin.parent_notified ? (
                          <span style={{ color: "var(--attendance-present)" }}>
                            Yes
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)" }}>
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminTotal > 50 && (
                <div
                  className="border-t px-4 py-3 text-center"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Link
                    href={`/medication/register?student_id=${student.id}`}
                    className="text-xs font-medium"
                    style={{ color: "var(--primary)" }}
                  >
                    View all {adminTotal} records →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function PlanCard({
  plan,
  canManage,
  onDeactivate,
  onReview,
  isPending,
}: {
  plan: MedicalManagementPlan;
  canManage: boolean;
  onDeactivate: (id: string) => void;
  onReview: (id: string) => void;
  isPending: boolean;
}) {
  const isExpired = plan.expiry_date && new Date(plan.expiry_date) < new Date();
  const isExpiringSoon =
    plan.expiry_date &&
    !isExpired &&
    (() => {
      const diff = new Date(plan.expiry_date!).getTime() - Date.now();
      return diff < 30 * 24 * 60 * 60 * 1000;
    })();

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 space-y-2"
      style={{
        borderColor: isExpired
          ? "var(--destructive)"
          : isExpiringSoon
            ? "orange"
            : "var(--border)",
        background: !plan.is_active ? "var(--muted)" : "var(--background)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {PLAN_TYPE_LABELS[plan.plan_type]}
            </span>
            {!plan.is_active && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                Inactive
              </span>
            )}
            {isExpired && plan.is_active && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 12%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                Expired
              </span>
            )}
            {isExpiringSoon && plan.is_active && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background: "color-mix(in srgb, orange 12%, transparent)",
                  color: "orange",
                }}
              >
                Expiring Soon
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--foreground)" }}>
            {plan.condition_name}
          </p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-x-6 gap-y-1 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        {plan.expiry_date && <span>Expires: {plan.expiry_date}</span>}
        {plan.review_due_date && (
          <span>Review due: {plan.review_due_date}</span>
        )}
        {plan.last_reviewed_at && (
          <span>Last reviewed: {plan.last_reviewed_at}</span>
        )}
      </div>
      {plan.notes && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {plan.notes}
        </p>
      )}
      {canManage && plan.is_active && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onReview(plan.id)}
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            style={{ color: "var(--primary)" }}
          >
            Mark Reviewed
          </button>
          <button
            onClick={() => onDeactivate(plan.id)}
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            style={{ color: "var(--destructive)" }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function AuthCard({
  auth,
  canManage,
  onDeactivate,
  isPending,
}: {
  auth: MedicationAuthorisation;
  canManage: boolean;
  onDeactivate: (id: string) => void;
  isPending: boolean;
}) {
  const isExpired = auth.valid_until && new Date(auth.valid_until) < new Date();
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-4 space-y-2"
      style={{
        borderColor: isExpired ? "var(--destructive)" : "var(--border)",
        background: !auth.is_active ? "var(--muted)" : "var(--background)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {auth.medication_name}
            </span>
            {!auth.is_active && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                Inactive
              </span>
            )}
            {isExpired && auth.is_active && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  background:
                    "color-mix(in srgb, var(--destructive) 12%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                Expired
              </span>
            )}
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {auth.dose} · {auth.route} · {auth.frequency}
          </p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-x-6 gap-y-1 text-xs"
        style={{ color: "var(--muted-foreground)" }}
      >
        <span>Authorised by: {auth.authorised_by_name}</span>
        <span>Date: {auth.authorisation_date}</span>
        {auth.valid_from && <span>From: {auth.valid_from}</span>}
        {auth.valid_until && <span>Until: {auth.valid_until}</span>}
        {auth.storage_instructions && (
          <span>Storage: {auth.storage_instructions}</span>
        )}
      </div>
      {auth.reason && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Reason: {auth.reason}
        </p>
      )}
      {canManage && auth.is_active && (
        <div className="pt-1">
          <button
            onClick={() => onDeactivate(auth.id)}
            disabled={isPending}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            style={{ color: "var(--destructive)" }}
          >
            Deactivate
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-12 text-center"
      style={{ background: "var(--background)" }}
    >
      <svg
        className="mx-auto h-10 w-10"
        style={{ color: "var(--empty-state-icon)" }}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
      <p
        className="mt-3 text-sm font-medium"
        style={{ color: "var(--foreground)" }}
      >
        {label}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {hint}
      </p>
    </div>
  );
}
