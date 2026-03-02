"use client";

import type { RevertState } from "@/lib/hooks/use-ask-wattle";

interface RevertButtonProps {
  label: string;
  state: RevertState;
  onRevert: () => void;
}

export function RevertButton({ label, state, onRevert }: RevertButtonProps) {
  switch (state) {
    case "idle":
      return (
        <button
          onClick={onRevert}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-black/5"
          style={{ color: "var(--wattle-brown)", border: "1px solid var(--wattle-border)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          {label}
        </button>
      );

    case "reverting":
      return (
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
          style={{ color: "var(--wattle-tan)" }}
        >
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ border: "2px solid var(--wattle-gold)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }}
          />
          Undoing...
        </span>
      );

    case "reverted":
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
          style={{ color: "var(--success)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Reverted
        </span>
      );

    case "failed":
      return (
        <button
          onClick={onRevert}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-destructive/10"
          style={{ color: "var(--destructive)", border: "1px solid var(--destructive)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Retry undo
        </button>
      );
  }
}
