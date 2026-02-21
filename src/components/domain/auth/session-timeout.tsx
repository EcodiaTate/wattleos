// src/components/domain/auth/session-timeout.tsx
//
// ============================================================
// WattleOS V2 - Session Idle Timeout
// ============================================================
// WHY: Montessori guides use shared iPads in classrooms. If a
// guide walks away mid-observation, the next person who picks
// up the iPad should NOT have access to student medical records,
// custody restrictions, or another guide's session.
//
// BEHAVIOR:
//   1. Tracks mouse, keyboard, touch, and scroll events
//   2. After IDLE_TIMEOUT_MS of inactivity, shows a warning modal
//   3. After WARNING_DURATION_MS more, auto-logs out
//   4. User can click "Stay Signed In" to reset the timer
//   5. Timer pauses when the tab is hidden (user switched apps)
//
// CONFIGURABLE: The timeout durations can be overridden via
// tenant settings in the future. Current defaults:
//   - 15 minutes idle → warning
//   - 60 seconds after warning → logout
//
// PLACEMENT: Add <SessionTimeout /> in the (app) layout, inside
// the authenticated section. It renders nothing until the
// warning modal appears.
//
// WHY client component: Requires DOM event listeners and timers.
// ============================================================

"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// Configuration
// ============================================================

/** Time of inactivity before showing the warning (ms) */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Time after warning before auto-logout (ms) */
const WARNING_DURATION_MS = 60 * 1000; // 60 seconds

/** Events that count as "user activity" */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

/** How often to check the idle timer (ms) — not too frequent to save CPU */
const CHECK_INTERVAL_MS = 10_000; // 10 seconds

// ============================================================
// Component
// ============================================================

interface SessionTimeoutProps {
  /** Override idle timeout in minutes (for tenant-level config) */
  idleMinutes?: number;
  /** Override warning duration in seconds */
  warningSeconds?: number;
}

export function SessionTimeout({
  idleMinutes,
  warningSeconds,
}: SessionTimeoutProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Track the last activity timestamp
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOutRef = useRef(false);

  const idleMs = idleMinutes ? idleMinutes * 60 * 1000 : IDLE_TIMEOUT_MS;
  const warningMs = warningSeconds
    ? warningSeconds * 1000
    : WARNING_DURATION_MS;

  // ── Logout handler ─────────────────────────────────────
  const handleLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // Even if signOut fails, redirect to login
    }

    router.push("/login?reason=idle");
  }, [router]);

  // ── Reset activity timer ───────────────────────────────
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If warning is showing, dismiss it
    if (showWarning) {
      setShowWarning(false);
      setCountdown(0);

      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    }
  }, [showWarning]);

  // ── Start warning countdown ────────────────────────────
  const startWarningCountdown = useCallback(() => {
    if (showWarning) return; // Already showing

    setShowWarning(true);
    setCountdown(Math.ceil(warningMs / 1000));

    warningTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time's up — log out
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [showWarning, warningMs, handleLogout]);

  // ── Activity event listeners ───────────────────────────
  useEffect(() => {
    const handler = () => {
      lastActivityRef.current = Date.now();
    };

    // Attach listeners — use passive for performance on touch devices
    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handler, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handler);
      });
    };
  }, []);

  // ── Periodic idle check ────────────────────────────────
  useEffect(() => {
    checkTimerRef.current = setInterval(() => {
      // Don't check if tab is hidden (user is in another app)
      if (document.hidden) return;
      // Don't check if already showing warning
      if (showWarning) return;

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= idleMs) {
        startWarningCountdown();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
      }
    };
  }, [idleMs, showWarning, startWarningCountdown]);

  // ── Cleanup warning timer on unmount ───────────────────
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) {
        clearInterval(warningTimerRef.current);
      }
    };
  }, []);

  // ── Cross-tab logout detection ─────────────────────────
  // WHY: If another tab logs out, this tab should too.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "wattleos_logout") {
        handleLogout();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [handleLogout]);

  // ── Render nothing until warning ───────────────────────
  if (!showWarning) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
    >
      <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-7 w-7 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2
          id="session-timeout-title"
          className="text-center text-lg font-semibold text-foreground"
        >
          Session Expiring
        </h2>

        {/* Description */}
        <p
          id="session-timeout-desc"
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          You've been inactive for a while. For the safety of student data,
          you'll be signed out in{" "}
          <span className="font-bold tabular-nums text-foreground">
            {countdown}
          </span>{" "}
          {countdown === 1 ? "second" : "seconds"}.
        </p>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Sign Out
          </button>
          <button
            onClick={resetActivity}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-600"
            autoFocus
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
