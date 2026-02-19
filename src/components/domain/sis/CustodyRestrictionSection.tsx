// src/components/domain/sis/CustodyRestrictionSection.tsx
//
// ============================================================
// WattleOS V2 - Custody Restriction Management Section
// ============================================================
// 'use client' - inline add/edit/remove for custody restrictions.
//
// Why safety-critical styling: Custody restrictions are legal
// documents. The red border + warning banner aren't decorative —
// they ensure staff don't miss these records when making
// pickup/release decisions. Every CRUD operation is audit-logged
// by the server action (not here - that's the action's job).
// ============================================================

"use client";

import type {
  CreateCustodyRestrictionInput,
  UpdateCustodyRestrictionInput,
} from "@/lib/actions/custody";
import {
  createCustodyRestriction,
  deleteCustodyRestriction,
  updateCustodyRestriction,
} from "@/lib/actions/custody";
import { RESTRICTION_TYPES } from "@/lib/constants";
import type { CustodyRestriction, RestrictionType } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ── Props ───────────────────────────────────────────────────

interface CustodyRestrictionSectionProps {
  studentId: string;
  restrictions: CustodyRestriction[];
  canManage: boolean;
}

// ── Component ───────────────────────────────────────────────

export function CustodyRestrictionSection({
  studentId,
  restrictions,
  canManage,
}: CustodyRestrictionSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────
  const [restrictedPersonName, setRestrictedPersonName] = useState("");
  const [restrictionType, setRestrictionType] =
    useState<RestrictionType>("no_contact");
  const [courtOrderReference, setCourtOrderReference] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setRestrictedPersonName("");
    setRestrictionType("no_contact");
    setCourtOrderReference("");
    setEffectiveDate(new Date().toISOString().split("T")[0]);
    setExpiryDate("");
    setNotes("");
    setError(null);
  }

  function openAdd() {
    setEditingId(null);
    resetForm();
    setShowAddForm(true);
  }

  function openEdit(restriction: CustodyRestriction) {
    setShowAddForm(false);
    setEditingId(restriction.id);
    setRestrictedPersonName(restriction.restricted_person_name);
    setRestrictionType(restriction.restriction_type);
    setCourtOrderReference(restriction.court_order_reference ?? "");
    setEffectiveDate(restriction.effective_date);
    setExpiryDate(restriction.expiry_date ?? "");
    setNotes(restriction.notes ?? "");
    setError(null);
  }

  function closeForm() {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  }

  async function handleAdd() {
    if (!restrictedPersonName.trim() || !restrictionType || !effectiveDate) {
      setError(
        "Restricted person, restriction type, and effective date are required.",
      );
      return;
    }

    const input: CreateCustodyRestrictionInput = {
      student_id: studentId,
      restricted_person_name: restrictedPersonName.trim(),
      restriction_type: restrictionType,
      court_order_reference: courtOrderReference.trim() || null,
      effective_date: effectiveDate,
      expiry_date: expiryDate || null,
      notes: notes.trim() || null,
    };

    const result = await createCustodyRestriction(input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleUpdate(restrictionId: string) {
    const input: UpdateCustodyRestrictionInput = {
      restricted_person_name: restrictedPersonName.trim(),
      restriction_type: restrictionType,
      court_order_reference: courtOrderReference.trim() || null,
      effective_date: effectiveDate,
      expiry_date: expiryDate || null,
      notes: notes.trim() || null,
    };

    const result = await updateCustodyRestriction(restrictionId, input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete(restrictionId: string, personName: string) {
    if (
      !confirm(
        `⚠️ SAFETY-CRITICAL: Remove custody restriction for "${personName}"?\n\n` +
          `This action is audit-logged. Only proceed if you have authority to modify custody records.`,
      )
    ) {
      return;
    }

    const result = await deleteCustodyRestriction(restrictionId);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    startTransition(() => router.refresh());
  }

  // ── Inline form ─────────────────────────────────────────
  function renderForm(mode: "add" | "edit", restrictionId?: string) {
    return (
      <div className="space-y-4 rounded-md border border-red-200 bg-red-50/50 p-[var(--density-card-padding)]">
        {/* Safety warning */}
        <div className="flex items-start gap-2 rounded bg-red-100 p-2 text-xs text-red-800">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Custody restrictions are safety-critical records. All changes are
            audit-logged with your identity and timestamp.
          </span>
        </div>

        {error && (
          <div className="rounded bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">
              Restricted Person <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={restrictedPersonName}
              onChange={(e) => setRestrictedPersonName(e.target.value)}
              placeholder="Full name of the restricted person"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">
              Restriction Type <span className="text-red-500">*</span>
            </label>
            <select
              value={restrictionType}
              onChange={(e) =>
                setRestrictionType(e.target.value as RestrictionType)
              }
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {RESTRICTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-foreground">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">
              Expiry Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank if indefinite.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">
              Court Order Reference
            </label>
            <input
              type="text"
              value={courtOrderReference}
              onChange={(e) => setCourtOrderReference(e.target.value)}
              placeholder="e.g. FCA-2024-1234"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional context for staff..."
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              mode === "add" ? handleAdd() : handleUpdate(restrictionId!)
            }
            disabled={isPending}
            className="rounded bg-[var(--attendance-absent)] px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-red-700 disabled:opacity-50"
          >
            {isPending
              ? "Saving..."
              : mode === "add"
                ? "Add Restriction"
                : "Save Changes"}
          </button>
          <button
            onClick={closeForm}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── No restrictions case ────────────────────────────────
  if (restrictions.length === 0 && !showAddForm) {
    // Only show the section header if user can manage (to show the add button)
    if (!canManage) return null;

    return (
      <section className="rounded-lg borderborder-border bg-background shadow-sm">
        <div className="flex items-center justify-between border-bborder-border px-6 py-4">
          <h2 className="text-lg font-medium text-foreground">
            Custody Restrictions
          </h2>
          <button
            onClick={openAdd}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            + Add Restriction
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">
            No custody restrictions on file.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border-2 border-red-200 bg-background shadow-sm lg:col-span-2">
      <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-4">
        <h2 className="text-lg font-medium text-red-900">
          Custody Restrictions
        </h2>
        {canManage && !showAddForm && !editingId && (
          <button
            onClick={openAdd}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            + Add Restriction
          </button>
        )}
      </div>
      <div className="px-6 py-4">
        <div className="space-y-3">
          {restrictions.map((restriction) => {
            if (editingId === restriction.id) {
              return (
                <div key={restriction.id}>
                  {renderForm("edit", restriction.id)}
                </div>
              );
            }

            return (
              <div
                key={restriction.id}
                className="rounded-md border border-red-100 bg-red-50/50 p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-red-900">
                        {restriction.restricted_person_name}
                      </p>
                      <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        {restriction.restriction_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {restriction.court_order_reference && (
                      <p className="mt-1 text-xs text-red-700">
                        Court order: {restriction.court_order_reference}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-red-600">
                      Effective: {restriction.effective_date}
                      {restriction.expiry_date &&
                        ` - Expires: ${restriction.expiry_date}`}
                    </p>
                    {restriction.notes && (
                      <p className="mt-1 text-xs text-red-600">
                        {restriction.notes}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(restriction)}
                        className="rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                        title="Edit"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            restriction.id,
                            restriction.restricted_person_name,
                          )
                        }
                        className="rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                        title="Delete"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showAddForm && <div className="mt-3">{renderForm("add")}</div>}
      </div>
    </section>
  );
}
