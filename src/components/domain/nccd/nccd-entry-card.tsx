"use client";

// src/components/domain/nccd/nccd-entry-card.tsx
//
// Card component for displaying an NCCD register entry in a list.

import Link from "next/link";

import {
  NCCD_ADJUSTMENT_TYPE_CONFIG,
  NCCD_CATEGORY_CONFIG,
  NCCD_LEVEL_CONFIG,
} from "@/lib/constants/nccd";
import type { NccdEntryWithStudent } from "@/types/domain";

import { NccdAdjustmentLevelBadge } from "./nccd-adjustment-level-badge";
import { NccdStatusBadge } from "./nccd-status-badge";

interface NccdEntryCardProps {
  entry: NccdEntryWithStudent;
}

export function NccdEntryCard({ entry }: NccdEntryCardProps) {
  const studentName = entry.student.preferred_name
    ? `${entry.student.preferred_name} ${entry.student.last_name}`
    : `${entry.student.first_name} ${entry.student.last_name}`;

  const categoryConfig = NCCD_CATEGORY_CONFIG[entry.disability_category];
  const levelConfig = NCCD_LEVEL_CONFIG[entry.adjustment_level];

  const warnings: string[] = [];
  if (!entry.parental_consent_given) warnings.push("Consent missing");
  if (!entry.professional_opinion) warnings.push("No professional opinion");
  if (entry.status === "under_review") warnings.push("Under review");

  return (
    <Link
      href={`/admin/nccd/register/${entry.student_id}`}
      className="card-interactive block border border-border rounded-xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {entry.student.photo_url ? (
            <img
              src={entry.student.photo_url}
              alt={studentName}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: "var(--muted)" }}
            >
              👤
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>
              {studentName}
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {entry.collection_year} collection · {entry.evidence_count} evidence item{entry.evidence_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NccdStatusBadge status={entry.status} size="sm" />
          <NccdAdjustmentLevelBadge level={entry.adjustment_level} size="sm" />
        </div>
      </div>

      {/* Disability category + adjustment types */}
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: "var(--muted)", color: categoryConfig.cssVar }}
        >
          {categoryConfig.emoji} {categoryConfig.label}
        </span>
        {entry.adjustment_types.map((type) => {
          const typeConfig = NCCD_ADJUSTMENT_TYPE_CONFIG[type];
          return (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {typeConfig.emoji} {typeConfig.label}
            </span>
          );
        })}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
              style={{
                background: "var(--nccd-status-under-review-bg)",
                color: "var(--nccd-status-under-review-fg)",
              }}
            >
              ⚠️ {w}
            </span>
          ))}
        </div>
      )}

      {/* Submission status */}
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
        <span>
          Level {levelConfig.order}: {levelConfig.label}
        </span>
        {entry.submitted_to_collection ? (
          <span className="flex items-center gap-1" style={{ color: "var(--nccd-status-active)" }}>
            ✓ Submitted
          </span>
        ) : (
          <span>Pending submission</span>
        )}
      </div>
    </Link>
  );
}
