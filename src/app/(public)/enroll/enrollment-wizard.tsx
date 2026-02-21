// src/app/(public)/enroll/enrollment-wizard.tsx
//
// ============================================================
// WattleOS V2 - Enrollment Wizard (Module 10)
// ============================================================
// 'use client' - the 10-step public enrollment form.
//
// Steps: 1. Your Details, 2. Child Info, 3. Program,
//        4. Additional Guardians, 5. Medical, 6. Emergency,
//        7. Custody, 8. Documents (placeholder), 9. Consents,
//        10. Review & Submit
//
// Draft saving: Each step change persists to localStorage so
// parents can return and resume. Key: wattleos_enroll_{tenantId}
//
// WHY one big component: Multi-step forms need shared state
// across all steps. Splitting into 10 components would mean
// prop drilling or context - a single component with a step
// switch is simpler and the state shape is co-located.
// ============================================================

"use client";

import { submitEnrollmentApplication } from "@/lib/actions/enroll";
import type {
  ApplicationCustodyRestriction,
  ApplicationEmergencyContact,
  ApplicationGuardian,
  ApplicationMedicalCondition,
} from "@/types/domain";
import { useCallback, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────

interface SerializedPeriod {
  id: string;
  name: string;
  period_type: string;
  year: number;
  available_programs: string[];
  required_documents: string[];
  custom_fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  welcome_message: string | null;
  confirmation_message: string | null;
}

interface WizardProps {
  tenantId: string;
  schoolName: string;
  periods: SerializedPeriod[];
}

interface WizardState {
  // Step 1: Your details (primary guardian)
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_email: string;
  guardian_phone: string;
  guardian_relationship: string;
  guardian_address: string;

  // Step 2: Child info
  child_first_name: string;
  child_last_name: string;
  child_preferred_name: string;
  child_dob: string;
  child_gender: string;
  child_nationality: string;
  child_languages: string;
  child_previous_school: string;

  // Step 3: Program
  enrollment_period_id: string;
  requested_program: string;
  requested_start_date: string;

  // Step 4: Additional guardians
  additional_guardians: ApplicationGuardian[];

  // Step 5: Medical
  medical_conditions: ApplicationMedicalCondition[];

  // Step 6: Emergency contacts
  emergency_contacts: ApplicationEmergencyContact[];

  // Step 7: Custody
  custody_restrictions: ApplicationCustodyRestriction[];

  // Step 9: Consents
  media_consent: boolean;
  directory_consent: boolean;
  terms_accepted: boolean;
  privacy_accepted: boolean;

  // Step 3 (custom fields)
  custom_responses: Record<string, string>;
}

const INITIAL_STATE: WizardState = {
  guardian_first_name: "",
  guardian_last_name: "",
  guardian_email: "",
  guardian_phone: "",
  guardian_relationship: "parent",
  guardian_address: "",
  child_first_name: "",
  child_last_name: "",
  child_preferred_name: "",
  child_dob: "",
  child_gender: "",
  child_nationality: "",
  child_languages: "",
  child_previous_school: "",
  enrollment_period_id: "",
  requested_program: "",
  requested_start_date: "",
  additional_guardians: [],
  medical_conditions: [],
  emergency_contacts: [
    {
      name: "",
      relationship: "",
      phone_primary: "",
      phone_secondary: "",
      email: "",
      priority_order: 1,
    },
    {
      name: "",
      relationship: "",
      phone_primary: "",
      phone_secondary: "",
      email: "",
      priority_order: 2,
    },
  ],
  custody_restrictions: [],
  media_consent: false,
  directory_consent: false,
  terms_accepted: false,
  privacy_accepted: false,
  custom_responses: {},
};

const PROGRAM_LABELS: Record<string, string> = {
  infant_toddler_0_3: "Infant/Toddler (0–3)",
  primary_3_6: "Primary (3–6)",
  elementary_6_9: "Lower Elementary (6–9)",
  elementary_9_12: "Upper Elementary (9–12)",
  adolescent_12_15: "Adolescent (12–15)",
  senior_15_18: "Senior (15–18)",
};

const STEP_NAMES = [
  "Your Details",
  "Child Information",
  "Program Selection",
  "Additional Guardians",
  "Medical Information",
  "Emergency Contacts",
  "Custody & Safety",
  "Documents",
  "Consents",
  "Review & Submit",
];

// ── Component ────────────────────────────────────────────────

export function EnrollmentWizard({
  tenantId,
  schoolName,
  periods,
}: WizardProps) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null,
  );

  const storageKey = `wattleos_enroll_${tenantId}`;

  // Auto-select period if only one
  useEffect(() => {
    if (periods.length === 1 && !state.enrollment_period_id) {
      setState((s) => ({ ...s, enrollment_period_id: periods[0].id }));
    }
  }, [periods, state.enrollment_period_id]);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState((s) => ({ ...s, ...parsed }));
      }
    } catch {
      // Ignore parse errors
    }
  }, [storageKey]);

  // Save draft on state change
  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, state]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  // Helpers
  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function selectedPeriod(): SerializedPeriod | undefined {
    return periods.find((p) => p.id === state.enrollment_period_id);
  }

  // ── Validation ─────────────────────────────────────────

  function validateStep(s: number): string | null {
    switch (s) {
      case 0:
        if (!state.guardian_first_name.trim())
          return "Your first name is required.";
        if (!state.guardian_last_name.trim())
          return "Your last name is required.";
        if (!state.guardian_email.trim()) return "Your email is required.";
        return null;
      case 1:
        if (!state.child_first_name.trim())
          return "Child's first name is required.";
        if (!state.child_last_name.trim())
          return "Child's last name is required.";
        if (!state.child_dob) return "Child's date of birth is required.";
        return null;
      case 2:
        if (!state.enrollment_period_id)
          return "Please select an enrollment period.";
        return null;
      case 5: {
        const filled = state.emergency_contacts.filter(
          (ec) => ec.name.trim() && ec.phone_primary.trim(),
        );
        if (filled.length < 2)
          return "At least two emergency contacts are required.";
        return null;
      }
      case 8:
        if (!state.terms_accepted)
          return "You must accept the terms and conditions.";
        if (!state.privacy_accepted)
          return "You must accept the privacy policy.";
        return null;
      default:
        return null;
    }
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 9));
    window.scrollTo(0, 0);
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  }

  function goToStep(s: number) {
    setError(null);
    setStep(s);
    window.scrollTo(0, 0);
  }

  // ── Submit ─────────────────────────────────────────────

  async function handleSubmit() {
    // Validate all required steps
    for (const s of [0, 1, 2, 5, 8]) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const primaryGuardian: ApplicationGuardian = {
      first_name: state.guardian_first_name.trim(),
      last_name: state.guardian_last_name.trim(),
      email: state.guardian_email.trim().toLowerCase(),
      phone: state.guardian_phone.trim() || null,
      relationship: state.guardian_relationship,
      is_primary: true,
      is_emergency_contact: true,
      pickup_authorized: true,
      address: state.guardian_address.trim() || null,
    };

    const allGuardians = [primaryGuardian, ...state.additional_guardians];

    const filledEmergency = state.emergency_contacts.filter(
      (ec) => ec.name.trim() && ec.phone_primary.trim(),
    );

    const filledMedical = state.medical_conditions.filter((mc) =>
      mc.condition_name.trim(),
    );

    const filledCustody = state.custody_restrictions.filter((cr) =>
      cr.restricted_person_name.trim(),
    );

    const result = await submitEnrollmentApplication(tenantId, {
      enrollment_period_id: state.enrollment_period_id,
      submitted_by_email: state.guardian_email.trim().toLowerCase(),
      child_first_name: state.child_first_name.trim(),
      child_last_name: state.child_last_name.trim(),
      child_preferred_name: state.child_preferred_name.trim() || null,
      child_date_of_birth: state.child_dob,
      child_gender: state.child_gender || null,
      child_nationality: state.child_nationality || null,
      child_languages: state.child_languages
        ? state.child_languages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        : [],
      child_previous_school: state.child_previous_school.trim() || null,
      requested_program: state.requested_program || null,
      requested_start_date: state.requested_start_date || null,
      guardians: allGuardians,
      medical_conditions: filledMedical,
      emergency_contacts: filledEmergency,
      custody_restrictions: filledCustody,
      media_consent: state.media_consent,
      directory_consent: state.directory_consent,
      terms_accepted: state.terms_accepted,
      privacy_accepted: state.privacy_accepted,
      custom_responses: state.custom_responses,
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      // Clear draft
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* */
      }

      const period = selectedPeriod();
      setConfirmationMessage(
        period?.confirmation_message ??
          "Thank you for your application. The school will review it and be in touch.",
      );
      setSubmitted(true);
    }
  }

  // ── Success Screen ─────────────────────────────────────

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mb-6 text-5xl">✓</div>
        <h2 className="text-2xl font-bold text-gray-900">
          Application Submitted
        </h2>
        <p className="mt-3 text-sm text-gray-600">{confirmationMessage}</p>
        <p className="mt-6 text-xs text-gray-400">
          You can close this page. We&apos;ll email you at{" "}
          <span className="font-medium">{state.guardian_email}</span> with
          updates.
        </p>
      </div>
    );
  }

  // ── Progress Bar ───────────────────────────────────────

  const progress = ((step + 1) / STEP_NAMES.length) * 100;
  const period = selectedPeriod();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Welcome message */}
      {step === 0 && period?.welcome_message && (
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {period.welcome_message}
        </div>
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            Step {step + 1} of {STEP_NAMES.length}
          </span>
          <span>{STEP_NAMES[step]}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Steps */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* ── Step 0: Your Details ────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Details
            </h2>
            <p className="text-sm text-gray-500">
              Tell us about yourself as the primary contact.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First Name *"
                value={state.guardian_first_name}
                onChange={(v) => update("guardian_first_name", v)}
              />
              <Input
                label="Last Name *"
                value={state.guardian_last_name}
                onChange={(v) => update("guardian_last_name", v)}
              />
              <Input
                label="Email *"
                type="email"
                value={state.guardian_email}
                onChange={(v) => update("guardian_email", v)}
              />
              <Input
                label="Phone"
                type="tel"
                value={state.guardian_phone}
                onChange={(v) => update("guardian_phone", v)}
              />
              <Select
                label="Relationship to Child"
                value={state.guardian_relationship}
                onChange={(v) => update("guardian_relationship", v)}
                options={[
                  { value: "parent", label: "Parent" },
                  { value: "step_parent", label: "Step-Parent" },
                  { value: "grandparent", label: "Grandparent" },
                  { value: "legal_guardian", label: "Legal Guardian" },
                  { value: "other", label: "Other" },
                ]}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  value={state.guardian_address}
                  onChange={(v) => update("guardian_address", v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Child Information ───────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Child Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First Name *"
                value={state.child_first_name}
                onChange={(v) => update("child_first_name", v)}
              />
              <Input
                label="Last Name *"
                value={state.child_last_name}
                onChange={(v) => update("child_last_name", v)}
              />
              <Input
                label="Preferred Name"
                value={state.child_preferred_name}
                onChange={(v) => update("child_preferred_name", v)}
                placeholder="If different from first name"
              />
              <Input
                label="Date of Birth *"
                type="date"
                value={state.child_dob}
                onChange={(v) => update("child_dob", v)}
              />
              <Select
                label="Gender"
                value={state.child_gender}
                onChange={(v) => update("child_gender", v)}
                options={[
                  { value: "", label: "Prefer not to say" },
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "non_binary", label: "Non-binary" },
                  { value: "other", label: "Other" },
                ]}
              />
              <Input
                label="Nationality"
                value={state.child_nationality}
                onChange={(v) => update("child_nationality", v)}
              />
              <Input
                label="Languages Spoken"
                value={state.child_languages}
                onChange={(v) => update("child_languages", v)}
                placeholder="e.g. English, Mandarin"
              />
              <Input
                label="Previous School"
                value={state.child_previous_school}
                onChange={(v) => update("child_previous_school", v)}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Program Selection ───────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Program Selection
            </h2>
            {periods.length > 1 && (
              <Select
                label="Enrollment Period *"
                value={state.enrollment_period_id}
                onChange={(v) => update("enrollment_period_id", v)}
                options={[
                  { value: "", label: "Select a period…" },
                  ...periods.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.year})`,
                  })),
                ]}
              />
            )}
            {period && period.available_programs.length > 0 && (
              <Select
                label="Preferred Program"
                value={state.requested_program}
                onChange={(v) => update("requested_program", v)}
                options={[
                  { value: "", label: "No preference" },
                  ...period.available_programs.map((p) => ({
                    value: p,
                    label: PROGRAM_LABELS[p] ?? p.replace(/_/g, " "),
                  })),
                ]}
              />
            )}
            <Input
              label="Preferred Start Date"
              type="date"
              value={state.requested_start_date}
              onChange={(v) => update("requested_start_date", v)}
            />

            {/* Custom fields */}
            {period && period.custom_fields.length > 0 && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Additional Questions
                </h3>
                {period.custom_fields.map((cf) => (
                  <div key={cf.key}>
                    {cf.type === "textarea" ? (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          {cf.label}{" "}
                          {cf.required && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <textarea
                          value={state.custom_responses[cf.key] ?? ""}
                          onChange={(e) =>
                            update("custom_responses", {
                              ...state.custom_responses,
                              [cf.key]: e.target.value,
                            })
                          }
                          rows={3}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    ) : cf.type === "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={state.custom_responses[cf.key] === "true"}
                          onChange={(e) =>
                            update("custom_responses", {
                              ...state.custom_responses,
                              [cf.key]: e.target.checked ? "true" : "false",
                            })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-amber-600"
                        />
                        {cf.label}{" "}
                        {cf.required && <span className="text-red-500">*</span>}
                      </label>
                    ) : (
                      <Input
                        label={`${cf.label}${cf.required ? " *" : ""}`}
                        value={state.custom_responses[cf.key] ?? ""}
                        onChange={(v) =>
                          update("custom_responses", {
                            ...state.custom_responses,
                            [cf.key]: v,
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Additional Guardians ────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Additional Guardians
                </h2>
                <p className="text-sm text-gray-500">
                  Add other parents or guardians (optional).
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update("additional_guardians", [
                    ...state.additional_guardians,
                    {
                      first_name: "",
                      last_name: "",
                      email: "",
                      phone: "",
                      relationship: "parent",
                      is_primary: false,
                      is_emergency_contact: false,
                      pickup_authorized: true,
                      address: null,
                    },
                  ])
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                + Add Guardian
              </button>
            </div>
            {state.additional_guardians.length === 0 && (
              <p className="text-sm text-gray-400">
                No additional guardians. You can skip this step.
              </p>
            )}
            {state.additional_guardians.map((g, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Guardian {i + 2}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "additional_guardians",
                        state.additional_guardians.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="First Name"
                    value={g.first_name}
                    onChange={(v) => {
                      const arr = [...state.additional_guardians];
                      arr[i] = { ...arr[i], first_name: v };
                      update("additional_guardians", arr);
                    }}
                  />
                  <Input
                    label="Last Name"
                    value={g.last_name}
                    onChange={(v) => {
                      const arr = [...state.additional_guardians];
                      arr[i] = { ...arr[i], last_name: v };
                      update("additional_guardians", arr);
                    }}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={g.email ?? ""}
                    onChange={(v) => {
                      const arr = [...state.additional_guardians];
                      arr[i] = { ...arr[i], email: v || null };
                      update("additional_guardians", arr);
                    }}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={g.phone ?? ""}
                    onChange={(v) => {
                      const arr = [...state.additional_guardians];
                      arr[i] = { ...arr[i], phone: v || null };
                      update("additional_guardians", arr);
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={g.pickup_authorized}
                      onChange={(e) => {
                        const arr = [...state.additional_guardians];
                        arr[i] = {
                          ...arr[i],
                          pickup_authorized: e.target.checked,
                        };
                        update("additional_guardians", arr);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600"
                    />
                    Authorized for pickup
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={g.is_emergency_contact}
                      onChange={(e) => {
                        const arr = [...state.additional_guardians];
                        arr[i] = {
                          ...arr[i],
                          is_emergency_contact: e.target.checked,
                        };
                        update("additional_guardians", arr);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-amber-600"
                    />
                    Emergency contact
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 4: Medical Information ─────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Medical Information
                </h2>
                <p className="text-sm text-gray-500">
                  List any medical conditions, allergies, or special needs.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update("medical_conditions", [
                    ...state.medical_conditions,
                    {
                      condition_type: "allergy",
                      condition_name: "",
                      severity: "mild",
                      description: null,
                      action_plan: null,
                      requires_medication: false,
                      medication_name: null,
                      medication_location: null,
                    },
                  ])
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                + Add Condition
              </button>
            </div>
            {state.medical_conditions.length === 0 && (
              <p className="text-sm text-gray-400">
                No medical conditions. You can skip this step if not applicable.
              </p>
            )}
            {state.medical_conditions.map((mc, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Condition {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "medical_conditions",
                        state.medical_conditions.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label="Type"
                    value={mc.condition_type}
                    onChange={(v) => {
                      const arr = [...state.medical_conditions];
                      arr[i] = { ...arr[i], condition_type: v };
                      update("medical_conditions", arr);
                    }}
                    options={[
                      { value: "allergy", label: "Allergy" },
                      { value: "chronic", label: "Chronic Condition" },
                      { value: "disability", label: "Disability" },
                      { value: "dietary", label: "Dietary Requirement" },
                      {
                        value: "behavioural",
                        label: "Behavioural / Developmental",
                      },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <Input
                    label="Condition Name *"
                    value={mc.condition_name}
                    onChange={(v) => {
                      const arr = [...state.medical_conditions];
                      arr[i] = { ...arr[i], condition_name: v };
                      update("medical_conditions", arr);
                    }}
                  />
                  <Select
                    label="Severity"
                    value={mc.severity}
                    onChange={(v) => {
                      const arr = [...state.medical_conditions];
                      arr[i] = { ...arr[i], severity: v };
                      update("medical_conditions", arr);
                    }}
                    options={[
                      { value: "mild", label: "Mild" },
                      { value: "moderate", label: "Moderate" },
                      { value: "severe", label: "Severe" },
                      { value: "life_threatening", label: "Life Threatening" },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Action Plan
                  </label>
                  <textarea
                    value={mc.action_plan ?? ""}
                    onChange={(e) => {
                      const arr = [...state.medical_conditions];
                      arr[i] = {
                        ...arr[i],
                        action_plan: e.target.value || null,
                      };
                      update("medical_conditions", arr);
                    }}
                    rows={2}
                    placeholder="What should the school do if this condition is triggered?"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mc.requires_medication}
                    onChange={(e) => {
                      const arr = [...state.medical_conditions];
                      arr[i] = {
                        ...arr[i],
                        requires_medication: e.target.checked,
                      };
                      update("medical_conditions", arr);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600"
                  />
                  Requires medication at school
                </label>
                {mc.requires_medication && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Medication Name"
                      value={mc.medication_name ?? ""}
                      onChange={(v) => {
                        const arr = [...state.medical_conditions];
                        arr[i] = { ...arr[i], medication_name: v || null };
                        update("medical_conditions", arr);
                      }}
                    />
                    <Input
                      label="Medication Location"
                      value={mc.medication_location ?? ""}
                      onChange={(v) => {
                        const arr = [...state.medical_conditions];
                        arr[i] = { ...arr[i], medication_location: v || null };
                        update("medical_conditions", arr);
                      }}
                      placeholder="e.g. Child's bag, School office"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step 5: Emergency Contacts ──────────────────── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Emergency Contacts
                </h2>
                <p className="text-sm text-gray-500">
                  At least two emergency contacts are required.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update("emergency_contacts", [
                    ...state.emergency_contacts,
                    {
                      name: "",
                      relationship: "",
                      phone_primary: "",
                      phone_secondary: "",
                      email: "",
                      priority_order: state.emergency_contacts.length + 1,
                    },
                  ])
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                + Add Contact
              </button>
            </div>
            {state.emergency_contacts.map((ec, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Contact {i + 1}{" "}
                    {i < 2 && <span className="text-red-500">*</span>}
                  </span>
                  {i >= 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          "emergency_contacts",
                          state.emergency_contacts.filter((_, j) => j !== i),
                        )
                      }
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Full Name *"
                    value={ec.name}
                    onChange={(v) => {
                      const arr = [...state.emergency_contacts];
                      arr[i] = { ...arr[i], name: v };
                      update("emergency_contacts", arr);
                    }}
                  />
                  <Input
                    label="Relationship"
                    value={ec.relationship}
                    onChange={(v) => {
                      const arr = [...state.emergency_contacts];
                      arr[i] = { ...arr[i], relationship: v };
                      update("emergency_contacts", arr);
                    }}
                    placeholder="e.g. Aunt, Neighbour"
                  />
                  <Input
                    label="Phone (Primary) *"
                    type="tel"
                    value={ec.phone_primary}
                    onChange={(v) => {
                      const arr = [...state.emergency_contacts];
                      arr[i] = { ...arr[i], phone_primary: v };
                      update("emergency_contacts", arr);
                    }}
                  />
                  <Input
                    label="Phone (Secondary)"
                    type="tel"
                    value={ec.phone_secondary ?? ""}
                    onChange={(v) => {
                      const arr = [...state.emergency_contacts];
                      arr[i] = { ...arr[i], phone_secondary: v || null };
                      update("emergency_contacts", arr);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 6: Custody & Safety ────────────────────── */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Custody & Safety
                </h2>
                <p className="text-sm text-gray-500">
                  Are there any custody restrictions or people who should not
                  have access to your child? Leave empty if not applicable.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update("custody_restrictions", [
                    ...state.custody_restrictions,
                    {
                      restricted_person_name: "",
                      restriction_type: "no_pickup",
                      court_order_reference: null,
                      notes: null,
                    },
                  ])
                }
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                + Add Restriction
              </button>
            </div>
            {state.custody_restrictions.length === 0 && (
              <p className="text-sm text-gray-400">
                No restrictions. You can skip this step.
              </p>
            )}
            {state.custody_restrictions.map((cr, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-red-100 bg-red-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-900">
                    Restriction {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "custody_restrictions",
                        state.custody_restrictions.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Person's Name *"
                    value={cr.restricted_person_name}
                    onChange={(v) => {
                      const arr = [...state.custody_restrictions];
                      arr[i] = { ...arr[i], restricted_person_name: v };
                      update("custody_restrictions", arr);
                    }}
                  />
                  <Select
                    label="Restriction Type"
                    value={cr.restriction_type}
                    onChange={(v) => {
                      const arr = [...state.custody_restrictions];
                      arr[i] = { ...arr[i], restriction_type: v };
                      update("custody_restrictions", arr);
                    }}
                    options={[
                      { value: "no_contact", label: "No Contact" },
                      {
                        value: "no_pickup",
                        label: "Not Authorized for Pickup",
                      },
                      {
                        value: "supervised_only",
                        label: "Supervised Access Only",
                      },
                      {
                        value: "no_information",
                        label: "No Information Access",
                      },
                    ]}
                  />
                  <Input
                    label="Court Order Reference"
                    value={cr.court_order_reference ?? ""}
                    onChange={(v) => {
                      const arr = [...state.custody_restrictions];
                      arr[i] = { ...arr[i], court_order_reference: v || null };
                      update("custody_restrictions", arr);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 7: Documents ───────────────────────────── */}
        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <p className="text-sm text-gray-500">
              Upload any required documents for your application.
            </p>
            {period && period.required_documents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Required documents:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  {period.required_documents.map((doc) => (
                    <li key={doc}>
                      {doc
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No specific documents are required for this enrollment period.
              </p>
            )}
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">
                Document upload will be available once Supabase Storage is
                configured. For now, you can submit your application and email
                documents to the school directly.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              You can still proceed without uploading documents - the school may
              request them after reviewing your application.
            </p>
          </div>
        )}

        {/* ── Step 8: Consents ────────────────────────────── */}
        {step === 8 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Consents</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={state.media_consent}
                  onChange={(e) => update("media_consent", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Media Consent
                  </span>
                  <p className="text-xs text-gray-500">
                    I consent to photos and videos of my child being used in
                    school communications, portfolios, and marketing materials.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={state.directory_consent}
                  onChange={(e) =>
                    update("directory_consent", e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Family Directory
                  </span>
                  <p className="text-xs text-gray-500">
                    I consent to our family's contact details being visible to
                    other families in the school directory.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={state.terms_accepted}
                  onChange={(e) => update("terms_accepted", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Terms & Conditions <span className="text-red-500">*</span>
                  </span>
                  <p className="text-xs text-gray-500">
                    I accept the school's terms and conditions of enrollment.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <input
                  type="checkbox"
                  checked={state.privacy_accepted}
                  onChange={(e) => update("privacy_accepted", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Privacy Policy <span className="text-red-500">*</span>
                  </span>
                  <p className="text-xs text-gray-500">
                    I have read and accept the school's privacy policy.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ── Step 9: Review & Submit ─────────────────────── */}
        {step === 9 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Review & Submit
            </h2>
            <p className="text-sm text-gray-500">
              Please review your application before submitting.
            </p>

            <ReviewSection title="Your Details" onEdit={() => goToStep(0)}>
              <ReviewField
                label="Name"
                value={`${state.guardian_first_name} ${state.guardian_last_name}`}
              />
              <ReviewField label="Email" value={state.guardian_email} />
              <ReviewField label="Phone" value={state.guardian_phone} />
              <ReviewField
                label="Relationship"
                value={state.guardian_relationship}
              />
            </ReviewSection>

            <ReviewSection title="Child Information" onEdit={() => goToStep(1)}>
              <ReviewField
                label="Name"
                value={`${state.child_first_name} ${state.child_last_name}`}
              />
              {state.child_preferred_name && (
                <ReviewField
                  label="Preferred Name"
                  value={state.child_preferred_name}
                />
              )}
              <ReviewField label="Date of Birth" value={state.child_dob} />
              {state.child_gender && (
                <ReviewField label="Gender" value={state.child_gender} />
              )}
            </ReviewSection>

            <ReviewSection title="Program" onEdit={() => goToStep(2)}>
              <ReviewField label="Period" value={period?.name ?? " - "} />
              {state.requested_program && (
                <ReviewField
                  label="Program"
                  value={
                    PROGRAM_LABELS[state.requested_program] ??
                    state.requested_program
                  }
                />
              )}
            </ReviewSection>

            {state.additional_guardians.length > 0 && (
              <ReviewSection
                title={`Additional Guardians (${state.additional_guardians.length})`}
                onEdit={() => goToStep(3)}
              >
                {state.additional_guardians.map((g, i) => (
                  <ReviewField
                    key={i}
                    label={`Guardian ${i + 2}`}
                    value={`${g.first_name} ${g.last_name} (${g.email ?? "no email"})`}
                  />
                ))}
              </ReviewSection>
            )}

            {state.medical_conditions.length > 0 && (
              <ReviewSection
                title={`Medical Conditions (${state.medical_conditions.length})`}
                onEdit={() => goToStep(4)}
              >
                {state.medical_conditions.map((mc, i) => (
                  <ReviewField
                    key={i}
                    label={mc.condition_type}
                    value={`${mc.condition_name} (${mc.severity})`}
                  />
                ))}
              </ReviewSection>
            )}

            <ReviewSection
              title={`Emergency Contacts (${state.emergency_contacts.filter((ec) => ec.name.trim()).length})`}
              onEdit={() => goToStep(5)}
            >
              {state.emergency_contacts
                .filter((ec) => ec.name.trim())
                .map((ec, i) => (
                  <ReviewField
                    key={i}
                    label={`Contact ${i + 1}`}
                    value={`${ec.name} - ${ec.phone_primary}`}
                  />
                ))}
            </ReviewSection>

            {state.custody_restrictions.length > 0 && (
              <ReviewSection
                title="Custody Restrictions"
                onEdit={() => goToStep(6)}
              >
                {state.custody_restrictions.map((cr, i) => (
                  <ReviewField
                    key={i}
                    label={cr.restriction_type.replace(/_/g, " ")}
                    value={cr.restricted_person_name}
                  />
                ))}
              </ReviewSection>
            )}

            <ReviewSection title="Consents" onEdit={() => goToStep(8)}>
              <ReviewField
                label="Media Consent"
                value={state.media_consent ? "Granted" : "Declined"}
              />
              <ReviewField
                label="Directory"
                value={state.directory_consent ? "Granted" : "Declined"}
              />
              <ReviewField
                label="Terms"
                value={state.terms_accepted ? "Accepted" : "Not accepted"}
              />
              <ReviewField
                label="Privacy"
                value={state.privacy_accepted ? "Accepted" : "Not accepted"}
              />
            </ReviewSection>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        {step > 0 ? (
          <button
            onClick={goBack}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

        {step < 9 ? (
          <button
            onClick={goNext}
            className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-green-600 px-8 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        )}
      </div>

      {/* Draft notice */}
      <p className="mt-4 text-center text-xs text-gray-400">
        Your progress is saved automatically. You can close this page and return
        later.
      </p>
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          Edit
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">{children}</dl>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value || " - "}</dd>
    </>
  );
}
