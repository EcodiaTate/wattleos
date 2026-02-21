// src/app/(public)/inquiry/inquiry-form.tsx
//
// ============================================================
// WattleOS V2 - Public Inquiry Form Client (Module 13)
// ============================================================
// 'use client' - the inquiry form for prospective families.
// Collects the minimum info needed to get on the waitlist:
// parent contact, child details, program preference.
//
// WHY not a multi-step wizard: Unlike the enrollment form
// (Module 10, 10 steps), the inquiry is deliberately short  -
// 10 fields max. A single-page form has higher completion
// rates for this level of commitment. The full enrollment
// form comes later when the school makes an offer.
//
// Captures source_url from document.referrer for marketing
// attribution tracking.
// ============================================================

"use client";

import { submitInquiry } from "@/lib/actions/admissions/waitlist-pipeline";
import { useEffect, useState } from "react";

interface InquiryFormProps {
  tenantId: string;
  schoolName: string;
}

// ── How-heard-about-us options ───────────────────────────────
const REFERRAL_SOURCES = [
  "Friend or family",
  "Google search",
  "Social media",
  "School website",
  "Open day / tour",
  "Local community",
  "Other",
];

export function InquiryForm({ tenantId, schoolName }: InquiryFormProps) {
  // ── Form state ─────────────────────────────────────────────
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [requestedProgram, setRequestedProgram] = useState("");
  const [requestedStart, setRequestedStart] = useState("");
  const [siblingsAtSchool, setSiblingsAtSchool] = useState(false);
  const [siblingNames, setSiblingNames] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [notes, setNotes] = useState("");

  // ── UI state ───────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  // Capture referrer on mount
  useEffect(() => {
    if (document.referrer) {
      setSourceUrl(document.referrer);
    }
  }, []);

  // ── Validation ─────────────────────────────────────────────
  function validate(): string | null {
    if (!parentFirstName.trim()) return "Parent first name is required.";
    if (!parentLastName.trim()) return "Parent last name is required.";
    if (!parentEmail.trim()) return "Parent email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim()))
      return "Please enter a valid email address.";
    if (!childFirstName.trim()) return "Child first name is required.";
    if (!childLastName.trim()) return "Child last name is required.";
    if (!childDob) return "Child date of birth is required.";
    return null;
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitInquiry({
      tenant_id: tenantId,
      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      parent_email: parentEmail,
      parent_phone: parentPhone || undefined,
      child_first_name: childFirstName,
      child_last_name: childLastName,
      child_date_of_birth: childDob,
      requested_program: requestedProgram || undefined,
      requested_start: requestedStart || undefined,
      siblings_at_school: siblingsAtSchool,
      sibling_names: siblingsAtSchool ? siblingNames || undefined : undefined,
      how_heard_about_us: howHeard || undefined,
      notes: notes || undefined,
      source_url: sourceUrl,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setIsSuccess(true);
  }

  // ── Success state ──────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-green-800">
          Inquiry Submitted
        </h2>
        <p className="mt-2 text-sm text-green-700">
          Thank you for your interest in {schoolName}. We've received your
          inquiry and will be in touch soon. You can check the status of your
          inquiry at any time.
        </p>
        <a
          href="/inquiry/status"
          className="mt-4 inline-block rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Check Status
        </a>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Parent / Contact Section */}
        <fieldset>
          <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Your Details
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={parentFirstName}
                onChange={(e) => setParentFirstName(e.target.value)}
                autoComplete="given-name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={parentLastName}
                onChange={(e) => setParentLastName(e.target.value)}
                autoComplete="family-name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                autoComplete="tel"
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Child Section */}
        <fieldset>
          <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Child Information
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Child First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={childFirstName}
                onChange={(e) => setChildFirstName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Child Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={childLastName}
                onChange={(e) => setChildLastName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={childDob}
                onChange={(e) => setChildDob(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Preferences Section */}
        <fieldset>
          <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Preferences
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Desired Program
              </label>
              <input
                type="text"
                value={requestedProgram}
                onChange={(e) => setRequestedProgram(e.target.value)}
                placeholder="e.g., Primary 3-6, Adolescent 12-15"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Desired Start
              </label>
              <input
                type="text"
                value={requestedStart}
                onChange={(e) => setRequestedStart(e.target.value)}
                placeholder="e.g., Term 1 2027, ASAP"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Additional Info */}
        <fieldset>
          <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Additional Information
          </legend>
          <div className="space-y-4">
            {/* Siblings */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="siblings"
                checked={siblingsAtSchool}
                onChange={(e) => setSiblingsAtSchool(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="siblings" className="text-sm text-gray-700">
                My child has siblings currently at {schoolName}
              </label>
            </div>
            {siblingsAtSchool && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sibling Name(s)
                </label>
                <input
                  type="text"
                  value={siblingNames}
                  onChange={(e) => setSiblingNames(e.target.value)}
                  placeholder="e.g., Emma Smith (Primary)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            {/* How heard */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                How did you hear about us?
              </label>
              <select
                value={howHeard}
                onChange={(e) => setHowHeard(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select…</option>
                {REFERRAL_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Questions or notes for the school
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything you'd like us to know…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </fieldset>

        {/* Submit */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Submit Inquiry"}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            By submitting this form, you're expressing interest only. This does
            not commit you to enrollment.
          </p>
        </div>
      </div>
    </div>
  );
}
