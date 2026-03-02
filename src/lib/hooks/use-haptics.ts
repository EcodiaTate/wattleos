// src/lib/hooks/use-haptics.ts
//
// ============================================================
// WattleOS - Haptics Hook
// ============================================================
// Wraps @capacitor/haptics for native tactile feedback.
// Fails silently on web / when bridge is unavailable so all
// call sites remain clean (no try/catch scattered everywhere).
//
// Usage:
//   const haptics = useHaptics();
//   haptics.impact();          // light tap (tab bar, buttons)
//   haptics.impact('medium');  // form submit, selection change
//   haptics.impact('heavy');   // destructive confirm
//   haptics.success();         // operation succeeded
//   haptics.error();           // operation failed
//   haptics.warning();         // caution state
//   haptics.selection();       // picker / toggle changed
// ============================================================

"use client";

import { useCallback } from "react";

type ImpactStyle = "Light" | "Medium" | "Heavy";
type NotificationType = "Success" | "Warning" | "Error";

async function doImpact(style: ImpactStyle) {
  try {
    const { Haptics, ImpactStyle: IS } = await import("@capacitor/haptics");
    await Haptics.impact({ style: IS[style] });
  } catch {
    // Web / bridge unavailable - silent fail
  }
}

async function doNotification(type: NotificationType) {
  try {
    const { Haptics, NotificationType: NT } =
      await import("@capacitor/haptics");
    await Haptics.notification({ type: NT[type] });
  } catch {
    // Silent fail
  }
}

async function doSelection() {
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch {
    // Silent fail
  }
}

export function useHaptics() {
  const impact = useCallback(
    (style: "light" | "medium" | "heavy" = "light") => {
      const map: Record<string, ImpactStyle> = {
        light: "Light",
        medium: "Medium",
        heavy: "Heavy",
      };
      void doImpact(map[style]);
    },
    [],
  );

  const success = useCallback(() => void doNotification("Success"), []);
  const error = useCallback(() => void doNotification("Error"), []);
  const warning = useCallback(() => void doNotification("Warning"), []);
  const selection = useCallback(() => void doSelection(), []);

  const light = useCallback(() => void doImpact("Light"), []);
  const medium = useCallback(() => void doImpact("Medium"), []);
  const heavy = useCallback(() => void doImpact("Heavy"), []);

  return { impact, success, error, warning, selection, light, medium, heavy };
}
