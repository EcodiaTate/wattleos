// src/components/domain/sis/StudentSearchBar.tsx

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface StudentSearchBarProps {
  defaultValue: string;
}

export function StudentSearchBar({ defaultValue }: StudentSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search: updates URL after 300ms of no typing
  const handleSearch = useCallback(
    (term: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (term.trim()) {
          params.set("search", term.trim());
        } else {
          params.delete("search");
        }
        // Reset to page 1 on new search
        params.delete("page");
        const qs = params.toString();
        router.push(`/students${qs ? `?${qs}` : ""}`);
      }, 300);
    },
    [router, searchParams],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex-1 sm:max-w-xs">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-4 w-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Search students..."
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          handleSearch(e.target.value);
        }}
        className="block w-full rounded-md border border-input bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-[var(--shadow-xs)] focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
