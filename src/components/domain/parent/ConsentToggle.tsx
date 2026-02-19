// src/components/domain/parent/ConsentToggle.tsx
//
// ============================================================
// WattleOS V2 - Consent Toggle (Client Component)
// ============================================================
// Toggle switch for consent preferences. Calls the server
// action on change with immediate visual feedback.
// ============================================================

"use client";

import { updateConsent } from "@/lib/actions/parent";
import { useState, useTransition } from "react";

interface ConsentToggleProps {
  guardianId: string;
  consentType: "media" | "directory";
  label: string;
  description: string;
  initialValue: boolean;
}

export function ConsentToggle({
  guardianId,
  consentType,
  label,
  description,
  initialValue,
}: ConsentToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const newValue = !isEnabled;
    setIsEnabled(newValue); // Optimistic
    setError(null);

    startTransition(async () => {
      const input =
        consentType === "media"
          ? { guardianId, mediaConsent: newValue }
          : { guardianId, directoryConsent: newValue };

      const result = await updateConsent(input);

      if (result.error) {
        setIsEnabled(!newValue); // Revert
        setError(result.error.message);
      }
    });
  }

  return (
    <div className="flex items-start gap-3">
      {/* Toggle switch */}
      <button
        role="switch"
        aria-checked={isEnabled}
        onClick={handleToggle}
        disabled={isPending}
        className={`relative mt-0.5 flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          isEnabled ? "bg-primary" : "bg-gray-200"
        } ${isPending ? "opacity-60" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform ${
            isEnabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
