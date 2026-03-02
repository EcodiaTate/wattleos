"use client";

// src/components/plg/UpgradeModal.tsx
//
// ============================================================
// WattleOS V2 - PLG Upgrade Modal
// ============================================================
// Full-screen modal that surfaces when a user clicks an upsell
// CTA or hits the admissions conversion wall.
//
// Shows:
//   - What's locked on the current plan
//   - What they've already built (data-driven switching cost)
//   - What Pro unlocks
//   - CTA: "Talk to us" → opens email or contact form
//
// Never shown unprompted. Always triggered by a specific
// user action (clicking a locked feature or hitting a wall).
// ============================================================

import { useEffect, useRef } from "react";

// ============================================================
// Types
// ============================================================

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Why we're showing this modal (e.g. "admissions_wall") */
  trigger?: string;
  /** Optional context data to show in the modal */
  accumulatedData?: {
    observations?: number;
    reports?: number;
    masteryOutcomes?: number;
  };
}

// ============================================================
// Pro feature list (Module A focus)
// ============================================================

const PRO_FEATURES = [
  {
    icon: "📊",
    title: "Auto-populate mastery & observations",
    description:
      "Report sections fill themselves from curriculum tracking and observation data.",
  },
  {
    icon: "👨‍👩‍👧",
    title: "Parent portal delivery",
    description:
      "Parents receive reports in the WattleOS app. No printing, no email attachments.",
  },
  {
    icon: "📅",
    title: "Unlimited report history",
    description:
      "Access all past report periods, not just the most recent one.",
  },
  {
    icon: "👀",
    title: "Colleague visibility",
    description:
      "Guides share one platform. Observations, curriculum, and reports all connect.",
  },
  {
    icon: "🔗",
    title: "Connected data",
    description:
      "Observations update mastery. Mastery fills reports. Everything flows automatically.",
  },
];

// ============================================================
// Component
// ============================================================

export function UpgradeModal({
  isOpen,
  onClose,
  trigger,
  accumulatedData,
}: UpgradeModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (isOpen) {
      ref.current.showModal();
    } else {
      ref.current.close();
    }
  }, [isOpen]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  const isAdmissionsWall = trigger === "admissions_wall";

  const hasData =
    accumulatedData &&
    ((accumulatedData.observations ?? 0) > 0 ||
      (accumulatedData.reports ?? 0) > 0 ||
      (accumulatedData.masteryOutcomes ?? 0) > 0);

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className="m-auto w-full max-w-lg rounded-2xl border p-0 shadow-2xl backdrop:bg-black/50"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-card)",
      }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--color-foreground)" }}
            >
              {isAdmissionsWall
                ? "Complete enrollment with the full platform"
                : "Unlock the full power of WattleOS"}
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {isAdmissionsWall
                ? "To convert an accepted offer to a student enrollment, WattleOS needs the full platform - student record, guardian accounts, billing. Everything is pre-filled and ready to go."
                : "Your team is already building real value. Connect everything with a Pro plan."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:opacity-60"
            style={{ color: "var(--color-muted-foreground)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Accumulated data */}
        {hasData && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{
              borderColor: "var(--color-border)",
              backgroundColor: "var(--color-muted, #f5f5f5)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              What you&apos;ve built so far
            </p>
            <div className="flex gap-6">
              {(accumulatedData?.observations ?? 0) > 0 && (
                <div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {accumulatedData!.observations}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    observations
                  </p>
                </div>
              )}
              {(accumulatedData?.reports ?? 0) > 0 && (
                <div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {accumulatedData!.reports}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    reports
                  </p>
                </div>
              )}
              {(accumulatedData?.masteryOutcomes ?? 0) > 0 && (
                <div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {accumulatedData!.masteryOutcomes}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    outcomes tracked
                  </p>
                </div>
              )}
            </div>
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              This data is already in WattleOS. With Pro, it connects
              automatically.
            </p>
          </div>
        )}

        {/* Pro features */}
        {!isAdmissionsWall && (
          <div className="mt-4 space-y-3">
            {PRO_FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{f.icon}</span>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {f.title}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="mt-6 flex flex-col gap-2">
          <a
            href="mailto:hello@wattleos.com.au?subject=Upgrade%20to%20Pro"
            className="block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            {isAdmissionsWall
              ? "Talk to us about upgrading"
              : "Get Pro - talk to us"}
          </a>
          {isAdmissionsWall && (
            <button
              onClick={onClose}
              className="block w-full rounded-xl border px-4 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-muted-foreground)",
              }}
            >
              Export data and complete manually
            </button>
          )}
          {!isAdmissionsWall && (
            <button
              onClick={onClose}
              className="text-center text-xs py-1 transition-opacity hover:opacity-60"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Continue on free plan
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
