// src/app/(app)/portal/re-enroll/[application_id]/re-enrollment-form.tsx
//
// ============================================================
// WattleOS V2 - Re-enrollment Form Client (Module 10)
// ============================================================
// 'use client' - pre-filled form with collapsible sections.
// Parent reviews existing data, updates what's changed, and
// submits. Much simpler than the full enrollment wizard because
// most data is already present.
//
// WHY collapsible: Parents scanning 10 sections of pre-filled
// data need to quickly find what's changed. Collapsed-by-default
// sections with a "Review ✓" badge let them skip unchanged ones.
// ============================================================

"use client";

import { submitEnrollmentApplication } from "@/lib/actions/enroll";
import type {
  ApplicationEmergencyContact,
  ApplicationGuardian,
  ApplicationMedicalCondition,
  ApplicationWithDetails,
} from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReEnrollmentFormProps {
  application: ApplicationWithDetails;
}

export function ReEnrollmentForm({ application }: ReEnrollmentFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );

  // Pre-fill state from existing application
  const [guardians, setGuardians] = useState<ApplicationGuardian[]>(
    application.guardians ?? [],
  );
  const [medicalConditions, setMedicalConditions] = useState<
    ApplicationMedicalCondition[]
  >(application.medical_conditions ?? []);
  const [emergencyContacts, setEmergencyContacts] = useState<
    ApplicationEmergencyContact[]
  >(application.emergency_contacts ?? []);
  const [mediaConsent, setMediaConsent] = useState(application.media_consent);
  const [directoryConsent, setDirectoryConsent] = useState(
    application.directory_consent,
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!termsAccepted || !privacyAccepted) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await submitEnrollmentApplication(application.tenant_id, {
      enrollment_period_id: application.enrollment_period_id,
      submitted_by_email: application.submitted_by_email,
      child_first_name: application.child_first_name,
      child_last_name: application.child_last_name,
      child_preferred_name: application.child_preferred_name,
      child_date_of_birth: application.child_date_of_birth,
      child_gender: application.child_gender,
      child_nationality: application.child_nationality,
      child_languages: application.child_languages ?? [],
      child_previous_school: application.child_previous_school,
      requested_program: application.requested_program,
      requested_start_date: application.requested_start_date,
      existing_student_id: application.existing_student_id,
      guardians,
      medical_conditions: medicalConditions,
      emergency_contacts: emergencyContacts,
      custody_restrictions: application.custody_restrictions ?? [],
      media_consent: mediaConsent,
      directory_consent: directoryConsent,
      terms_accepted: termsAccepted,
      privacy_accepted: privacyAccepted,
      custom_responses:
        (application.custom_responses as Record<string, unknown>) ?? {},
    });

    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      router.push("/portal/applications");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Child Info - read-only summary */}
      <CollapsibleSection
        title="Child Information"
        expanded={expandedSections.has("child")}
        onToggle={() => toggleSection("child")}
        summary={`${application.child_first_name} ${application.child_last_name} - DOB: ${application.child_date_of_birth}`}
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="text-gray-900">
            {application.child_first_name} {application.child_last_name}
          </dd>
          <dt className="text-gray-500">Date of Birth</dt>
          <dd className="text-gray-900">{application.child_date_of_birth}</dd>
          {application.child_gender && (
            <>
              <dt className="text-gray-500">Gender</dt>
              <dd className="text-gray-900">{application.child_gender}</dd>
            </>
          )}
          {application.requested_program && (
            <>
              <dt className="text-gray-500">Program</dt>
              <dd className="text-gray-900">
                {application.requested_program.replace(/_/g, " ")}
              </dd>
            </>
          )}
        </dl>
        <p className="mt-2 text-xs text-gray-400">
          Contact the school to change child details.
        </p>
      </CollapsibleSection>

      {/* Guardians - editable */}
      <CollapsibleSection
        title={`Guardians (${guardians.length})`}
        expanded={expandedSections.has("guardians")}
        onToggle={() => toggleSection("guardians")}
        summary={guardians
          .map((g) => `${g.first_name} ${g.last_name}`)
          .join(", ")}
      >
        {guardians.map((g, i) => (
          <div
            key={i}
            className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {g.is_primary ? "Primary Guardian" : `Guardian ${i + 1}`}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SmallInput
                label="First Name"
                value={g.first_name}
                onChange={(v) => {
                  const arr = [...guardians];
                  arr[i] = { ...arr[i], first_name: v };
                  setGuardians(arr);
                }}
              />
              <SmallInput
                label="Last Name"
                value={g.last_name}
                onChange={(v) => {
                  const arr = [...guardians];
                  arr[i] = { ...arr[i], last_name: v };
                  setGuardians(arr);
                }}
              />
              <SmallInput
                label="Email"
                value={g.email ?? ""}
                onChange={(v) => {
                  const arr = [...guardians];
                  arr[i] = { ...arr[i], email: v || null };
                  setGuardians(arr);
                }}
              />
              <SmallInput
                label="Phone"
                value={g.phone ?? ""}
                onChange={(v) => {
                  const arr = [...guardians];
                  arr[i] = { ...arr[i], phone: v || null };
                  setGuardians(arr);
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setGuardians([
              ...guardians,
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
          className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          + Add Guardian
        </button>
      </CollapsibleSection>

      {/* Medical Conditions - editable */}
      <CollapsibleSection
        title={`Medical Conditions (${medicalConditions.length})`}
        expanded={expandedSections.has("medical")}
        onToggle={() => toggleSection("medical")}
        summary={
          medicalConditions.length === 0
            ? "None listed"
            : medicalConditions.map((mc) => mc.condition_name).join(", ")
        }
      >
        {medicalConditions.map((mc, i) => (
          <div
            key={i}
            className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                {mc.condition_name || `Condition ${i + 1}`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMedicalConditions(
                    medicalConditions.filter((_, j) => j !== i),
                  )
                }
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SmallInput
                label="Condition"
                value={mc.condition_name}
                onChange={(v) => {
                  const arr = [...medicalConditions];
                  arr[i] = { ...arr[i], condition_name: v };
                  setMedicalConditions(arr);
                }}
              />
              <SmallInput
                label="Severity"
                value={mc.severity}
                onChange={(v) => {
                  const arr = [...medicalConditions];
                  arr[i] = { ...arr[i], severity: v };
                  setMedicalConditions(arr);
                }}
              />
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-xs text-gray-500">
                Action Plan
              </label>
              <textarea
                value={mc.action_plan ?? ""}
                onChange={(e) => {
                  const arr = [...medicalConditions];
                  arr[i] = { ...arr[i], action_plan: e.target.value || null };
                  setMedicalConditions(arr);
                }}
                rows={2}
                className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setMedicalConditions([
              ...medicalConditions,
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
          className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          + Add Condition
        </button>
      </CollapsibleSection>

      {/* Emergency Contacts - editable */}
      <CollapsibleSection
        title={`Emergency Contacts (${emergencyContacts.length})`}
        expanded={expandedSections.has("emergency")}
        onToggle={() => toggleSection("emergency")}
        summary={emergencyContacts
          .map((ec) => ec.name)
          .filter(Boolean)
          .join(", ")}
      >
        {emergencyContacts.map((ec, i) => (
          <div
            key={i}
            className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SmallInput
                label="Name"
                value={ec.name}
                onChange={(v) => {
                  const arr = [...emergencyContacts];
                  arr[i] = { ...arr[i], name: v };
                  setEmergencyContacts(arr);
                }}
              />
              <SmallInput
                label="Relationship"
                value={ec.relationship}
                onChange={(v) => {
                  const arr = [...emergencyContacts];
                  arr[i] = { ...arr[i], relationship: v };
                  setEmergencyContacts(arr);
                }}
              />
              <SmallInput
                label="Phone"
                value={ec.phone_primary}
                onChange={(v) => {
                  const arr = [...emergencyContacts];
                  arr[i] = { ...arr[i], phone_primary: v };
                  setEmergencyContacts(arr);
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setEmergencyContacts([
              ...emergencyContacts,
              {
                name: "",
                relationship: "",
                phone_primary: "",
                phone_secondary: "",
                email: "",
                priority_order: emergencyContacts.length + 1,
              },
            ])
          }
          className="mt-1 text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          + Add Contact
        </button>
      </CollapsibleSection>

      {/* Consents */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Consents</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mediaConsent}
              onChange={(e) => setMediaConsent(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            Media consent (photos/videos in school communications)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={directoryConsent}
              onChange={(e) => setDirectoryConsent(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            Family directory consent
          </label>
          <hr className="my-2" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            I accept the terms and conditions{" "}
            <span className="text-red-500">*</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-amber-600"
            />
            I accept the privacy policy <span className="text-red-500">*</span>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <a
          href="/portal/applications"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Confirm Re-enrollment"}
        </button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function CollapsibleSection({
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {!expanded && (
            <p className="mt-0.5 text-xs text-gray-500 truncate max-w-md">
              {summary}
            </p>
          )}
        </div>
        <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">{children}</div>
      )}
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-xs text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>
  );
}
