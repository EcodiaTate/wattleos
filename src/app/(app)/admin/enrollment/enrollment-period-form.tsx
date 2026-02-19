// src/app/(app)/admin/enrollment/enrollment-period-form.tsx
//
// ============================================================
// WattleOS V2 - Enrollment Period Form (Module 10)
// ============================================================
// 'use client' - interactive form for creating/editing
// enrollment periods. Shared between create and edit pages.
//
// WHY client: Controlled inputs, dynamic field management
// (adding/removing programs, documents, custom fields).
// ============================================================

"use client";

import {
  createEnrollmentPeriod,
  updateEnrollmentPeriod,
} from "@/lib/actions/enroll";
import type { CustomField, EnrollmentPeriod } from "@/types/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ── Program options (will be dynamic once programs exist) ────

const PROGRAM_OPTIONS = [
  { value: "infant_toddler_0_3", label: "Infant/Toddler (0–3)" },
  { value: "primary_3_6", label: "Primary (3–6)" },
  { value: "elementary_6_9", label: "Lower Elementary (6–9)" },
  { value: "elementary_9_12", label: "Upper Elementary (9–12)" },
  { value: "adolescent_12_15", label: "Adolescent (12–15)" },
  { value: "senior_15_18", label: "Senior (15–18)" },
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: "immunization_record", label: "Immunization Record" },
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "custody_order", label: "Custody Order" },
  { value: "medical_action_plan", label: "Medical Action Plan" },
  { value: "previous_school_report", label: "Previous School Report" },
  { value: "passport_copy", label: "Passport / ID Copy" },
  { value: "other", label: "Other" },
];

// ── Props ────────────────────────────────────────────────────

interface EnrollmentPeriodFormProps {
  initialData?: EnrollmentPeriod;
}

// ── Helpers ──────────────────────────────────────────────────

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EnrollmentPeriodForm({
  initialData,
}: EnrollmentPeriodFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData;

  // Form state
  const [name, setName] = useState(initialData?.name ?? "");
  const [periodType, setPeriodType] = useState<
    "new_enrollment" | "re_enrollment" | "mid_year"
  >(
    (initialData?.period_type as
      | "new_enrollment"
      | "re_enrollment"
      | "mid_year") ?? "new_enrollment",
  );
  const [year, setYear] = useState(
    initialData?.year ?? new Date().getFullYear() + 1,
  );
  const [opensAt, setOpensAt] = useState(
    initialData?.opens_at ? toDatetimeLocal(initialData.opens_at) : "",
  );
  const [closesAt, setClosesAt] = useState(
    initialData?.closes_at ? toDatetimeLocal(initialData.closes_at) : "",
  );
  const [availablePrograms, setAvailablePrograms] = useState<string[]>(
    (initialData?.available_programs as string[]) ?? [],
  );
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>(
    (initialData?.required_documents as string[]) ?? [],
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialData?.welcome_message ?? "",
  );
  const [confirmationMessage, setConfirmationMessage] = useState(
    initialData?.confirmation_message ?? "",
  );

  // Custom fields management
  const [customFields, setCustomFields] = useState<CustomField[]>(
    (initialData?.custom_fields as CustomField[]) ?? [],
  );

  function toggleProgram(value: string) {
    setAvailablePrograms((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  }

  function toggleDocument(value: string) {
    setRequiredDocuments((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  function addCustomField() {
    setCustomFields((prev) => [
      ...prev,
      { key: "", label: "", type: "text", required: false },
    ]);
  }

  function updateCustomField(index: number, field: Partial<CustomField>) {
    setCustomFields((prev) =>
      prev.map((cf, i) => (i === index ? { ...cf, ...field } : cf)),
    );
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const opensAtIso = opensAt ? new Date(opensAt).toISOString() : "";
    const closesAtIso = closesAt ? new Date(closesAt).toISOString() : null;

    if (!name.trim()) {
      setError("Period name is required.");
      return;
    }
    if (!opensAt) {
      setError("Opening date is required.");
      return;
    }

    startTransition(async () => {
      if (isEdit && initialData) {
        const result = await updateEnrollmentPeriod(initialData.id, {
          name: name.trim(),
          period_type: periodType,
          year,
          opens_at: opensAtIso,
          closes_at: closesAtIso,
          available_programs: availablePrograms,
          required_documents: requiredDocuments,
          custom_fields: customFields.filter((cf) => cf.key && cf.label),
          welcome_message: welcomeMessage.trim() || null,
          confirmation_message: confirmationMessage.trim() || null,
        });
        if (result.error) {
          setError(result.error.message);
        } else {
          router.push("/admin/enrollment");
          router.refresh();
        }
      } else {
        const result = await createEnrollmentPeriod({
          name: name.trim(),
          period_type: periodType,
          year,
          opens_at: opensAtIso,
          closes_at: closesAtIso,
          available_programs: availablePrograms,
          required_documents: requiredDocuments,
          custom_fields: customFields.filter((cf) => cf.key && cf.label),
          welcome_message: welcomeMessage.trim() || null,
          confirmation_message: confirmationMessage.trim() || null,
        });
        if (result.error) {
          setError(result.error.message);
        } else {
          router.push("/admin/enrollment");
          router.refresh();
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Basic Details ─────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Basic Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Period Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Term 1 2027 Intake"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Period Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Period Type <span className="text-red-500">*</span>
            </label>
            <select
              value={periodType}
              onChange={(e) =>
                setPeriodType(
                  e.target.value as
                    | "new_enrollment"
                    | "re_enrollment"
                    | "mid_year",
                )
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="new_enrollment">New Enrollment</option>
              <option value="re_enrollment">Re-Enrollment</option>
              <option value="mid_year">Mid-Year</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2020}
              max={2100}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Opens At */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Opens At <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Closes At */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Closes At{" "}
              <span className="text-xs text-gray-400">
                (optional - leave blank for indefinite)
              </span>
            </label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* ── Available Programs ────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Available Programs
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Which programs can parents apply to in this period?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAM_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={availablePrograms.includes(opt.value)}
                onChange={() => toggleProgram(opt.value)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Required Documents ────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Required Documents
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          What documents must parents upload with their application?
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={requiredDocuments.includes(opt.value)}
                onChange={() => toggleDocument(opt.value)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Custom Fields ─────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Custom Questions
            </h2>
            <p className="text-sm text-gray-500">
              Add school-specific questions to the enrollment form.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomField}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            + Add Question
          </button>
        </div>

        {customFields.length === 0 && (
          <p className="text-sm text-gray-400">No custom questions added.</p>
        )}

        <div className="space-y-3">
          {customFields.map((cf, index) => (
            <div
              key={index}
              className="grid grid-cols-12 items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div className="col-span-3">
                <input
                  type="text"
                  value={cf.key}
                  onChange={(e) =>
                    updateCustomField(index, { key: e.target.value })
                  }
                  placeholder="field_key"
                  className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  value={cf.label}
                  onChange={(e) =>
                    updateCustomField(index, { label: e.target.value })
                  }
                  placeholder="Question label"
                  className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <select
                  value={cf.type}
                  onChange={(e) =>
                    updateCustomField(index, { type: e.target.value })
                  }
                  className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={cf.required}
                    onChange={(e) =>
                      updateCustomField(index, {
                        required: e.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600"
                  />
                  Required
                </label>
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeCustomField(index)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Messages</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Welcome Message{" "}
              <span className="text-xs text-gray-400">
                (shown at top of form)
              </span>
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="Welcome to our enrollment process..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmation Message{" "}
              <span className="text-xs text-gray-400">
                (shown after submission)
              </span>
            </label>
            <textarea
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
              rows={3}
              placeholder="Thank you for your application. We will review it shortly..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* ── Submit ─────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/admin/enrollment"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Update Period" : "Create Period"}
        </button>
      </div>
    </form>
  );
}
