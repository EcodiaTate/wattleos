// src/components/domain/glow/glow-registry.tsx
//
// ============================================================
// WattleOS V2 - Glow UI Guidance Registry
// ============================================================
// Tracks interactive UI elements that Ask Wattle can highlight
// to guide users through workflows. Components register
// themselves via <GlowTarget> or useGlowTarget(), and the
// registry produces a compressed manifest string for the LLM.
//
// WHY a ref-based registry (not state): Element registration
// happens on every mount/unmount. Storing in state would
// trigger re-renders across the entire tree on every page
// navigation. A ref-based Map is silent - only the manifest
// getter reads it, and only when a query is sent.
//
// WHY compressed manifest format: The full registry could have
// 50+ elements. Sending verbose JSON wastes tokens. A compact
// text format (~200 tokens per screen) keeps the context
// window lean while giving the LLM everything it needs.
// ============================================================

"use client";

import type { GlowHighlight } from "@/types/ask-wattle";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ============================================================
// Types
// ============================================================

export interface GlowTargetMeta {
  /** Unique identifier, e.g. "student-card-abc123" */
  id: string;
  /** Element category: "button", "card", "input", "select", "row" */
  category: string;
  /** Human-readable label for the LLM, e.g. "Sarah M's card" */
  label: string;
  /** Arbitrary metadata the LLM can use for targeting */
  context?: Record<string, string>;
  /** DOM reference for positioning the glow overlay */
  ref: React.RefObject<HTMLElement | null>;
}

interface GlowRegistryContextValue {
  /** Register an element as a glow target */
  register: (meta: GlowTargetMeta) => void;
  /** Unregister an element (on unmount) */
  unregister: (id: string) => void;
  /** Get the full registry map (for overlay positioning) */
  getTarget: (id: string) => GlowTargetMeta | undefined;
  /** Build a compressed manifest string for the LLM */
  getManifest: () => string;
  /** Currently active highlight directives */
  activeHighlights: GlowHighlight[];
  /** Set new highlight directives (from SSE stream) */
  setHighlights: (
    highlights: GlowHighlight[],
    workflowTitle?: string,
    totalSteps?: number,
  ) => void;
  /** Dismiss a single highlight (e.g. after user clicks it) */
  dismissHighlight: (targetId: string) => void;
  /** Dismiss all highlights */
  dismissAll: () => void;
  /** Current step in a sequential workflow */
  currentStep: number;
  /** Advance to the next step */
  advanceStep: () => void;
  /** Go back to previous step */
  rewindStep: () => void;
  /** Optional workflow title from the LLM tool call */
  workflowTitle: string | null;
  /** Explicit total steps (may exceed max step number in highlights) */
  totalStepsOverride: number | null;
}

// ============================================================
// Context
// ============================================================

const GlowRegistryContext = createContext<GlowRegistryContextValue | null>(
  null,
);

export function useGlowRegistry(): GlowRegistryContextValue {
  const ctx = useContext(GlowRegistryContext);
  if (!ctx) {
    throw new Error(
      "useGlowRegistry must be used within a GlowRegistryProvider",
    );
  }
  return ctx;
}

// ============================================================
// Provider
// ============================================================

export function GlowRegistryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Registry stored in a ref to avoid re-renders on register/unregister
  const registryRef = useRef<Map<string, GlowTargetMeta>>(new Map());

  // Active highlights ARE state - they drive the overlay UI
  const [activeHighlights, setActiveHighlightsState] = useState<
    GlowHighlight[]
  >([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowTitle, setWorkflowTitle] = useState<string | null>(null);
  const [totalStepsOverride, setTotalStepsOverride] = useState<number | null>(
    null,
  );

  const register = useCallback((meta: GlowTargetMeta) => {
    registryRef.current.set(meta.id, meta);
  }, []);

  const unregister = useCallback((id: string) => {
    registryRef.current.delete(id);
  }, []);

  const getTarget = useCallback((id: string) => {
    return registryRef.current.get(id);
  }, []);

  const getManifest = useCallback((): string => {
    const registry = registryRef.current;
    if (registry.size === 0) return "";

    // Group by category for compact output
    const groups = new Map<
      string,
      { label: string; id: string; context?: Record<string, string> }[]
    >();

    for (const [, meta] of registry) {
      const existing = groups.get(meta.category) ?? [];
      existing.push({ label: meta.label, id: meta.id, context: meta.context });
      groups.set(meta.category, existing);
    }

    const lines: string[] = [];
    for (const [category, items] of groups) {
      if (items.length <= 3) {
        // List individually for small groups
        for (const item of items) {
          const ctx = item.context
            ? ` (${Object.entries(item.context)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")})`
            : "";
          lines.push(`${category}: "${item.label}" [id: ${item.id}]${ctx}`);
        }
      } else {
        // Summarise large groups (e.g. 12x student cards)
        const names = items.map((i) => `${i.label} [${i.id}]`).join(", ");
        lines.push(`${items.length}x ${category}: ${names}`);
      }
    }

    return lines.join("\n");
  }, []);

  const setHighlights = useCallback(
    (highlights: GlowHighlight[], title?: string, steps?: number) => {
      setActiveHighlightsState(highlights);
      setWorkflowTitle(title ?? null);
      setTotalStepsOverride(steps ?? null);
      // Start at the lowest step number
      const stepNums = highlights.map((h) => h.step ?? 1);
      setCurrentStep(Math.min(...stepNums));
    },
    [],
  );

  const dismissHighlight = useCallback((targetId: string) => {
    setActiveHighlightsState((prev) =>
      prev.filter((h) => h.target_id !== targetId),
    );
  }, []);

  const dismissAll = useCallback(() => {
    setActiveHighlightsState([]);
    setCurrentStep(1);
    setWorkflowTitle(null);
    setTotalStepsOverride(null);
  }, []);

  const advanceStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const rewindStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const value: GlowRegistryContextValue = {
    register,
    unregister,
    getTarget,
    getManifest,
    activeHighlights,
    setHighlights,
    dismissHighlight,
    dismissAll,
    currentStep,
    advanceStep,
    rewindStep,
    workflowTitle,
    totalStepsOverride,
  };

  return (
    <GlowRegistryContext.Provider value={value}>
      {children}
    </GlowRegistryContext.Provider>
  );
}

// ============================================================
// GlowTarget - Wrapper Component
// ============================================================
// Wraps any element to register it as a glow target. Uses a
// minimal <div> wrapper with no visual impact.

interface GlowTargetProps {
  /** Unique identifier for this target */
  id: string;
  /** Element category: "button", "card", "input", "select", "row" */
  category: string;
  /** Human-readable label for the LLM */
  label: string;
  /** Arbitrary metadata the LLM can use */
  context?: Record<string, string>;
  children: React.ReactNode;
  /** Optional className for the wrapper div */
  className?: string;
  /** Optional inline styles for the wrapper div */
  style?: React.CSSProperties;
}

export function GlowTarget({
  id,
  category,
  label,
  context,
  children,
  className,
  style,
}: GlowTargetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { register, unregister } = useGlowRegistry();

  useEffect(() => {
    register({ id, category, label, context, ref });
    return () => unregister(id);
  }, [id, category, label, context, register, unregister]);

  return (
    <div ref={ref} data-glow-id={id} className={className} style={style}>
      {children}
    </div>
  );
}

// ============================================================
// useGlowTarget - Hook Alternative
// ============================================================
// For cases where adding a wrapper <div> would break layout
// (e.g. flex children, table cells). Returns a ref to attach
// to the element directly.

export function useGlowTargetRef(
  id: string,
  category: string,
  label: string,
  context?: Record<string, string>,
): React.RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);
  const { register, unregister } = useGlowRegistry();

  useEffect(() => {
    register({ id, category, label, context, ref });
    return () => unregister(id);
  }, [id, category, label, context, register, unregister]);

  return ref;
}
