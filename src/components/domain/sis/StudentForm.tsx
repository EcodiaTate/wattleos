// src/components/domain/sis/StudentForm.tsx
//
// ============================================================
// WattleOS V2 - Student Create/Edit Form
// ============================================================
// Client Component. Handles both create and edit flows.
//
// PART B: Added collapsible sections for Australian compliance
// fields: Demographics, ACARA Reporting, Address, ISQ, and
// Government Identifiers. All new fields are optional.
//
// WHY client component: Form state (controlled inputs) requires
// useState, and submission uses a server action via async call.
// ============================================================

"use client";

import type { CreateStudentInput, UpdateStudentInput } from "@/lib/actions/students";
import { createStudent, updateStudent } from "@/lib/actions/students";
import { ENROLLMENT_STATUSES } from "@/lib/constants";
import type {
  EnrollmentStatus,
  IndigenousStatus,
  LanguageBackground,
  ResidentialAddress,
  Student,
} from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface StudentFormProps {
  initialData?: Student;
  canManageEnrollment?: boolean;
}

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const INDIGENOUS_STATUS_OPTIONS = [
  { value: "", label: "Not recorded" },
  { value: "aboriginal", label: "Aboriginal" },
  { value: "torres_strait_islander", label: "Torres Strait Islander" },
  { value: "both", label: "Aboriginal and Torres Strait Islander" },
  { value: "neither", label: "Neither" },
  { value: "not_stated", label: "Not stated / Prefer not to say" },
] as const;

const LANGUAGE_BACKGROUND_OPTIONS = [
  { value: "", label: "Not recorded" },
  { value: "english_only", label: "English only" },
  { value: "lbote", label: "Language background other than English (LBOTE)" },
  { value: "not_stated", label: "Not stated / Prefer not to say" },
] as const;

const AUSTRALIAN_STATES = [
  { value: "", label: "Select state" },
  { value: "ACT", label: "ACT" },
  { value: "NSW", label: "NSW" },
  { value: "NT", label: "NT" },
  { value: "QLD", label: "QLD" },
  { value: "SA", label: "SA" },
  { value: "TAS", label: "TAS" },
  { value: "VIC", label: "VIC" },
  { value: "WA", label: "WA" },
] as const;

const INPUT_CLASS =
  "mt-1.5 block w-full rounded-lg border border-input bg-card px-4 h-[var(--density-input-height)] text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all";

export function StudentForm({
  initialData,
  canManageEnrollment = true,
}: StudentFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // ── Basic fields ──────────────────────────────────────────
  const [firstName, setFirstName] = useState(initialData?.first_name ?? "");
  const [lastName, setLastName] = useState(initialData?.last_name ?? "");
  const [preferredName, setPreferredName] = useState(initialData?.preferred_name ?? "");
  const [dob, setDob] = useState(initialData?.dob ?? "");
  const [gender, setGender] = useState(initialData?.gender ?? "");
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>(
    initialData?.enrollment_status ?? "active",
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  // ── Demographics (enrollment form fields) ─────────────────
  const [nationality, setNationality] = useState(initialData?.nationality ?? "");
  const [languages, setLanguages] = useState(initialData?.languages?.join(", ") ?? "");
  const [previousSchool, setPreviousSchool] = useState(initialData?.previous_school ?? "");

  // ── ACARA reporting ───────────────────────────────────────
  const [indigenousStatus, setIndigenousStatus] = useState(initialData?.indigenous_status ?? "");
  const [languageBackground, setLanguageBackground] = useState(initialData?.language_background ?? "");
  const [countryOfBirth, setCountryOfBirth] = useState(initialData?.country_of_birth ?? "");
  const [homeLanguage, setHomeLanguage] = useState(initialData?.home_language ?? "");
  const [visaSubclass, setVisaSubclass] = useState(initialData?.visa_subclass ?? "");

  // ── Address ───────────────────────────────────────────────
  const initialAddr = initialData?.residential_address;
  const [addrLine1, setAddrLine1] = useState(initialAddr?.line1 ?? "");
  const [addrLine2, setAddrLine2] = useState(initialAddr?.line2 ?? "");
  const [addrSuburb, setAddrSuburb] = useState(initialAddr?.suburb ?? "");
  const [addrState, setAddrState] = useState(initialAddr?.state ?? "");
  const [addrPostcode, setAddrPostcode] = useState(initialAddr?.postcode ?? "");
  const [addrCountry, setAddrCountry] = useState(initialAddr?.country ?? "Australia");

  // ── ISQ reporting ─────────────────────────────────────────
  const [religion, setReligion] = useState(initialData?.religion ?? "");

  // ── Government identifiers ────────────────────────────────
  const [crn, setCrn] = useState(initialData?.crn ?? "");
  const [usi, setUsi] = useState(initialData?.usi ?? "");
  const [medicareNumber, setMedicareNumber] = useState(initialData?.medicare_number ?? "");

  // ── Form state ────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Build address JSONB (null if all fields empty) ────────
  function buildAddress(): ResidentialAddress | null {
    const line1 = addrLine1.trim();
    if (!line1) return null; // At minimum, line1 is required for a valid address
    return {
      line1,
      line2: addrLine2.trim() || null,
      suburb: addrSuburb.trim(),
      state: addrState.trim(),
      postcode: addrPostcode.trim(),
      country: addrCountry.trim() || "Australia",
    };
  }

  // ── Parse languages CSV into array ────────────────────────
  function parseLanguages(): string[] | null {
    const trimmed = languages.trim();
    if (!trimmed) return null;
    return trimmed
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const input: CreateStudentInput & UpdateStudentInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      preferred_name: preferredName.trim() || null,
      dob: dob || null,
      gender: gender || null,
      enrollment_status: enrollmentStatus,
      notes: notes.trim() || null,
      // Demographics
      nationality: nationality.trim() || null,
      languages: parseLanguages(),
      previous_school: previousSchool.trim() || null,
      // ACARA
      indigenous_status: (indigenousStatus as IndigenousStatus) || null,
      language_background: (languageBackground as LanguageBackground) || null,
      country_of_birth: countryOfBirth.trim() || null,
      home_language: homeLanguage.trim() || null,
      visa_subclass: visaSubclass.trim() || null,
      // Address
      residential_address: buildAddress(),
      // ISQ
      religion: religion.trim() || null,
      // Government identifiers
      crn: crn.trim() || null,
      usi: usi.trim() || null,
      medicare_number: medicareNumber.trim() || null,
    };

    const result = isEditing
      ? await updateStudent(initialData!.id, input)
      : await createStudent(input);

    if (result.error) {
      setError(result.error.message);
      setIsSaving(false);
      return;
    }

    router.push(`/students/${isEditing ? initialData!.id : result.data!.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--density-section-gap)]">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-[var(--density-card-padding)] animate-fade-in-down">
          <p className="text-sm font-bold text-destructive">{error}</p>
        </div>
      )}

      {/* ── Basic Information ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          Basic Information
        </h2>
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Charlotte"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Mason"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="preferredName" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Preferred Name
            </label>
            <input
              id="preferredName"
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Charlie"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              Used for day-to-day interactions.
            </p>
          </div>
          <div>
            <label htmlFor="dob" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Date of Birth
            </label>
            <input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Gender Identity
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={INPUT_CLASS}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="enrollmentStatus" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Status
            </label>
            <select
              id="enrollmentStatus"
              value={enrollmentStatus}
              onChange={(e) => setEnrollmentStatus(e.target.value as EnrollmentStatus)}
              disabled={!canManageEnrollment}
              className={`${INPUT_CLASS} disabled:opacity-50`}
            >
              {ENROLLMENT_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Demographics ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          Demographics
        </h2>
        <p className="mb-[var(--density-md)] text-xs text-muted-foreground">
          Background information typically collected during enrollment.
        </p>
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div>
            <label htmlFor="nationality" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Nationality
            </label>
            <input
              id="nationality"
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="Australian"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="countryOfBirth" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Country of Birth
            </label>
            <input
              id="countryOfBirth"
              type="text"
              value={countryOfBirth}
              onChange={(e) => setCountryOfBirth(e.target.value)}
              placeholder="Australia"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="languages" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Languages Spoken
            </label>
            <input
              id="languages"
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="English, Mandarin"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              Comma-separated list of all languages.
            </p>
          </div>
          <div>
            <label htmlFor="homeLanguage" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Home Language
            </label>
            <input
              id="homeLanguage"
              type="text"
              value={homeLanguage}
              onChange={(e) => setHomeLanguage(e.target.value)}
              placeholder="English"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              Primary language spoken at home.
            </p>
          </div>
          <div>
            <label htmlFor="previousSchool" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Previous School
            </label>
            <input
              id="previousSchool"
              type="text"
              value={previousSchool}
              onChange={(e) => setPreviousSchool(e.target.value)}
              placeholder="Sunshine Montessori"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="religion" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Religion
            </label>
            <input
              id="religion"
              type="text"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              placeholder="e.g. Catholic, Buddhist, No religion"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              Required for ISQ (Independent Schools Queensland) reporting.
            </p>
          </div>
        </div>
      </div>

      {/* ── ACARA Reporting ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          ACARA / Government Reporting
        </h2>
        <p className="mb-[var(--density-md)] text-xs text-muted-foreground">
          Required for national MySchool reporting and government compliance.
        </p>
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div>
            <label htmlFor="indigenousStatus" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Indigenous Status
            </label>
            <select
              id="indigenousStatus"
              value={indigenousStatus}
              onChange={(e) => setIndigenousStatus(e.target.value)}
              className={INPUT_CLASS}
            >
              {INDIGENOUS_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="languageBackground" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Language Background
            </label>
            <select
              id="languageBackground"
              value={languageBackground}
              onChange={(e) => setLanguageBackground(e.target.value)}
              className={INPUT_CLASS}
            >
              {LANGUAGE_BACKGROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="visaSubclass" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Visa Subclass
            </label>
            <input
              id="visaSubclass"
              type="text"
              value={visaSubclass}
              onChange={(e) => setVisaSubclass(e.target.value)}
              placeholder="e.g. 500, 571"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              For international students only.
            </p>
          </div>
        </div>
      </div>

      {/* ── Residential Address ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          Residential Address
        </h2>
        <p className="mb-[var(--density-md)] text-xs text-muted-foreground">
          Required for ACARA reporting and emergency response.
        </p>
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="addrLine1" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Address Line 1
            </label>
            <input
              id="addrLine1"
              type="text"
              value={addrLine1}
              onChange={(e) => setAddrLine1(e.target.value)}
              placeholder="42 Banksia Street"
              className={INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="addrLine2" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Address Line 2
            </label>
            <input
              id="addrLine2"
              type="text"
              value={addrLine2}
              onChange={(e) => setAddrLine2(e.target.value)}
              placeholder="Unit 3"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="addrSuburb" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Suburb
            </label>
            <input
              id="addrSuburb"
              type="text"
              value={addrSuburb}
              onChange={(e) => setAddrSuburb(e.target.value)}
              placeholder="Paddington"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="addrState" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              State
            </label>
            <select
              id="addrState"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value)}
              className={INPUT_CLASS}
            >
              {AUSTRALIAN_STATES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="addrPostcode" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Postcode
            </label>
            <input
              id="addrPostcode"
              type="text"
              value={addrPostcode}
              onChange={(e) => setAddrPostcode(e.target.value)}
              placeholder="4064"
              maxLength={10}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="addrCountry" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Country
            </label>
            <input
              id="addrCountry"
              type="text"
              value={addrCountry}
              onChange={(e) => setAddrCountry(e.target.value)}
              placeholder="Australia"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {/* ── Government Identifiers ────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          Government Identifiers
        </h2>
        <p className="mb-[var(--density-md)] text-xs text-muted-foreground">
          Sensitive identifiers stored for compliance. Not all fields apply to every student.
        </p>
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
          <div>
            <label htmlFor="crn" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              CRN
            </label>
            <input
              id="crn"
              type="text"
              value={crn}
              onChange={(e) => setCrn(e.target.value)}
              placeholder="Customer Reference Number"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              Child Care Subsidy claims.
            </p>
          </div>
          <div>
            <label htmlFor="usi" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              USI
            </label>
            <input
              id="usi"
              type="text"
              value={usi}
              onChange={(e) => setUsi(e.target.value)}
              placeholder="Unique Student Identifier"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              Mandatory for senior secondary.
            </p>
          </div>
          <div>
            <label htmlFor="medicareNumber" className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Medicare Number
            </label>
            <input
              id="medicareNumber"
              type="text"
              value={medicareNumber}
              onChange={(e) => setMedicareNumber(e.target.value)}
              placeholder="1234 56789 0"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-xs font-medium text-form-helper-fg italic">
              For medical emergencies.
            </p>
          </div>
        </div>
      </div>

      {/* ── Admin Notes ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <h2 className="mb-[var(--density-md)] text-lg font-bold text-foreground">
          Admin Notes
        </h2>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Dietary requirements, learning preferences, etc."
          className="block w-full rounded-xl border border-input bg-background p-4 text-sm font-medium shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      </div>

      {/* ── Form Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href={isEditing ? `/students/${initialData!.id}` : "/students"}
          className="rounded-lg border border-border bg-background px-6 h-[var(--density-button-height)] text-sm font-bold text-foreground hover:bg-muted transition-all active:scale-95 flex items-center"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving || !firstName.trim() || !lastName.trim()}
          className="rounded-lg bg-primary px-8 h-[var(--density-button-height)] text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-600 transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Student"}
        </button>
      </div>
    </form>
  );
}