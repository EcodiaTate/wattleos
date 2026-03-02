// src/lib/native/haptics.ts
//
// ============================================================
// WattleOS - Haptics Bridge
// ============================================================
// WHY: Tactile feedback makes rapid workflows feel responsive.
// Attendance check-in, mastery status updates, and observation
// save all benefit from a subtle vibration that confirms the
// action registered - especially important on iPad where guides
// tap dozens of times per session.
// ============================================================

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative, isPluginAvailable } from "./platform";

/**
 * Light tap - for routine actions like selecting a student tag,
 * toggling a checkbox, or navigating between tabs.
 */
export async function tapLight(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Silently fail - haptics are enhancement, not critical
  }
}

/**
 * Medium tap - for meaningful actions like marking attendance,
 * saving an observation draft, or updating a mastery status.
 */
export async function tapMedium(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Silent
  }
}

/**
 * Heavy tap - for significant actions like publishing an
 * observation, confirming a pickup, or completing enrollment.
 */
export async function tapHeavy(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    // Silent
  }
}

/**
 * Success notification - for completed actions like
 * "Attendance saved", "Report generated", "Student enrolled".
 */
export async function notifySuccess(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Silent
  }
}

/**
 * Warning notification - for consent warnings, missing fields,
 * or unexplained absence alerts.
 */
export async function notifyWarning(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // Silent
  }
}

/**
 * Error notification - for save failures, permission denials,
 * or network errors during upload.
 */
export async function notifyError(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    // Silent
  }
}

/**
 * Selection changed - for picker wheels, drag-and-drop reorder,
 * or curriculum tree node selection.
 */
export async function selectionChanged(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.selectionChanged();
  } catch {
    // Silent
  }
}

/**
 * Start selection feedback loop - call before a series of
 * selection changes (e.g. scrolling through a picker).
 */
export async function selectionStart(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.selectionStart();
  } catch {
    // Silent
  }
}

/**
 * End selection feedback loop.
 */
export async function selectionEnd(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Haptics")) return;
  try {
    await Haptics.selectionEnd();
  } catch {
    // Silent
  }
}
