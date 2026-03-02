// src/components/domain/ask-wattle/ask-wattle-provider.tsx
//
// ============================================================
// WattleOS V2 - Ask Wattle App Shell Integration
// ============================================================
// Drop this into the tenant layout and Ask Wattle is available
// on every page. The floating button + slide-out panel pattern
// means zero layout changes to existing pages.
//
// WHY a provider (not just mounting the panel directly):
// 1. The panel can be opened from anywhere via the context
// 2. Other components can programmatically open Wattle with
//    a pre-filled question (e.g., a "Need help?" link on a
//    complex form that opens Wattle with relevant context)
// 3. The open/close state persists across page navigations
//
// New capabilities (v2.1):
// - Background tasks: if the panel is closed mid-stream the
//   task keeps running (the panel never unmounts). When it
//   completes, a notification toast appears and the FAB shows
//   a pulsing ring + spinner so the user knows.
// - Command palette (⌘K / Ctrl+K): floating centered input
//   for quick queries without opening the full panel.
// - Non-blocking panel: the backdrop overlay is gone. The
//   panel slides in on the right without blurring or dimming
//   the rest of the app.
//
// USAGE in layout.tsx:
//   import { AskWattleProvider } from "@/components/domain/ask-wattle/ask-wattle-provider";
//
//   <AskWattleProvider userRole={role}>
//     {children}
//   </AskWattleProvider>
// ============================================================

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AskWattlePanel, AskWattleTrigger } from "./ask-wattle-panel";
import { WattleCommandPalette } from "./wattle-command-palette";
import { GlowOverlay } from "@/components/domain/glow/glow-overlay";

// ============================================================
// Context
// ============================================================

interface AskWattleContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Open with a pre-filled question */
  openWith: (question: string) => void;
}

const AskWattleContext = createContext<AskWattleContextValue | null>(null);

export function useAskWattlePanel(): AskWattleContextValue {
  const context = useContext(AskWattleContext);
  if (!context) {
    throw new Error("useAskWattlePanel must be used within AskWattleProvider");
  }
  return context;
}

// ============================================================
// Notification Toast (inline - small enough not to need its own file)
// ============================================================

function WattleNotificationToast({
  message,
  onOpen,
  onDismiss,
}: {
  message: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <>
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-24 right-6 z-50 flex max-w-xs items-start gap-3 rounded-2xl px-4 py-3 shadow-xl"
        style={{
          background: "var(--wattle-cream)",
          border: "1px solid var(--wattle-border)",
          boxShadow: "var(--shadow-xl)",
          animation: "toastSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Wattle avatar dot */}
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
          style={{
            background:
              "linear-gradient(135deg, var(--wattle-gold-muted) 0%, var(--wattle-gold) 100%)",
            color: "var(--wattle-cream)",
          }}
        >
          ✓
        </span>

        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium"
            style={{ color: "var(--wattle-brown)" }}
          >
            Wattle finished
          </p>
          <p
            className="mt-0.5 text-sm leading-snug line-clamp-2"
            style={{ color: "var(--wattle-dark)" }}
          >
            {message}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            onClick={onDismiss}
            className="text-xs opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: "var(--wattle-brown)" }}
            aria-label="Dismiss"
          >
            ✕
          </button>
          <button
            onClick={onOpen}
            className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              background:
                "color-mix(in srgb, var(--wattle-gold) 12%, transparent)",
              color: "var(--wattle-brown)",
              border: "1px solid var(--wattle-border)",
            }}
          >
            View
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Provider
// ============================================================

interface AskWattleProviderProps {
  children: React.ReactNode;
  userRole?: "guide" | "parent" | "admin" | "staff";
  userName?: string;
  permissions?: string[];
  tenantName?: string;
}

export function AskWattleProvider({
  children,
  userRole,
  userName,
  permissions,
  tenantName,
}: AskWattleProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  // Background task state
  const [isBackgroundRunning, setIsBackgroundRunning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Refs for detecting "closed while task was running" scenario
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  const wasLoadingWhileClosed = useRef(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const openWith = useCallback((question: string) => {
    setPendingQuestion(question);
    setIsOpen(true);
  }, []);

  const handlePendingQuestionConsumed = useCallback(() => {
    setPendingQuestion(null);
  }, []);

  // Called by the panel when isLoading changes
  const handleLoadingChange = useCallback(
    (loading: boolean, lastMessagePreview?: string) => {
      if (loading) {
        if (!isOpenRef.current) {
          wasLoadingWhileClosed.current = true;
        }
        setIsBackgroundRunning(!isOpenRef.current);
      } else {
        setIsBackgroundRunning(false);
        if (wasLoadingWhileClosed.current && lastMessagePreview?.trim()) {
          setNotification(lastMessagePreview.trim());
        }
        wasLoadingWhileClosed.current = false;
      }
    },
    [],
  );

  // When the panel opens, clear any pending background indicator
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsBackgroundRunning(false);
    wasLoadingWhileClosed.current = false;
  }, []);

  // ⌘K / Ctrl+K global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen]);

  return (
    <AskWattleContext.Provider
      value={{ isOpen, open: handleOpen, close, toggle, openWith }}
    >
      {children}
      <GlowOverlay />

      <AskWattleTrigger
        onClick={toggle}
        isBackgroundRunning={isBackgroundRunning}
      />

      <AskWattlePanel
        isOpen={isOpen}
        onClose={close}
        onLoadingChange={handleLoadingChange}
        userRole={userRole}
        userName={userName}
        permissions={permissions}
        tenantName={tenantName}
        pendingQuestion={pendingQuestion}
        onPendingQuestionConsumed={handlePendingQuestionConsumed}
      />

      {notification && (
        <WattleNotificationToast
          message={notification}
          onOpen={() => {
            handleOpen();
            setNotification(null);
          }}
          onDismiss={() => setNotification(null)}
        />
      )}

      {isCommandPaletteOpen && (
        <WattleCommandPalette
          onClose={() => setIsCommandPaletteOpen(false)}
          onSubmit={(query) => {
            setIsCommandPaletteOpen(false);
            openWith(query);
          }}
        />
      )}
    </AskWattleContext.Provider>
  );
}

// ============================================================
// Convenience: Inline Help Link
// ============================================================
// Use this inside any form or page to add a contextual help
// trigger that opens Wattle with a relevant question.
//
// <AskWattleHelpLink question="How do I mark a student as late?">
//   Need help with late arrivals?
// </AskWattleHelpLink>

interface AskWattleHelpLinkProps {
  question: string;
  children: React.ReactNode;
  className?: string;
}

export function AskWattleHelpLink({
  question,
  children,
  className,
}: AskWattleHelpLinkProps) {
  const { openWith } = useAskWattlePanel();

  return (
    <button
      onClick={() => openWith(question)}
      className={`inline-flex items-center gap-1 text-sm underline decoration-dashed underline-offset-2 transition-colors ${className ?? ""}`}
      style={{ color: "var(--wattle-brown)" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {children}
    </button>
  );
}
