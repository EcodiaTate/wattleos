// src/components/domain/curriculum-content/material-search-input.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Material Search Input
// ============================================================
// Client component with debounced input that pushes the search
// query to URL searchParams (?q=...). The server re-renders
// with results.
//
// WHY 'use client': Need keyboard event handling and debounce.
// ============================================================

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

interface MaterialSearchInputProps {
  initialQuery: string;
}

export function MaterialSearchInput({
  initialQuery,
}: MaterialSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pushSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        pushSearch(newValue);
      }, 400);
    },
    [pushSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        // Immediately execute on Enter
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        pushSearch(value);
      }
    },
    [pushSearch, value],
  );

  const clearSearch = useCallback(() => {
    setValue("");
    pushSearch("");
    inputRef.current?.focus();
  }, [pushSearch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        placeholder="Search materials (e.g., Pink Tower, Sandpaper Letters)..."
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-9 text-sm
                   placeholder:text-muted-foreground focus:outline-none focus:ring-2
                   focus:ring-ring focus:ring-offset-2"
      />

      {/* Clear / Loading indicator */}
      {(value || isPending) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isPending ? (
            <svg
              className="w-4 h-4 text-muted-foreground animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <button
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
