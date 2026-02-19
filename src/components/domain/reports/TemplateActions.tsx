// src/components/domain/reports/TemplateActions.tsx
//
// ============================================================
// WattleOS V2 - Template Card Actions (Client Component)
// ============================================================
// Dropdown menu for template management: duplicate, toggle
// active status, delete. Uses a simple popover pattern
// consistent with other WattleOS action menus.
//
// WHY client: User clicks trigger server actions with
// optimistic feedback and router refresh.
// ============================================================

"use client";

import {
  deleteReportTemplate,
  duplicateReportTemplate,
  updateReportTemplate,
} from "@/lib/actions/reports";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

interface TemplateActionsProps {
  templateId: string;
  isActive: boolean;
}

export function TemplateActions({
  templateId,
  isActive,
}: TemplateActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  async function handleDuplicate() {
    setError(null);
    setIsOpen(false);
    const result = await duplicateReportTemplate(templateId);
    if (result.error) {
      setError(result.error.message);
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function handleToggleActive() {
    setError(null);
    setIsOpen(false);
    const result = await updateReportTemplate(templateId, {
      isActive: !isActive,
    });
    if (result.error) {
      setError(result.error.message);
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function handleDelete() {
    setError(null);
    const confirmed = window.confirm(
      "Are you sure you want to delete this template? This cannot be undone.",
    );
    if (!confirmed) return;

    setIsOpen(false);
    const result = await deleteReportTemplate(templateId);
    if (result.error) {
      setError(result.error.message);
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground disabled:opacity-50"
        aria-label="Template actions"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md borderborder-border bg-background py-1 shadow-lg">
          <button
            onClick={handleDuplicate}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-background"
          >
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
              />
            </svg>
            Duplicate
          </button>
          <button
            onClick={handleToggleActive}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-background"
          >
            {isActive ? (
              <>
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
                Deactivate
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                Activate
              </>
            )}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={handleDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
            Delete
          </button>
        </div>
      )}

      {error && (
        <div className="absolute right-0 z-10 mt-1 w-64 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="mt-1 block text-xs font-medium text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
