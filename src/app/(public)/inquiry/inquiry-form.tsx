"use client";

// src/app/(public)/inquiry/inquiry-form.tsx
//
// ============================================================
// WattleOS V2 - Public Inquiry Form Client (Module 13)
// ============================================================
// Renders the configurable inquiry form. Built-in optional
// fields are toggled via InquiryConfig.field_toggles. Custom
// questions are appended after the standard sections.
//
// Styling uses pb-btn / pb-input / pb-focus utilities which
// inherit the school's brand colour via CSS vars set by
// PublicPageShell on the parent wrapper.
// ============================================================

import { submitInquiry } from "@/lib/actions/admissions/waitlist-pipeline";
import type { CustomField, InquiryConfig } from "@/types/domain";
import { useEffect, useState } from "react";

interface InquiryFormProps {
  tenantId: string;
  tenantSlug: string;
  schoolName: string;
  config: InquiryConfig;
}

export function InquiryForm({ tenantId, tenantSlug, schoolName, config }: InquiryFormProps) {
  const { field_toggles, custom_fields, referral_sources } = config;

  // ── Core fields ─────────────────────────────────────────
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [currentSchool, setCurrentSchool] = useState("");
  const [requestedProgram, setRequestedProgram] = useState("");
  const [requestedStart, setRequestedStart] = useState("");
  const [siblingsAtSchool, setSiblingsAtSchool] = useState(false);
  const [siblingNames, setSiblingNames] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [notes, setNotes] = useState("");

  // ── Custom field values ─────────────────────────────────
  const [customValues, setCustomValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(custom_fields.map((f) => [f.id, ""])),
  );

  // ── UI state ────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (document.referrer) setSourceUrl(document.referrer);
  }, []);

  // ── Validation ──────────────────────────────────────────
  function validate(): string | null {
    if (!parentFirstName.trim()) return "Parent first name is required.";
    if (!parentLastName.trim()) return "Parent last name is required.";
    if (!parentEmail.trim()) return "Parent email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim()))
      return "Please enter a valid email address.";
    if (!childFirstName.trim()) return "Child first name is required.";
    if (!childLastName.trim()) return "Child last name is required.";
    if (!childDob) return "Child date of birth is required.";
    for (const field of custom_fields) {
      if (field.required && !customValues[field.id]?.trim())
        return `${field.label} is required.`;
    }
    return null;
  }

  // ── Submit ──────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setIsSubmitting(true);
    setError(null);

    const result = await submitInquiry({
      tenant_id: tenantId,
      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      parent_email: parentEmail,
      parent_phone: field_toggles.phone ? parentPhone || undefined : undefined,
      child_first_name: childFirstName,
      child_last_name: childLastName,
      child_date_of_birth: childDob,
      child_current_school: field_toggles.current_school ? currentSchool || undefined : undefined,
      requested_program: requestedProgram || undefined,
      requested_start: requestedStart || undefined,
      siblings_at_school: field_toggles.siblings ? siblingsAtSchool : false,
      sibling_names: field_toggles.siblings && siblingsAtSchool ? siblingNames || undefined : undefined,
      how_heard_about_us: field_toggles.how_heard ? howHeard || undefined : undefined,
      notes: field_toggles.notes ? notes || undefined : undefined,
      source_url: sourceUrl,
    });

    setIsSubmitting(false);

    if (result.error) { setError(result.error.message); return; }
    setIsSuccess(true);
  }

  // ── Success ─────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-success">Enquiry Submitted</h2>
        <p className="mt-2 text-sm text-success">
          {config.confirmation_message ??
            `Thank you for your interest in ${schoolName}. We've received your enquiry and will be in touch soon.`}
        </p>
        <a
          href={`/inquiry/status?tenant=${tenantSlug}`}
          className="mt-5 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold pb-btn"
        >
          Check Status
        </a>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {/* Welcome message */}
      {config.welcome_message && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-sm font-medium"
          style={{
            background: "hsl(var(--pb-hue) var(--pb-sat) 95%)",
            color: "hsl(var(--pb-hue) var(--pb-sat) 28%)",
            borderLeft: "3px solid hsl(var(--pb-hue) var(--pb-sat) 43%)",
          }}
        >
          {config.welcome_message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* ── Your Details ────────────────────────────── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your Details
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First Name" required>
              <input
                type="text"
                value={parentFirstName}
                onChange={(e) => setParentFirstName(e.target.value)}
                autoComplete="given-name"
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            <Field label="Last Name" required>
              <input
                type="text"
                value={parentLastName}
                onChange={(e) => setParentLastName(e.target.value)}
                autoComplete="family-name"
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            {field_toggles.phone && (
              <Field label="Phone">
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="Optional"
                  className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
                />
              </Field>
            )}
          </div>
        </fieldset>

        {/* ── Child Information ────────────────────────── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Child Information
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Child First Name" required>
              <input
                type="text"
                value={childFirstName}
                onChange={(e) => setChildFirstName(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            <Field label="Child Last Name" required>
              <input
                type="text"
                value={childLastName}
                onChange={(e) => setChildLastName(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            <Field label="Date of Birth" required>
              <input
                type="date"
                value={childDob}
                onChange={(e) => setChildDob(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            {field_toggles.current_school && (
              <Field label="Current School">
                <input
                  type="text"
                  value={currentSchool}
                  onChange={(e) => setCurrentSchool(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
                />
              </Field>
            )}
          </div>
        </fieldset>

        {/* ── Preferences ──────────────────────────────── */}
        <fieldset>
          <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Preferences
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Desired Program">
              <input
                type="text"
                value={requestedProgram}
                onChange={(e) => setRequestedProgram(e.target.value)}
                placeholder="e.g., Primary 3–6"
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
            <Field label="Desired Start">
              <input
                type="text"
                value={requestedStart}
                onChange={(e) => setRequestedStart(e.target.value)}
                placeholder="e.g., Term 1 2026, ASAP"
                className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
              />
            </Field>
          </div>
        </fieldset>

        {/* ── Additional Info ──────────────────────────── */}
        {(field_toggles.siblings || field_toggles.how_heard || field_toggles.notes) && (
          <fieldset>
            <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Additional Information
            </legend>
            <div className="space-y-4">
              {field_toggles.siblings && (
                <>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="siblings"
                      checked={siblingsAtSchool}
                      onChange={(e) => setSiblingsAtSchool(e.target.checked)}
                      className="h-4 w-4 rounded border-border pb-focus"
                      style={{ accentColor: "hsl(var(--pb-hue) var(--pb-sat) 43%)" }}
                    />
                    <label htmlFor="siblings" className="text-sm text-foreground">
                      My child has siblings currently at {schoolName}
                    </label>
                  </div>
                  {siblingsAtSchool && (
                    <Field label="Sibling Name(s)">
                      <input
                        type="text"
                        value={siblingNames}
                        onChange={(e) => setSiblingNames(e.target.value)}
                        placeholder="e.g., Emma Smith (Primary)"
                        className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
                      />
                    </Field>
                  )}
                </>
              )}
              {field_toggles.how_heard && (
                <Field label="How did you hear about us?">
                  <select
                    value={howHeard}
                    onChange={(e) => setHowHeard(e.target.value)}
                    className="w-full rounded-lg bg-card px-3 py-2.5 text-sm pb-input"
                  >
                    <option value="">Select…</option>
                    {referral_sources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              )}
              {field_toggles.notes && (
                <Field label="Questions or notes for the school">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Anything you'd like us to know…"
                    className="w-full rounded-lg px-3 py-2.5 text-sm pb-input"
                  />
                </Field>
              )}
            </div>
          </fieldset>
        )}

        {/* ── Custom Questions ─────────────────────────── */}
        {custom_fields.length > 0 && (
          <fieldset>
            <legend className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Additional Questions
            </legend>
            <div className="space-y-4">
              {custom_fields.map((field) => (
                <Field key={field.id} label={field.label} required={field.required}>
                  <CustomFieldInput
                    field={field}
                    value={customValues[field.id] ?? ""}
                    onChange={(v) =>
                      setCustomValues((prev) => ({ ...prev, [field.id]: v }))
                    }
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Submit ──────────────────────────────────── */}
        <div className="pt-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-lg px-6 py-3 text-base pb-btn"
          >
            {isSubmitting ? "Submitting…" : "Submit Enquiry"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            By submitting this form, you&apos;re expressing interest only. This does
            not commit you to enrolment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base = "w-full rounded-lg px-3 py-2.5 text-sm pb-input";

  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={base}
      />
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${base} bg-card`}>
        <option value="">Select…</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(e) => onChange(e.target.checked ? "true" : "")}
          className="h-4 w-4 rounded border-border"
          style={{ accentColor: "hsl(var(--pb-hue) var(--pb-sat) 43%)" }}
        />
        <span className="text-sm text-muted-foreground">{field.label}</span>
      </div>
    );
  }

  return (
    <input
      type={field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={base}
    />
  );
}
