"use client";

import { useState, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { CARE_ENTRY_TYPE_CONFIG } from "@/lib/constants/daily-care";
import type { CareEntryType, NappyType } from "@/types/domain";
import { NappyEntryForm } from "./nappy-entry-form";
import { MealEntryForm } from "./meal-entry-form";
import { BottleEntryForm } from "./bottle-entry-form";
import { SleepEntryForm } from "./sleep-entry-form";
import { SunscreenEntryForm } from "./sunscreen-entry-form";
import { WellbeingEntryForm } from "./wellbeing-entry-form";

// ── Types ──────────────────────────────────────────────────────

interface QuickEntryPanelProps {
  studentId: string;
  logDate: string;
  onEntryAdded: () => void;
}

/**
 * Internal form selector type. Extends CareEntryType with
 * "nappy_wet" and "nappy_soiled" so that the quick-action grid
 * can open the nappy form pre-filled with the correct subtype,
 * saving the educator one tap.
 */
type ActiveFormType = CareEntryType | "nappy_wet" | "nappy_soiled";

// ── Quick Action Button Definitions ────────────────────────────

interface QuickAction {
  id: ActiveFormType;
  emoji: string;
  label: string;
  cssVarBg: string;
  cssVarFg: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "nappy_wet",
    emoji: CARE_ENTRY_TYPE_CONFIG.nappy_change.emoji,
    label: "Nappy Wet",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.nappy_change.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.nappy_change.cssVarFg,
  },
  {
    id: "nappy_soiled",
    emoji: CARE_ENTRY_TYPE_CONFIG.nappy_change.emoji,
    label: "Nappy Soiled",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.nappy_change.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.nappy_change.cssVarFg,
  },
  {
    id: "meal",
    emoji: CARE_ENTRY_TYPE_CONFIG.meal.emoji,
    label: "Meal",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.meal.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.meal.cssVarFg,
  },
  {
    id: "bottle",
    emoji: CARE_ENTRY_TYPE_CONFIG.bottle.emoji,
    label: "Bottle",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.bottle.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.bottle.cssVarFg,
  },
  {
    id: "sleep_start",
    emoji: CARE_ENTRY_TYPE_CONFIG.sleep_start.emoji,
    label: "Sleep",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.sleep_start.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.sleep_start.cssVarFg,
  },
  {
    id: "sunscreen",
    emoji: CARE_ENTRY_TYPE_CONFIG.sunscreen.emoji,
    label: "Sunscreen",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.sunscreen.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.sunscreen.cssVarFg,
  },
  {
    id: "wellbeing_note",
    emoji: CARE_ENTRY_TYPE_CONFIG.wellbeing_note.emoji,
    label: "Wellbeing",
    cssVarBg: CARE_ENTRY_TYPE_CONFIG.wellbeing_note.cssVarBg,
    cssVarFg: CARE_ENTRY_TYPE_CONFIG.wellbeing_note.cssVarFg,
  },
];

// ── Component ──────────────────────────────────────────────────

export function QuickEntryPanel({
  studentId,
  logDate,
  onEntryAdded,
}: QuickEntryPanelProps) {
  const haptics = useHaptics();
  const [activeForm, setActiveForm] = useState<ActiveFormType | null>(null);

  const handleActionTap = useCallback(
    (actionId: ActiveFormType) => {
      haptics.impact("light");
      // Toggle: tapping the same button again closes the form
      setActiveForm((prev) => (prev === actionId ? null : actionId));
    },
    [haptics],
  );

  const handleFormSuccess = useCallback(() => {
    setActiveForm(null);
    onEntryAdded();
  }, [onEntryAdded]);

  const handleFormCancel = useCallback(() => {
    setActiveForm(null);
  }, []);

  /**
   * Resolves the initial nappy type from the active form type.
   * "nappy_wet" pre-selects "wet", "nappy_soiled" pre-selects "soiled".
   */
  function getInitialNappyType(): NappyType | null {
    if (activeForm === "nappy_wet") return "wet";
    if (activeForm === "nappy_soiled") return "soiled";
    return null;
  }

  /**
   * Determines which inline form to render based on the active
   * form type. Each form receives the same studentId, logDate,
   * onSuccess, and onCancel callbacks. Forms are rendered inline
   * below the grid (not in a modal) to avoid keyboard issues on
   * mobile devices.
   */
  function renderActiveForm(): React.ReactNode {
    if (activeForm === null) return null;

    const commonProps = {
      studentId,
      logDate,
      onSuccess: handleFormSuccess,
      onCancel: handleFormCancel,
    };

    switch (activeForm) {
      case "nappy_wet":
      case "nappy_soiled":
        return (
          <NappyEntryForm
            {...commonProps}
            initialNappyType={getInitialNappyType()}
          />
        );

      case "meal":
        return <MealEntryForm {...commonProps} />;

      case "bottle":
        return <BottleEntryForm {...commonProps} />;

      case "sleep_start":
        return <SleepEntryForm {...commonProps} mode="start" />;

      case "sleep_end":
        return <SleepEntryForm {...commonProps} mode="end" />;

      case "sunscreen":
        return <SunscreenEntryForm {...commonProps} />;

      case "wellbeing_note":
        return <WellbeingEntryForm {...commonProps} />;

      default:
        return null;
    }
  }

  /**
   * Derives a human-readable form title from the active form type,
   * used as the heading above the inline form area.
   */
  function getFormTitle(): string {
    switch (activeForm) {
      case "nappy_wet":
        return "Record Nappy Change (Wet)";
      case "nappy_soiled":
        return "Record Nappy Change (Soiled)";
      case "meal":
        return "Record Meal";
      case "bottle":
        return "Record Bottle";
      case "sleep_start":
        return "Record Sleep";
      case "sunscreen":
        return "Record Sunscreen";
      case "wellbeing_note":
        return "Record Wellbeing Note";
      default:
        return "";
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Quick Actions Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const isActive = activeForm === action.id;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionTap(action.id)}
              className="active-push touch-target flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border px-3 py-3 transition-all"
              style={{
                background: isActive ? action.cssVarBg : action.cssVarBg,
                borderColor: isActive
                  ? action.cssVarFg
                  : "var(--border)",
                opacity: activeForm !== null && !isActive ? 0.6 : 1,
              }}
            >
              <span
                className="text-[32px] leading-none"
                role="img"
                aria-hidden="true"
              >
                {action.emoji}
              </span>
              <span
                className="text-xs font-semibold leading-tight"
                style={{ color: action.cssVarFg }}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active Form Area ────────────────────────────────── */}
      {activeForm !== null && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          {/* Form heading */}
          <h3
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {getFormTitle()}
          </h3>

          {/* Inline form */}
          {renderActiveForm()}
        </div>
      )}
    </div>
  );
}
