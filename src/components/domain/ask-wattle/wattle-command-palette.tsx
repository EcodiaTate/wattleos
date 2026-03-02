// src/components/domain/ask-wattle/wattle-command-palette.tsx
//
// ============================================================
// WattleOS - Wattle Command Palette
// ============================================================
// A ⌘K-triggered floating input that lets you query Wattle
// without opening the full panel. Designed to be fast and
// keyboard-native.
//
// UX principles:
// - No backdrop blur on the main content - you can still see
//   what page you're on while typing your query.
// - Light scrim behind the palette keeps it readable without
//   obscuring the app.
// - Recent queries are stored in localStorage so you can
//   quickly repeat common questions.
// - Pressing Enter submits; Esc closes.
// ============================================================

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "wattle-recent-queries";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const existing = loadRecent().filter((q) => q !== query);
  const updated = [query, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

interface WattleCommandPaletteProps {
  onClose: () => void;
  onSubmit: (query: string) => void;
}

export function WattleCommandPalette({
  onClose,
  onSubmit,
}: WattleCommandPaletteProps) {
  const [value, setValue] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent queries on mount and focus input
  useEffect(() => {
    setRecent(loadRecent());
    // Small delay so the animation plays before focus
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      saveRecent(trimmed);
      onSubmit(trimmed);
    },
    [onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = selectedIndex >= 0 ? recent[selectedIndex] : value;
        if (target?.trim()) handleSubmit(target);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, recent.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
        return;
      }
    },
    [onClose, value, selectedIndex, recent, handleSubmit],
  );

  const showRecent = recent.length > 0 && !value.trim();

  return (
    <>
      <style>{`
        @keyframes paletteFadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Light scrim - click to close, no blur */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: "color-mix(in srgb, var(--wattle-dark) 18%, transparent)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-label="Ask Wattle"
        aria-modal="true"
        className="fixed left-1/2 top-[22%] z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl shadow-2xl"
        style={{
          background: "var(--wattle-cream)",
          border: "1px solid var(--wattle-border)",
          animation: "paletteFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "var(--shadow-2xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{
            borderBottom: showRecent
              ? "1px solid var(--wattle-border)"
              : undefined,
          }}
        >
          {/* Wattle leaf icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--wattle-gold)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="10" r="1" fill="var(--wattle-gold)" />
            <circle cx="8" cy="10" r="1" fill="var(--wattle-gold)" />
            <circle cx="16" cy="10" r="1" fill="var(--wattle-gold)" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Wattle anything…"
            className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
            style={{ color: "var(--wattle-dark)" }}
            aria-label="Ask Wattle"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Keyboard hints */}
          <div className="flex items-center gap-1.5 shrink-0">
            {value.trim() ? (
              <kbd
                className="flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  background:
                    "color-mix(in srgb, var(--wattle-gold) 12%, transparent)",
                  color: "var(--wattle-brown)",
                  border: "1px solid var(--wattle-border)",
                }}
              >
                ↵ Ask
              </kbd>
            ) : (
              <kbd
                className="flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  background:
                    "color-mix(in srgb, var(--wattle-dark) 6%, transparent)",
                  color: "var(--wattle-tan)",
                  border:
                    "1px solid color-mix(in srgb, var(--wattle-dark) 8%, transparent)",
                }}
              >
                Esc
              </kbd>
            )}
          </div>
        </div>

        {/* Recent queries */}
        {showRecent && (
          <div className="pb-2 pt-1">
            <p
              className="px-4 pb-1 pt-1 text-xs font-medium uppercase tracking-wide opacity-50"
              style={{ color: "var(--wattle-brown)" }}
            >
              Recent
            </p>
            {recent.map((q, i) => (
              <button
                key={q}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                style={{
                  background:
                    selectedIndex === i
                      ? "color-mix(in srgb, var(--wattle-gold) 8%, transparent)"
                      : undefined,
                  color: "var(--wattle-dark)",
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                onMouseLeave={() => setSelectedIndex(-1)}
                onClick={() => handleSubmit(q)}
              >
                {/* Clock icon */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="shrink-0 opacity-40"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="truncate opacity-70">{q}</span>
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs"
          style={{
            borderTop: "1px solid var(--wattle-border)",
            color: "var(--wattle-tan)",
          }}
        >
          <span className="opacity-60">
            Opens Wattle panel with your question
          </span>
          <div className="flex items-center gap-2 opacity-60">
            <span>↑↓ navigate</span>
            <span>·</span>
            <span>⌘K toggle</span>
          </div>
        </div>
      </div>
    </>
  );
}
