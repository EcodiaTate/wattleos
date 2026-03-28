"use client";

// ============================================================
// WattleOS V2 - Ask Wattle AI Sensitive Data Settings Client
// ============================================================
// Tenant-level toggle for ai_sensitive_data_enabled.
// Only Owner/Administrator can change this (MANAGE_TENANT_SETTINGS).
// Toggling ON requires a confirmation dialog.
// ============================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTenantAiSettings } from "@/lib/actions/tenant-settings";

type Props = {
  initialEnabled: boolean;
};

export function AskWattleSettingsClient({ initialEnabled }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleToggleRequest(next: boolean) {
    if (next) {
      // Turning ON — require confirmation
      setShowConfirm(true);
    } else {
      // Turning OFF — no confirmation needed
      applyToggle(false);
    }
  }

  function applyToggle(next: boolean) {
    setErrorMessage(null);
    setSavedMessage(null);
    startTransition(async () => {
      const result = await updateTenantAiSettings({
        ai_sensitive_data_enabled: next,
      });
      if (result.error) {
        setErrorMessage(result.error.message);
      } else {
        setEnabled(next);
        setSavedMessage(next ? "Sensitive data access enabled." : "Sensitive data access disabled.");
        router.refresh();
      }
    });
  }

  function confirmEnable() {
    setShowConfirm(false);
    applyToggle(true);
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)] space-y-4">
        {/* Description */}
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Ask Wattle AI — Sensitive Data Access
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            By default, Ask Wattle cannot access medical records, emergency
            contacts, custody restrictions, wellbeing data, or individual
            learning plans. Enabling this feature allows staff with the
            appropriate permissions to query this data through the AI assistant.
          </p>
        </div>

        {/* Warning box */}
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="flex gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
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
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold">Important</p>
              <p className="mt-1">
                When enabled, sensitive student data including medical
                conditions, custody restrictions, and wellbeing records will be
                processed by the AI model. Ensure your school&apos;s privacy
                policy reflects this. This feature is not covered by ST4S
                assessment.
              </p>
            </div>
          </div>
        </div>

        {/* Toggle row */}
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Allow sensitive data queries
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? "Staff with appropriate permissions can query sensitive student data via Ask Wattle."
                : "Ask Wattle cannot access sensitive student data (default)."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={isPending}
            onClick={() => handleToggleRequest(!enabled)}
            className={[
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              enabled ? "bg-primary" : "bg-input",
            ].join(" ")}
          >
            <span
              className={[
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                enabled ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>

        {/* Status messages */}
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {savedMessage && !errorMessage && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {savedMessage}
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-base font-semibold text-foreground">
              Enable sensitive data access?
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              This will allow Ask Wattle to access sensitive student information
              including medical records and custody restrictions for staff who
              have the relevant permissions. Your school is responsible for
              ensuring appropriate privacy disclosures are in place.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEnable}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Yes, enable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
