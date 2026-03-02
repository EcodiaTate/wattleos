"use client";

// src/components/domain/accreditation/accreditation-rating-badge.tsx
//
// Badge for accreditation criterion rating + cycle status.

import type { AccreditationRating, AccreditationCycleStatus, AccreditationBodyCode } from "@/types/domain";

// ── Rating ───────────────────────────────────────────────────

const RATING_CONFIG: Record<
  AccreditationRating,
  { label: string; cssVar: string; fgVar: string; bgVar: string }
> = {
  not_started:   { label: "Not Started",    cssVar: "--accred-not-started",    fgVar: "--accred-not-started-fg",    bgVar: "--accred-not-started-bg" },
  not_met:       { label: "Not Met",        cssVar: "--accred-not-met",        fgVar: "--accred-not-met-fg",        bgVar: "--accred-not-met-bg" },
  partially_met: { label: "Partially Met",  cssVar: "--accred-partially-met",  fgVar: "--accred-partially-met-fg",  bgVar: "--accred-partially-met-bg" },
  met:           { label: "Met",            cssVar: "--accred-met",            fgVar: "--accred-met-fg",            bgVar: "--accred-met-bg" },
  exceeds:       { label: "Exceeds",        cssVar: "--accred-exceeds",        fgVar: "--accred-exceeds-fg",        bgVar: "--accred-exceeds-bg" },
};

interface AccreditationRatingBadgeProps {
  rating: AccreditationRating;
  size?: "sm" | "md";
}

export function AccreditationRatingBadge({ rating, size = "md" }: AccreditationRatingBadgeProps) {
  const cfg = RATING_CONFIG[rating];
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      style={{ color: `var(${cfg.fgVar})`, background: `var(${cfg.bgVar})` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Cycle Status ─────────────────────────────────────────────

const CYCLE_STATUS_CONFIG: Record<
  AccreditationCycleStatus,
  { label: string; fgVar: string; bgVar: string }
> = {
  draft:        { label: "Draft",         fgVar: "--accred-cycle-draft-fg",        bgVar: "--accred-cycle-draft-bg" },
  self_study:   { label: "Self Study",    fgVar: "--accred-cycle-self-study-fg",   bgVar: "--accred-cycle-self-study-bg" },
  submitted:    { label: "Submitted",     fgVar: "--accred-cycle-submitted-fg",    bgVar: "--accred-cycle-submitted-bg" },
  under_review: { label: "Under Review",  fgVar: "--accred-cycle-under-review-fg", bgVar: "--accred-cycle-under-review-bg" },
  accredited:   { label: "Accredited",    fgVar: "--accred-cycle-accredited-fg",   bgVar: "--accred-cycle-accredited-bg" },
  conditional:  { label: "Conditional",   fgVar: "--accred-cycle-conditional-fg",  bgVar: "--accred-cycle-conditional-bg" },
  lapsed:       { label: "Lapsed",        fgVar: "--accred-cycle-lapsed-fg",       bgVar: "--accred-cycle-lapsed-bg" },
};

interface CycleStatusBadgeProps {
  status: AccreditationCycleStatus;
  size?: "sm" | "md";
}

export function AccreditationCycleStatusBadge({ status, size = "md" }: CycleStatusBadgeProps) {
  const cfg = CYCLE_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      style={{ color: `var(${cfg.fgVar})`, background: `var(${cfg.bgVar})` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Body chip ────────────────────────────────────────────────

const BODY_CONFIG: Record<AccreditationBodyCode, { label: string; cssVar: string; fullName: string }> = {
  ami:  { label: "AMI",  cssVar: "--accred-body-ami",  fullName: "Association Montessori Internationale" },
  ams:  { label: "AMS",  cssVar: "--accred-body-ams",  fullName: "American Montessori Society" },
  msaa: { label: "MSAA", cssVar: "--accred-body-msaa", fullName: "Montessori Schools Association of Australia" },
};

interface BodyChipProps {
  bodyCode: AccreditationBodyCode;
  showFull?: boolean;
}

export function AccreditationBodyChip({ bodyCode, showFull = false }: BodyChipProps) {
  const cfg = BODY_CONFIG[bodyCode];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide"
      style={{ color: `var(${cfg.cssVar})`, border: `1px solid var(${cfg.cssVar})` }}
      title={cfg.fullName}
    >
      {showFull ? cfg.fullName : cfg.label}
    </span>
  );
}

// ── Progress bar ─────────────────────────────────────────────

interface ProgressBarProps {
  pct: number;       // 0–100
  metCount: number;
  totalCount: number;
}

export function AccreditationProgressBar({ pct, metCount, totalCount }: ProgressBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
        <span>{metCount} of {totalCount} criteria met</span>
        <span className="font-medium" style={{ color: "var(--foreground)" }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 80
              ? `var(--accred-met)`
              : pct >= 50
              ? `var(--accred-partially-met)`
              : `var(--accred-not-met)`,
          }}
        />
      </div>
    </div>
  );
}
