"use client";

// src/components/plg/UpsellNudge.tsx
//
// ============================================================
// WattleOS V2 - PLG Upsell Nudge Component
// ============================================================
// Contextual, data-driven upsell prompt. Never a generic
// "upgrade now" banner - always tied to the specific locked
// feature the user just encountered.
//
// Three variants:
//   inline  - Subtle row below a locked section picker item
//   overlay - Semi-transparent lock overlaid on locked content
//   banner  - Full-width dismissible message at top of page
//
// IMPORTANT: The copy comes from getFeatureUpsellCopy() in
// plan-gating.ts. Adding a new feature = add copy there,
// not in this component.
// ============================================================

import { useState } from "react";
import type { PLGFeature } from "@/lib/plg/plan-gating";
import { getFeatureUpsellCopy } from "@/lib/plg/plan-gating";

// ============================================================
// Types
// ============================================================

interface UpsellNudgeProps {
  feature: PLGFeature;
  variant: "inline" | "overlay" | "banner";
  /** For overlay: wrap the locked content as children */
  children?: React.ReactNode;
  /** For banner: additional context injected into the message */
  contextMessage?: string;
  /** Callback when user clicks the CTA */
  onCtaClick?: () => void;
}

// ============================================================
// Component
// ============================================================

export function UpsellNudge({
  feature,
  variant,
  children,
  contextMessage,
  onCtaClick,
}: UpsellNudgeProps) {
  const copy = getFeatureUpsellCopy(feature);
  const [dismissed, setDismissed] = useState(false);

  if (variant === "banner" && dismissed) return null;

  if (variant === "inline") {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm"
        style={{
          borderColor: "var(--color-warning, #d97706)",
          backgroundColor:
            "color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent)",
          color: "var(--color-foreground)",
        }}
      >
        <span style={{ fontSize: "1rem", flexShrink: 0 }}>🔒</span>
        <div className="flex-1 min-w-0">
          <p
            className="font-medium leading-snug"
            style={{ color: "var(--color-foreground)" }}
          >
            {copy.title}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {copy.description}
          </p>
        </div>
        <button
          onClick={onCtaClick}
          className="shrink-0 rounded px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--color-warning, #d97706)",
            color: "#fff",
          }}
        >
          {copy.cta}
        </button>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className="relative">
        {/* Locked content (greyed out) */}
        <div
          className="select-none pointer-events-none"
          style={{ opacity: 0.35, filter: "grayscale(0.5)" }}
          aria-hidden="true"
        >
          {children}
        </div>
        {/* Lock overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-card, #fff) 85%, transparent)",
            backdropFilter: "blur(2px)",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>🔒</span>
          <p
            className="text-sm font-semibold text-center px-4"
            style={{ color: "var(--color-foreground)" }}
          >
            {copy.title}
          </p>
          <p
            className="text-xs text-center px-6 max-w-xs"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {copy.description}
          </p>
          <button
            onClick={onCtaClick}
            className="mt-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
          >
            {copy.cta}
          </button>
        </div>
      </div>
    );
  }

  // banner
  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: "var(--color-warning, #d97706)",
        backgroundColor:
          "color-mix(in srgb, var(--color-warning, #d97706) 10%, transparent)",
      }}
    >
      <span style={{ fontSize: "1.25rem", flexShrink: 0, marginTop: "1px" }}>
        ⭐
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-foreground)" }}
        >
          {copy.title}
        </p>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          {contextMessage ?? copy.description}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onCtaClick}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-primary-foreground, #fff)",
          }}
        >
          {copy.cta}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 transition-opacity hover:opacity-60"
          style={{ color: "var(--color-muted-foreground)" }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
