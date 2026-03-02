// src/components/domain/glow/glow-overlay.tsx
//
// ============================================================
// WattleOS V2 - Glow Overlay Renderer
// ============================================================
// Renders an interactive spotlight overlay that highlights UI
// elements Ask Wattle wants the user to interact with.
//
// Visual layers (bottom to top):
//   z-9997  Backdrop - semi-transparent SVG with cutouts
//   z-9998  Glow rings - animated halos around target elements
//   z-9999  Labels - positioned pills with step badges
//   z-10000 Step bar - fixed progress indicator at bottom
//
// Key UX features:
//   - Spotlight backdrop dims everything except targets
//   - Auto scroll-into-view when highlights activate
//   - Smart label positioning (below/above/right/left)
//   - Entrance & exit animations with stagger
//   - "glow" vs "pulse" visual distinction
//   - Haptic feedback on mobile (Capacitor)
//   - Step progress bar with back/skip/dismiss
//   - Click backdrop to dismiss, Escape to dismiss
// ============================================================

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useGlowRegistry } from "./glow-registry";

// ============================================================
// Types
// ============================================================

interface GlowRingPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  visible: boolean;
}

type LabelPlacement = "below" | "above" | "right" | "left";

// ============================================================
// Helpers
// ============================================================

const RING_PAD = 8;
const RING_RADIUS = 12;
const LABEL_GAP = 10;
const LABEL_MARGIN = 12;
const LABEL_MIN_SPACE = 44; // minimum px to place a label

/** Check if a rect is in the current viewport */
function isInViewport(rect: DOMRect): boolean {
  return (
    rect.top >= -50 &&
    rect.bottom <= window.innerHeight + 50 &&
    rect.left >= -50 &&
    rect.right <= window.innerWidth + 50
  );
}

/** Pick the best placement for a label given the target rect */
function pickLabelPlacement(rect: DOMRect): LabelPlacement {
  const spaceBelow = window.innerHeight - rect.bottom - RING_PAD;
  const spaceAbove = rect.top - RING_PAD;
  const spaceRight = window.innerWidth - rect.right - RING_PAD;
  const spaceLeft = rect.left - RING_PAD;

  // Prefer below, then above, then right, then left
  if (spaceBelow >= LABEL_MIN_SPACE) return "below";
  if (spaceAbove >= LABEL_MIN_SPACE) return "above";
  if (spaceRight >= LABEL_MIN_SPACE) return "right";
  if (spaceLeft >= LABEL_MIN_SPACE) return "left";
  return "below"; // fallback
}

/** Clamp a horizontal center position so the label stays on screen */
function clampX(centerX: number, labelWidth: number): number {
  const half = labelWidth / 2;
  const min = LABEL_MARGIN + half;
  const max = window.innerWidth - LABEL_MARGIN - half;
  return Math.max(min, Math.min(max, centerX));
}

// ============================================================
// GlowOverlay
// ============================================================

export function GlowOverlay() {
  const {
    activeHighlights,
    currentStep,
    getTarget,
    dismissHighlight,
    dismissAll,
    advanceStep,
    rewindStep,
    workflowTitle,
    totalStepsOverride,
  } = useGlowRegistry();

  const haptics = useHaptics();
  const [positions, setPositions] = useState<Map<string, GlowRingPosition>>(
    new Map(),
  );
  const [exiting, setExiting] = useState(false);
  const animFrameRef = useRef<number>(0);
  const prevHighlightCountRef = useRef(0);
  const prevStepRef = useRef(1);

  // Filter highlights to current step
  const visibleHighlights = activeHighlights.filter(
    (h) => (h.step ?? 1) === currentStep,
  );

  const totalSteps =
    totalStepsOverride ??
    Math.max(...activeHighlights.map((h) => h.step ?? 1), 0);
  const showStepBar = totalSteps > 1;

  // ── Positioning ───────────────────────────────────────────

  const updatePositions = useCallback(() => {
    const newPositions = new Map<string, GlowRingPosition>();

    for (const highlight of visibleHighlights) {
      const target = getTarget(highlight.target_id);
      if (!target?.ref.current) {
        newPositions.set(highlight.target_id, {
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          visible: false,
        });
        continue;
      }

      const rect = target.ref.current.getBoundingClientRect();
      newPositions.set(highlight.target_id, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0,
      });
    }

    setPositions(newPositions);
  }, [visibleHighlights, getTarget]);

  // Update positions on mount, scroll, resize
  useEffect(() => {
    if (visibleHighlights.length === 0) return;

    updatePositions();

    const handleUpdate = () => {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(updatePositions);
    };

    window.addEventListener("scroll", handleUpdate, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", handleUpdate, { passive: true });

    // ResizeObserver for dynamic content changes
    const observer = new ResizeObserver(handleUpdate);
    for (const highlight of visibleHighlights) {
      const target = getTarget(highlight.target_id);
      if (target?.ref.current) {
        observer.observe(target.ref.current);
      }
    }

    return () => {
      window.removeEventListener("scroll", handleUpdate, { capture: true });
      window.removeEventListener("resize", handleUpdate);
      observer.disconnect();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [visibleHighlights, getTarget, updatePositions]);

  // ── Scroll into view ──────────────────────────────────────

  useEffect(() => {
    if (visibleHighlights.length === 0) return;

    const firstHighlight = visibleHighlights[0];
    const target = getTarget(firstHighlight.target_id);
    if (!target?.ref.current) return;

    const rect = target.ref.current.getBoundingClientRect();
    if (!isInViewport(rect)) {
      // Delay slightly so the backdrop appears first
      const timer = setTimeout(() => {
        target.ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [visibleHighlights, getTarget]);

  // ── Haptics ───────────────────────────────────────────────

  useEffect(() => {
    // Haptic on first appearance
    if (activeHighlights.length > 0 && prevHighlightCountRef.current === 0) {
      haptics.impact("light");
    }
    prevHighlightCountRef.current = activeHighlights.length;
  }, [activeHighlights.length, haptics]);

  useEffect(() => {
    // Haptic on step change
    if (currentStep !== prevStepRef.current && activeHighlights.length > 0) {
      haptics.selection();
    }
    prevStepRef.current = currentStep;
  }, [currentStep, activeHighlights.length, haptics]);

  // ── Escape key ────────────────────────────────────────────

  useEffect(() => {
    if (activeHighlights.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismissAll();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHighlights.length]);

  // ── Click handling ────────────────────────────────────────

  useEffect(() => {
    if (visibleHighlights.length === 0) return;

    const handleClick = (e: MouseEvent) => {
      for (const highlight of visibleHighlights) {
        const target = getTarget(highlight.target_id);
        if (target?.ref.current?.contains(e.target as Node)) {
          dismissHighlight(highlight.target_id);

          // Advance to next step if available
          const maxStep = Math.max(...activeHighlights.map((h) => h.step ?? 1));
          if (currentStep < maxStep) {
            advanceStep();
          }
          return;
        }
      }
    };

    // Capture phase so we see clicks before element handlers
    window.addEventListener("click", handleClick, { capture: true });
    return () =>
      window.removeEventListener("click", handleClick, { capture: true });
  }, [
    visibleHighlights,
    activeHighlights,
    currentStep,
    getTarget,
    dismissHighlight,
    advanceStep,
  ]);

  // ── Dismiss all with exit animation ───────────────────────

  const handleDismissAll = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      dismissAll();
      setExiting(false);
    }, 220);
  }, [dismissAll]);

  // ── Backdrop click (dismiss) ──────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Only dismiss if click is on the backdrop, not on a cutout
      if (
        e.target === e.currentTarget ||
        (e.target as SVGElement).tagName === "rect"
      ) {
        handleDismissAll();
      }
    },
    [handleDismissAll],
  );

  // ── Skip step ─────────────────────────────────────────────

  const handleSkip = useCallback(() => {
    // Dismiss all highlights for current step and advance
    for (const h of visibleHighlights) {
      dismissHighlight(h.target_id);
    }
    const maxStep = Math.max(...activeHighlights.map((h) => h.step ?? 1));
    if (currentStep < maxStep) {
      advanceStep();
    } else {
      handleDismissAll();
    }
  }, [
    visibleHighlights,
    activeHighlights,
    currentStep,
    dismissHighlight,
    advanceStep,
    handleDismissAll,
  ]);

  // ── Early return ──────────────────────────────────────────

  if (activeHighlights.length === 0 && !exiting) return null;

  // ── Build cutout rects for backdrop mask ───────────────────

  const cutouts: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (const highlight of visibleHighlights) {
    const pos = positions.get(highlight.target_id);
    if (!pos?.visible) continue;
    cutouts.push({
      x: pos.left - RING_PAD,
      y: pos.top - RING_PAD,
      w: pos.width + RING_PAD * 2,
      h: pos.height + RING_PAD * 2,
    });
  }

  return createPortal(
    <div
      style={{
        // Container for all layers, no layout impact
        position: "fixed",
        inset: 0,
        zIndex: 9997,
        pointerEvents: "none",
        animation: exiting
          ? "glow-backdrop-exit 220ms ease-in forwards"
          : "glow-backdrop-enter 300ms ease-out both",
      }}
    >
      {/* ── Layer 1: Spotlight Backdrop ────────────────────── */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 9997,
          pointerEvents: "auto",
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      >
        <defs>
          <mask id="glow-spotlight-mask">
            {/* White = visible (dark backdrop shows) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black = transparent (element shows through) */}
            {cutouts.map((c, i) => (
              <rect
                key={i}
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                rx={RING_RADIUS}
                ry={RING_RADIUS}
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="var(--glow-backdrop)"
          mask="url(#glow-spotlight-mask)"
        />
      </svg>

      {/* ── Layer 2 & 3: Glow Rings + Labels ──────────────── */}
      {visibleHighlights.map((highlight, index) => {
        const pos = positions.get(highlight.target_id);
        if (!pos?.visible) return null;

        const isPulse = highlight.style === "pulse";
        const staggerDelay = index * 80;

        // Label positioning
        const rect = new DOMRect(pos.left, pos.top, pos.width, pos.height);
        const placement = highlight.label ? pickLabelPlacement(rect) : "below";

        const labelStyle: React.CSSProperties = {
          position: "fixed",
          zIndex: 9999,
          pointerEvents: "auto",
          cursor: "pointer",
        };

        const arrowStyle: React.CSSProperties = {
          position: "absolute",
          width: 0,
          height: 0,
        };

        // Position label and arrow based on placement
        switch (placement) {
          case "below":
            labelStyle.top = pos.top + pos.height + RING_PAD + LABEL_GAP;
            labelStyle.left = clampX(pos.left + pos.width / 2, 200);
            labelStyle.transform = "translateX(-50%)";
            labelStyle.animation = `glow-label-enter 300ms ease-out both`;
            labelStyle.animationDelay = `${200 + staggerDelay}ms`;
            arrowStyle.top = -5;
            arrowStyle.left = "50%";
            arrowStyle.transform = "translateX(-50%)";
            arrowStyle.borderLeft = "6px solid transparent";
            arrowStyle.borderRight = "6px solid transparent";
            arrowStyle.borderBottom = "6px solid var(--glow-label-bg)";
            break;
          case "above":
            labelStyle.bottom =
              window.innerHeight - pos.top + RING_PAD + LABEL_GAP;
            labelStyle.left = clampX(pos.left + pos.width / 2, 200);
            labelStyle.transform = "translateX(-50%)";
            labelStyle.animation = `glow-label-enter-above 300ms ease-out both`;
            labelStyle.animationDelay = `${200 + staggerDelay}ms`;
            arrowStyle.bottom = -5;
            arrowStyle.left = "50%";
            arrowStyle.transform = "translateX(-50%)";
            arrowStyle.borderLeft = "6px solid transparent";
            arrowStyle.borderRight = "6px solid transparent";
            arrowStyle.borderTop = "6px solid var(--glow-label-bg)";
            break;
          case "right":
            labelStyle.top = pos.top + pos.height / 2;
            labelStyle.left = pos.left + pos.width + RING_PAD + LABEL_GAP;
            labelStyle.transform = "translateY(-50%)";
            labelStyle.animation = `glow-label-enter 300ms ease-out both`;
            labelStyle.animationDelay = `${200 + staggerDelay}ms`;
            arrowStyle.top = "50%";
            arrowStyle.left = -5;
            arrowStyle.transform = "translateY(-50%)";
            arrowStyle.borderTop = "6px solid transparent";
            arrowStyle.borderBottom = "6px solid transparent";
            arrowStyle.borderRight = "6px solid var(--glow-label-bg)";
            break;
          case "left":
            labelStyle.top = pos.top + pos.height / 2;
            labelStyle.right =
              window.innerWidth - pos.left + RING_PAD + LABEL_GAP;
            labelStyle.transform = "translateY(-50%)";
            labelStyle.animation = `glow-label-enter 300ms ease-out both`;
            labelStyle.animationDelay = `${200 + staggerDelay}ms`;
            arrowStyle.top = "50%";
            arrowStyle.right = -5;
            arrowStyle.transform = "translateY(-50%)";
            arrowStyle.borderTop = "6px solid transparent";
            arrowStyle.borderBottom = "6px solid transparent";
            arrowStyle.borderLeft = "6px solid var(--glow-label-bg)";
            break;
        }

        return (
          <React.Fragment key={highlight.target_id}>
            {/* Glow ring */}
            <div
              style={{
                position: "fixed",
                top: pos.top - RING_PAD,
                left: pos.left - RING_PAD,
                width: pos.width + RING_PAD * 2,
                height: pos.height + RING_PAD * 2,
                borderRadius: RING_RADIUS,
                animation: `glow-ring-enter 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both, ${
                  isPulse ? "glow-attention-pulse 1.5s" : "glow-pulse 2.5s"
                } ease-in-out 400ms infinite`,
                animationDelay: `${staggerDelay}ms`,
                pointerEvents: "none",
                zIndex: 9998,
              }}
            />

            {/* Label pill */}
            {highlight.label && (
              <div
                style={{
                  ...labelStyle,
                  background: "var(--glow-label-bg)",
                  color: "var(--glow-label-fg)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  padding: "0.375rem 0.75rem",
                  borderRadius: "9999px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 2px 12px var(--glow-label-shadow)`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  userSelect: "none",
                }}
                onClick={() => {
                  const target = getTarget(highlight.target_id);
                  target?.ref.current?.click();
                  target?.ref.current?.focus();
                }}
              >
                {/* Arrow pointer */}
                <span style={arrowStyle} />

                {/* Step badge */}
                {showStepBar && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: "var(--glow-step-bg)",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {highlight.step ?? 1}
                  </span>
                )}
                {highlight.label}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* ── Layer 4: Step Progress Bar ────────────────────── */}
      {showStepBar && !exiting && (
        <div
          style={{
            position: "fixed",
            bottom: `calc(${LABEL_MARGIN}px + var(--safe-bottom, 0px))`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            pointerEvents: "auto",
            animation: "glow-label-enter 300ms ease-out 200ms both",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.375rem",
              background: "var(--glow-label-bg)",
              color: "var(--glow-label-fg)",
              borderRadius: "1rem",
              padding: "0.5rem 0.875rem",
              boxShadow: "0 4px 20px var(--glow-label-shadow)",
              userSelect: "none",
            }}
          >
            {/* Workflow title */}
            {workflowTitle && (
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  opacity: 0.85,
                  letterSpacing: "0.02em",
                }}
              >
                {workflowTitle}
              </span>
            )}

            {/* Controls row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {/* Back button */}
              <button
                onClick={rewindStep}
                disabled={currentStep <= 1}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--glow-label-fg)",
                  cursor: currentStep <= 1 ? "default" : "pointer",
                  opacity: currentStep <= 1 ? 0.35 : 0.85,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                  transition: "opacity 150ms",
                }}
                aria-label="Previous step"
              >
                ‹ Back
              </button>

              {/* Step dots */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                {Array.from({ length: totalSteps }, (_, i) => {
                  const stepNum = i + 1;
                  const isCompleted = stepNum < currentStep;
                  const isCurrent = stepNum === currentStep;

                  return (
                    <span
                      key={stepNum}
                      style={{
                        width: isCurrent ? "0.625rem" : "0.4375rem",
                        height: isCurrent ? "0.625rem" : "0.4375rem",
                        borderRadius: "50%",
                        background:
                          isCompleted || isCurrent
                            ? "var(--glow-label-fg)"
                            : "transparent",
                        border:
                          isCompleted || isCurrent
                            ? "none"
                            : "1.5px solid var(--glow-label-fg)",
                        opacity: isCompleted ? 0.5 : isCurrent ? 1 : 0.4,
                        transition: "all 200ms ease",
                      }}
                    />
                  );
                })}
              </div>

              {/* Skip button */}
              <button
                onClick={handleSkip}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--glow-label-fg)",
                  cursor: "pointer",
                  opacity: 0.85,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.125rem 0.25rem",
                  borderRadius: "0.25rem",
                  transition: "opacity 150ms",
                }}
                aria-label="Skip step"
              >
                Skip ›
              </button>

              {/* Dismiss button */}
              <button
                onClick={handleDismissAll}
                style={{
                  background: "var(--glow-step-bg)",
                  border: "none",
                  color: "var(--glow-label-fg)",
                  borderRadius: "50%",
                  width: "1.375rem",
                  height: "1.375rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  lineHeight: 1,
                  marginLeft: "0.25rem",
                  transition: "opacity 150ms",
                }}
                aria-label="Dismiss guidance"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
