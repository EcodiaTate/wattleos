"use client";

// src/components/domain/nccd/nccd-entry-form.tsx
//
// Create / edit form for an NCCD disability register entry.

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  NCCD_ADJUSTMENT_TYPE_CONFIG,
  NCCD_CATEGORIES,
  NCCD_CATEGORY_CONFIG,
  NCCD_FUNDING_CONFIG,
  NCCD_LEVEL_CONFIG,
  NCCD_LEVELS_ORDERED,
  NCCD_STATUS_CONFIG,
  currentNccdYear,
} from "@/lib/constants/nccd";
import { createNccdEntry, updateNccdEntry } from "@/lib/actions/nccd";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  NccdAdjustmentType,
  NccdRegisterEntry,
} from "@/types/domain";

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
}

interface NccdEntryFormProps {
  /** Pass to edit an existing entry */
  entry?: NccdRegisterEntry;
  /** Pass when creating for a specific student */
  studentId?: string;
  students?: StudentOption[];
  onSuccess?: (entryId: string) => void;
}

export function NccdEntryForm({
  entry,
  studentId,
  students = [],
  onSuccess,
}: NccdEntryFormProps) {
  const router = useRouter();
  const haptics = useHaptics();

  const isEdit = !!entry;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    student_id: studentId ?? entry?.student_id ?? "",
    collection_year: entry?.collection_year ?? currentNccdYear(),
    disability_category: entry?.disability_category ?? "cognitive",
    disability_subcategory: entry?.disability_subcategory ?? "",
    adjustment_level: entry?.adjustment_level ?? "qdtp",
    adjustment_types: entry?.adjustment_types ?? ([] as NccdAdjustmentType[]),
    funding_source: entry?.funding_source ?? "",
    funding_reference: entry?.funding_reference ?? "",
    funding_amount: entry?.funding_amount?.toString() ?? "",
    professional_opinion: entry?.professional_opinion ?? false,
    professional_name: entry?.professional_name ?? "",
    professional_title: entry?.professional_title ?? "",
    professional_date: entry?.professional_date ?? "",
    parental_consent_given: entry?.parental_consent_given ?? false,
    parental_consent_date: entry?.parental_consent_date ?? "",
    status: entry?.status ?? "active",
    notes: entry?.notes ?? "",
    review_due_date: entry?.review_due_date ?? "",
    ilp_id: entry?.ilp_id ?? "",
  });

  function toggleAdjustmentType(type: NccdAdjustmentType) {
    haptics.selection();
    setForm((prev) => ({
      ...prev,
      adjustment_types: prev.adjustment_types.includes(type)
        ? prev.adjustment_types.filter((t) => t !== type)
        : [...prev.adjustment_types, type],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (!form.student_id) {
      setError("Please select a student");
      return;
    }
    if (form.adjustment_types.length === 0) {
      setError("Please select at least one adjustment type");
      return;
    }

    setSaving(true);
    setError(null);
    haptics.medium();

    const payload = {
      student_id: form.student_id,
      collection_year: form.collection_year,
      disability_category: form.disability_category as NccdRegisterEntry["disability_category"],
      disability_subcategory: form.disability_subcategory || null,
      adjustment_level: form.adjustment_level as NccdRegisterEntry["adjustment_level"],
      adjustment_types: form.adjustment_types,
      funding_source: (form.funding_source || null) as NccdRegisterEntry["funding_source"],
      funding_reference: form.funding_reference || null,
      funding_amount: form.funding_amount ? parseFloat(form.funding_amount) : null,
      professional_opinion: form.professional_opinion,
      professional_name: form.professional_name || null,
      professional_title: form.professional_title || null,
      professional_date: form.professional_date || null,
      parental_consent_given: form.parental_consent_given,
      parental_consent_date: form.parental_consent_date || null,
      status: form.status as NccdRegisterEntry["status"],
      notes: form.notes || null,
      review_due_date: form.review_due_date || null,
      ilp_id: form.ilp_id || null,
    };

    const result = isEdit
      ? await updateNccdEntry({ id: entry!.id, ...payload })
      : await createNccdEntry(payload);

    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Failed to save");
      haptics.error();
      return;
    }

    haptics.success();
    if (onSuccess) {
      onSuccess(result.data.id);
    } else {
      router.push(`/admin/nccd/register/${result.data.student_id}`);
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student selector (only shown when creating without a pre-selected student) */}
      {!studentId && !isEdit && students.length > 0 && (
        <div>
          <label className={labelClass} style={{ color: "var(--foreground)" }}>
            Student *
          </label>
          <select
            required
            value={form.student_id}
            onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
            className={inputClass}
            style={{ color: "var(--foreground)", background: "var(--background)" }}
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.preferred_name ?? s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Collection year */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Collection Year *
        </label>
        <select
          value={form.collection_year}
          onChange={(e) =>
            setForm((p) => ({ ...p, collection_year: parseInt(e.target.value) }))
          }
          className={inputClass}
          style={{ color: "var(--foreground)", background: "var(--background)" }}
        >
          {Array.from({ length: 5 }, (_, i) => currentNccdYear() - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Disability category */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Disability Category *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {NCCD_CATEGORIES.map((cat) => {
            const config = NCCD_CATEGORY_CONFIG[cat];
            const selected = form.disability_category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setForm((p) => ({ ...p, disability_category: cat }));
                }}
                className={`touch-target active-push flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors ${
                  selected ? "border-2" : "border-border"
                }`}
                style={{
                  borderColor: selected ? config.cssVar : undefined,
                  background: selected ? "var(--accent)" : "var(--card)",
                  color: selected ? config.cssVar : "var(--foreground)",
                }}
                aria-pressed={selected}
              >
                <span className="text-lg">{config.emoji}</span>
                <div>
                  <p className="font-medium leading-tight">{config.label}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Subcategory / specific diagnosis (optional)"
            value={form.disability_subcategory}
            onChange={(e) =>
              setForm((p) => ({ ...p, disability_subcategory: e.target.value }))
            }
            className={inputClass}
            style={{ color: "var(--foreground)", background: "var(--background)" }}
          />
        </div>
      </div>

      {/* Adjustment level */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Level of Adjustment *
        </label>
        <div className="space-y-2">
          {NCCD_LEVELS_ORDERED.map((lvl) => {
            const config = NCCD_LEVEL_CONFIG[lvl];
            const selected = form.adjustment_level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setForm((p) => ({ ...p, adjustment_level: lvl }));
                }}
                className={`touch-target active-push w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected ? "border-2" : "border-border"
                }`}
                style={{
                  borderColor: selected ? config.cssVar : undefined,
                  background: selected ? config.bgVar : "var(--card)",
                  color: selected ? config.fgVar : "var(--foreground)",
                }}
                aria-pressed={selected}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{config.label}</p>
                  <p
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{
                      color: selected ? config.fgVar : "var(--muted-foreground)",
                      opacity: selected ? 0.85 : 1,
                    }}
                  >
                    {config.description}
                  </p>
                </div>
                {selected && (
                  <span className="shrink-0 text-base">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Adjustment types (CEIA) */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Adjustment Types (CEIA) *
        </label>
        <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
          Select all types of adjustments provided
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              "curriculum",
              "environment",
              "instruction",
              "assessment",
            ] as NccdAdjustmentType[]
          ).map((type) => {
            const config = NCCD_ADJUSTMENT_TYPE_CONFIG[type];
            const selected = form.adjustment_types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleAdjustmentType(type)}
                className={`touch-target active-push flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  selected ? "border-2 border-ring" : "border-border"
                }`}
                style={{
                  background: selected ? "var(--accent)" : "var(--card)",
                  color: "var(--foreground)",
                }}
                aria-pressed={selected}
              >
                <span>{config.emoji}</span>
                <span className="font-medium">{config.label}</span>
                {selected && <span className="ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Professional opinion */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="professional_opinion"
            checked={form.professional_opinion}
            onChange={(e) => {
              haptics.light();
              setForm((p) => ({ ...p, professional_opinion: e.target.checked }));
            }}
            className="h-4 w-4 rounded"
          />
          <label
            htmlFor="professional_opinion"
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Professional opinion / evidence obtained
          </label>
        </div>
        {form.professional_opinion && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <input
              type="text"
              placeholder="Professional name"
              value={form.professional_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, professional_name: e.target.value }))
              }
              className={inputClass}
              style={{ color: "var(--foreground)", background: "var(--background)" }}
            />
            <input
              type="text"
              placeholder="Title / role"
              value={form.professional_title}
              onChange={(e) =>
                setForm((p) => ({ ...p, professional_title: e.target.value }))
              }
              className={inputClass}
              style={{ color: "var(--foreground)", background: "var(--background)" }}
            />
            <input
              type="date"
              value={form.professional_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, professional_date: e.target.value }))
              }
              className={inputClass}
              style={{ color: "var(--foreground)", background: "var(--background)" }}
            />
          </div>
        )}
      </div>

      {/* Parental consent */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="parental_consent"
            checked={form.parental_consent_given}
            onChange={(e) => {
              haptics.light();
              setForm((p) => ({
                ...p,
                parental_consent_given: e.target.checked,
                parental_consent_date: e.target.checked
                  ? (p.parental_consent_date || new Date().toISOString().slice(0, 10))
                  : "",
              }));
            }}
            className="h-4 w-4 rounded"
          />
          <label
            htmlFor="parental_consent"
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Parental consent given for NCCD reporting
          </label>
        </div>
        {form.parental_consent_given && (
          <input
            type="date"
            value={form.parental_consent_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, parental_consent_date: e.target.value }))
            }
            className={`${inputClass} max-w-xs`}
            style={{ color: "var(--foreground)", background: "var(--background)" }}
          />
        )}
      </div>

      {/* Funding */}
      <details className="rounded-xl border border-border">
        <summary
          className="cursor-pointer px-4 py-3 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Funding Details (optional)
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-3">
          <select
            value={form.funding_source}
            onChange={(e) =>
              setForm((p) => ({ ...p, funding_source: e.target.value }))
            }
            className={inputClass}
            style={{ color: "var(--foreground)", background: "var(--background)" }}
          >
            <option value="">No funding / not specified</option>
            {Object.entries(NCCD_FUNDING_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
          {form.funding_source && form.funding_source !== "none" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Reference / plan number"
                value={form.funding_reference}
                onChange={(e) =>
                  setForm((p) => ({ ...p, funding_reference: e.target.value }))
                }
                className={inputClass}
                style={{ color: "var(--foreground)", background: "var(--background)" }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Annual amount ($)"
                value={form.funding_amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, funding_amount: e.target.value }))
                }
                className={inputClass}
                style={{ color: "var(--foreground)", background: "var(--background)" }}
              />
            </div>
          )}
        </div>
      </details>

      {/* Status, review date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} style={{ color: "var(--foreground)" }}>
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                status: e.target.value as NccdRegisterEntry["status"],
              }))
            }
            className={inputClass}
            style={{ color: "var(--foreground)", background: "var(--background)" }}
          >
            {Object.entries(NCCD_STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--foreground)" }}>
            Review Due Date
          </label>
          <input
            type="date"
            value={form.review_due_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, review_due_date: e.target.value }))
            }
            className={inputClass}
            style={{ color: "var(--foreground)", background: "var(--background)" }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass} style={{ color: "var(--foreground)" }}>
          Notes
        </label>
        <textarea
          rows={3}
          placeholder="Any additional context or notes for this entry…"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          className={`${inputClass} resize-none`}
          style={{ color: "var(--foreground)", background: "var(--background)" }}
        />
      </div>

      {/* Error */}
      {error && (
        <p
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            background: "var(--nccd-extensive-bg)",
            color: "var(--nccd-extensive-fg)",
            borderColor: "var(--nccd-extensive)",
          }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            router.back();
          }}
          className="touch-target rounded-xl border border-border px-5 py-2.5 text-sm font-medium active-push"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="touch-target active-push rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Entry"}
        </button>
      </div>
    </form>
  );
}
