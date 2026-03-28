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

function isTextInput(
  el: Element | null,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    return (
      t === "text" ||
      t === "email" ||
      t === "password" ||
      t === "search" ||
      t === "tel" ||
      t === "url" ||
      t === "number" ||
      t === "date" ||
      t === "datetime-local" ||
      t === "time"
    );
  }
  if (el.getAttribute("contenteditable") === "true") return true;
  return false;
}

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
  let keyboardVisible = false;

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });

    // iOS: Show the accessory bar (Done/Previous/Next buttons)
    if (getPlatform() === "ios") {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    }

    // Let native scroll assist, but we also manually scroll below
    await Keyboard.setScroll({ isDisabled: false });

    // keyboardWillShow — instant callback for CSS/height updates
    if (options?.onShow) {
      const showHandle = await Keyboard.addListener(
        "keyboardWillShow",
        (info) => {
          options.onShow?.(info.keyboardHeight);
        },
      );
      cleanups.push(showHandle);
    }

    // keyboardDidShow — scroll focused input into view AFTER body resize completes
    const didShowHandle = await Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisible = true;
      setTimeout(() => {
        const el = document.activeElement;
        if (isTextInput(el)) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 250);
    });
    cleanups.push(didShowHandle);

    if (options?.onHide) {
      const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
        options.onHide?.();
      });
      cleanups.push(hideHandle);
    }

    const didHideHandle = await Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisible = false;
    });
    cleanups.push(didHideHandle);

    // Handle focus changes while keyboard is already open
    const onFocusIn = (e: FocusEvent) => {
      if (!keyboardVisible) return;
      if (!isTextInput(e.target as Element)) return;
      setTimeout(() => {
        (e.target as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    };

    document.addEventListener("focusin", onFocusIn, { passive: true });

    return () => {
      cleanups.forEach((h) => h.remove());
      document.removeEventListener("focusin", onFocusIn);
    };
  } catch {
    return () => {
      cleanups.forEach((h) => h.remove());
    };
  }
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
