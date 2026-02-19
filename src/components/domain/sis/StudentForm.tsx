// src/components/domain/sis/StudentForm.tsx
//
// ============================================================
// WattleOS V2 — Student Create/Edit Form (DESIGN SYSTEM MIGRATED)
// ============================================================
// MIGRATION CHANGES:
// • Error banner: bg-red-50 text-red-700
//   → bg-destructive/10 text-destructive
// • Cards: border-gray-200 bg-white p-6
//   → border-border bg-card p-[var(--density-card-padding)]
// • Section headings: text-lg text-gray-900
//   → text-[length:var(--text-lg)] text-foreground
// • Labels: text-sm text-gray-700
//   → text-[length:var(--text-sm)] text-foreground
// • Required asterisk: text-red-500 → text-destructive
// • Hint text: text-xs text-gray-500
//   → text-[length:var(--text-xs)] text-muted-foreground
// • All inputs: border-gray-300 px-4 py-2.5 text-sm
//     placeholder:text-muted-foreground focus:border-ring focus:ring-ring
//   → border-input bg-card px-4 py-2.5 text-[length:var(--text-sm)]
//     text-foreground placeholder:text-muted-foreground
//     focus:border-ring focus:ring-ring
// • Disabled input: disabled:bg-gray-50 disabled:text-gray-500
//   → disabled:bg-[var(--input-disabled-bg)] disabled:text-[var(--input-disabled-fg)]
// • Primary btn: bg-amber-600 hover:bg-amber-700 text-white
//     focus:ring-ring
//   → bg-primary hover:bg-primary/90 text-primary-foreground
//     focus:ring-ring
// • Cancel link: border-gray-300 bg-white text-gray-700
//     hover:bg-gray-50 focus:ring-ring
//   → border-border bg-card text-foreground
//     hover:bg-muted focus:ring-ring
// • Section spacing: space-y-8 → space-y-[var(--density-section-gap)]
// • Grid gaps: gap-6 → gap-[var(--density-md)]
// • Section margin: mb-4 → mb-[var(--density-md)]
// • Shadow: shadow-sm → shadow-[var(--shadow-xs)]
// ============================================================

"use client";

import type {
  CreateStudentInput,
  UpdateStudentInput,
} from "@/lib/actions/students";
import { createStudent, updateStudent } from "@/lib/actions/students";
import { ENROLLMENT_STATUSES } from "@/lib/constants";
import type { EnrollmentStatus, Student } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Props ───────────────────────────────────────────────────

interface StudentFormProps {
  /** When provided, form operates in edit mode */
  initialData?: Student;
  /** Whether the current user can manage enrollment status */
  canManageEnrollment?: boolean;
}

// ── Gender options ──────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

// ── Shared input class ──────────────────────────────────────
// Extracted to a constant so every field is guaranteed identical.
// Changing one token here changes every input in the form.

const INPUT_CLASS =
  "mt-1 block w-full rounded-lg border border-input bg-card px-4 py-2.5 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

const SELECT_CLASS =
  "mt-1 block w-full rounded-lg border border-input bg-card px-4 py-2.5 text-[length:var(--text-sm)] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

// ── Component ───────────────────────────────────────────────

export function StudentForm({
  initialData,
  canManageEnrollment = true,
}: StudentFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // ── Form state ──────────────────────────────────────────
  const [firstName, setFirstName] = useState(initialData?.first_name ?? "");
  const [lastName, setLastName] = useState(initialData?.last_name ?? "");
  const [preferredName, setPreferredName] = useState(
    initialData?.preferred_name ?? "",
  );
  const [dob, setDob] = useState(initialData?.dob ?? "");
  const [gender, setGender] = useState(initialData?.gender ?? "");
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>(
    initialData?.enrollment_status ?? "active",
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  // ── Submission state ────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (isEditing && initialData) {
      // ── Update existing student ──
      const input: UpdateStudentInput = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        preferred_name: preferredName.trim() || null,
        dob: dob || null,
        gender: gender || null,
        enrollment_status: enrollmentStatus,
        notes: notes.trim() || null,
      };

      const result = await updateStudent(initialData.id, input);

      if (result.error) {
        setError(result.error.message);
        setIsSaving(false);
        return;
      }

      router.push(`/students/${initialData.id}`);
      router.refresh();
    } else {
      // ── Create new student ──
      const input: CreateStudentInput = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        preferred_name: preferredName.trim() || null,
        dob: dob || null,
        gender: gender || null,
        enrollment_status: enrollmentStatus,
        notes: notes.trim() || null,
      };

      const result = await createStudent(input);

      if (result.error) {
        setError(result.error.message);
        setIsSaving(false);
        return;
      }

      // Redirect to the newly created student's detail page
      router.push(`/students/${result.data!.id}`);
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-[var(--density-section-gap)]"
    >
      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4">
          <p className="text-[length:var(--text-sm)] text-destructive">
            {error}
          </p>
        </div>
      )}

      {/* ── Section: Basic Information ───────────────────── */}
      <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="mb-[var(--density-md)] text-[length:var(--text-lg)] font-semibold text-foreground">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          {/* First name */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-[length:var(--text-sm)] font-medium text-foreground"
            >
              First Name <span className="text-destructive">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Charlotte"
              className={INPUT_CLASS}
            />
          </div>

          {/* Last name */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-[length:var(--text-sm)] font-medium text-foreground"
            >
              Last Name <span className="text-destructive">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Mason"
              className={INPUT_CLASS}
            />
          </div>

          {/* Preferred name */}
          <div>
            <label
              htmlFor="preferredName"
              className="block text-[length:var(--text-sm)] font-medium text-foreground"
            >
              Preferred Name
            </label>
            <input
              id="preferredName"
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="e.g. Charlie"
              className={INPUT_CLASS}
            />
            <p className="mt-1 text-[length:var(--text-xs)] text-muted-foreground">
              The name the child goes by day-to-day, if different from their
              first name.
            </p>
          </div>

          {/* Date of birth */}
          <div>
            <label
              htmlFor="dob"
              className="block text-[length:var(--text-sm)] font-medium text-foreground"
            >
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

          {/* Gender */}
          <div>
            <label
              htmlFor="gender"
              className="block text-[length:var(--text-sm)] font-medium text-foreground"
            >
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={SELECT_CLASS}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Enrollment status */}
          <div>
            <label
              htmlFor="enrollmentStatus"
              className="block text-[length:var(--text-sm)] font-medium text-foreground"
            >
              Enrollment Status
            </label>
            <select
              id="enrollmentStatus"
              value={enrollmentStatus}
              onChange={(e) =>
                setEnrollmentStatus(e.target.value as EnrollmentStatus)
              }
              disabled={!canManageEnrollment}
              className={`${SELECT_CLASS} disabled:cursor-not-allowed disabled:bg-[var(--input-disabled-bg)] disabled:text-[var(--input-disabled-fg)]`}
            >
              {ENROLLMENT_STATUSES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {!canManageEnrollment && (
              <p className="mt-1 text-[length:var(--text-xs)] text-muted-foreground">
                You don&apos;t have permission to change enrollment status.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: Notes ───────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="mb-[var(--density-md)] text-[length:var(--text-lg)] font-semibold text-foreground">
          Notes
        </h2>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Any additional notes about this student (dietary requirements, learning preferences, etc.)"
          className="block w-full rounded-lg border border-input bg-card px-4 py-3 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={isEditing ? `/students/${initialData!.id}` : "/students"}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-[length:var(--text-sm)] font-medium text-foreground shadow-[var(--shadow-xs)] hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSaving || !firstName.trim() || !lastName.trim()}
          className="rounded-lg bg-primary px-6 py-2.5 text-[length:var(--text-sm)] font-medium text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create Student"}
        </button>
      </div>
    </form>
  );
}
