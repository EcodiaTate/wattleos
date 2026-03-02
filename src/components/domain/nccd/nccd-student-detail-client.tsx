"use client";

// src/components/domain/nccd/nccd-student-detail-client.tsx
//
// Per-student NCCD detail page showing the full entry with evidence.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  NCCD_ADJUSTMENT_TYPE_CONFIG,
  NCCD_CATEGORY_CONFIG,
  NCCD_FUNDING_CONFIG,
  NCCD_LEVEL_CONFIG,
} from "@/lib/constants/nccd";
import { deleteNccdEntry } from "@/lib/actions/nccd";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { NccdEntryWithDetails } from "@/types/domain";

import { NccdAdjustmentLevelBadge } from "./nccd-adjustment-level-badge";
import { NccdCategoryTag } from "./nccd-category-tag";
import { NccdEvidencePanel } from "./nccd-evidence-panel";
import { NccdStatusBadge } from "./nccd-status-badge";

interface NccdStudentDetailClientProps {
  entry: NccdEntryWithDetails;
  canManage: boolean;
}

export function NccdStudentDetailClient({
  entry,
  canManage,
}: NccdStudentDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const studentName = entry.student.preferred_name
    ? `${entry.student.preferred_name} ${entry.student.last_name}`
    : `${entry.student.first_name} ${entry.student.last_name}`;

  const categoryConfig = NCCD_CATEGORY_CONFIG[entry.disability_category];
  const levelConfig = NCCD_LEVEL_CONFIG[entry.adjustment_level];

  async function handleDelete() {
    setDeleting(true);
    haptics.heavy();
    const result = await deleteNccdEntry(entry.id);
    setDeleting(false);
    if (result.error) {
      haptics.error();
      return;
    }
    haptics.success();
    router.push("/admin/nccd/register");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border p-5 space-y-4" style={{ background: "var(--card)" }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            {entry.student.photo_url ? (
              <img
                src={entry.student.photo_url}
                alt={studentName}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: "var(--muted)" }}
              >
                👤
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
                {studentName}
              </h2>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                NCCD {entry.collection_year} collection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <NccdStatusBadge status={entry.status} />
            <NccdAdjustmentLevelBadge level={entry.adjustment_level} />
            {canManage && (
              <Link
                href={`/admin/nccd/register/${entry.student_id}/edit`}
                className="touch-target active-push rounded-xl border border-border px-3 py-2 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Disability info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Disability Category
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl">{categoryConfig.emoji}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {categoryConfig.label}
                </p>
                {entry.disability_subcategory && (
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {entry.disability_subcategory}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Level of Adjustment
            </p>
            <div>
              <p className="text-sm font-semibold" style={{ color: levelConfig.cssVar }}>
                {levelConfig.label}
              </p>
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                {levelConfig.description}
              </p>
            </div>
          </div>
        </div>

        {/* Adjustment types */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
            Adjustment Types (CEIA)
          </p>
          <div className="flex flex-wrap gap-2">
            {entry.adjustment_types.map((type) => {
              const config = NCCD_ADJUSTMENT_TYPE_CONFIG[type];
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border border-border"
                  style={{ background: "var(--muted)", color: "var(--foreground)" }}
                >
                  {config.emoji} {config.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compliance checklist */}
      <div className="rounded-2xl border border-border p-5 space-y-3" style={{ background: "var(--card)" }}>
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          Compliance Checklist
        </h3>
        <div className="space-y-2">
          <ComplianceRow
            label="Parental consent given"
            met={entry.parental_consent_given}
            detail={
              entry.parental_consent_given && entry.parental_consent_date
                ? `Recorded ${new Date(entry.parental_consent_date).toLocaleDateString("en-AU")}`
                : "Required before NCCD submission"
            }
          />
          <ComplianceRow
            label="Professional opinion obtained"
            met={entry.professional_opinion}
            detail={
              entry.professional_opinion && entry.professional_name
                ? `${entry.professional_name}${entry.professional_title ? ` · ${entry.professional_title}` : ""}`
                : "Recommended for Substantial/Extensive levels"
            }
          />
          <ComplianceRow
            label="Evidence items attached"
            met={entry.evidence.length > 0}
            detail={`${entry.evidence.length} item${entry.evidence.length !== 1 ? "s" : ""} attached`}
          />
          <ComplianceRow
            label="Submitted to NCCD collection"
            met={entry.submitted_to_collection}
            detail={
              entry.collection_submitted_at
                ? `Submitted ${new Date(entry.collection_submitted_at).toLocaleDateString("en-AU")}`
                : "Submit via NCCD Export page"
            }
          />
        </div>
      </div>

      {/* Funding */}
      {entry.funding_source && entry.funding_source !== "none" && (
        <div className="rounded-2xl border border-border p-5 space-y-2" style={{ background: "var(--card)" }}>
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Funding
          </h3>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {NCCD_FUNDING_CONFIG[entry.funding_source].label}
          </p>
          {entry.funding_reference && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Reference: {entry.funding_reference}
            </p>
          )}
          {entry.funding_amount != null && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Annual amount: ${entry.funding_amount.toLocaleString("en-AU")}
            </p>
          )}
        </div>
      )}

      {/* ILP linkage */}
      {entry.ilp && (
        <div
          className="rounded-2xl border border-border p-4 flex items-center justify-between gap-3"
          style={{ background: "var(--card)" }}
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>
              Linked ILP
            </p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>
              {entry.ilp.plan_name}
            </p>
          </div>
          <Link
            href={`/admin/learning-plans/${entry.ilp.id}`}
            className="touch-target active-push rounded-xl border border-border px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            View ILP →
          </Link>
        </div>
      )}

      {/* Notes */}
      {entry.notes && (
        <div className="rounded-2xl border border-border p-4" style={{ background: "var(--card)" }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: "var(--muted-foreground)" }}>
            Notes
          </p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
            {entry.notes}
          </p>
        </div>
      )}

      {/* Evidence */}
      <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
        <NccdEvidencePanel
          entryId={entry.id}
          evidence={entry.evidence}
          canManage={canManage}
          onRefresh={() => router.refresh()}
        />
      </div>

      {/* Delete */}
      {canManage && (
        <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "var(--destructive)" }}>
                Are you sure? This will soft-delete this NCCD entry and all its evidence.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { haptics.light(); setShowDeleteConfirm(false); }}
                  className="touch-target active-push rounded-xl border border-border px-4 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="touch-target active-push rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { haptics.medium(); setShowDeleteConfirm(true); }}
              className="touch-target active-push text-sm font-medium"
              style={{ color: "var(--destructive)" }}
            >
              Delete This Entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ComplianceRow({
  label,
  met,
  detail,
}: {
  label: string;
  met: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 shrink-0 text-base"
        style={{ color: met ? "var(--nccd-status-active)" : "var(--nccd-status-under-review)" }}
      >
        {met ? "✓" : "⚠️"}
      </span>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
        {detail && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
