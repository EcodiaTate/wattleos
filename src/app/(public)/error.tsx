// src/app/(public)/error.tsx
//
// Error boundary for public-facing pages (enrollment, inquiry,
// tours, invitations). These have no sidebar — full-width layout.
// WHY separate: Public pages have different recovery actions
// (no "go to dashboard" — the user isn't logged in).

"use client";

import { useEffect } from "react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
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
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          We had trouble loading this page. Please try again. If the problem
          persists, contact the school directly.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground/60">
            Ref: {error.digest}
          </p>
        )}

        <div className="mt-6">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
