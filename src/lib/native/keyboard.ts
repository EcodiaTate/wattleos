// src/lib/native/keyboard.ts
//
// ============================================================
// WattleOS - Keyboard Bridge
// ============================================================
// WHY: On iPad, the keyboard covers observation text areas and
// form fields. Native keyboard events let us scroll inputs into
// view, adjust layout height, and provide a dismiss button for
// the iPad floating keyboard.
// ============================================================

import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { isNative, isPluginAvailable, getPlatform } from "./platform";

/**
 * Initialize keyboard behavior for the app.
 * Call once in the root layout.
 *
 * @param onShow - Called when keyboard appears (with height in px)
 * @param onHide - Called when keyboard dismisses
 */
export async function initKeyboard(options?: {
  onShow?: (keyboardHeight: number) => void;
  onHide?: () => void;
}): Promise<() => void> {
  if (!isNative() || !isPluginAvailable("Keyboard")) {
    return () => {};
  }

  const cleanups: Array<{ remove: () => Promise<void> }> = [];

  try {
    // Configure keyboard behavior
    // WHY body resize: Ensures the entire viewport shrinks when keyboard
    // appears, keeping forms and text areas visible without manual scroll
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });

    // iOS: Show the accessory bar (Done/Previous/Next buttons)
    // WHY: iPad users need the Done button to dismiss the keyboard
    if (getPlatform() === "ios") {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    }

    // Scroll to active input when keyboard shows
    await Keyboard.setScroll({ isDisabled: false });

    // Listen for keyboard events
    if (options?.onShow) {
      const showHandle = await Keyboard.addListener(
        "keyboardWillShow",
        (info) => {
          options.onShow?.(info.keyboardHeight);
        },
      );
      cleanups.push(showHandle);
    }

    if (options?.onHide) {
      const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
        options.onHide?.();
      });
      cleanups.push(hideHandle);
    }
  } catch {
    // Silent - keyboard plugin may not be fully available
  }

  return () => {
    cleanups.forEach((h) => h.remove());
  };
}

/**
 * Programmatically hide the keyboard.
 * Useful when submitting a form or tapping a "Done" action.
 */
export async function hideKeyboard(): Promise<void> {
  if (!isNative() || !isPluginAvailable("Keyboard")) return;

  try {
    await Keyboard.hide();
  } catch {
    // Fallback: blur the active element
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}
