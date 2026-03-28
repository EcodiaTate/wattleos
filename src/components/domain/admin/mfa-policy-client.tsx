"use client";

// ============================================================
// WattleOS V2 - MFA Policy Client Component
// ============================================================
// Admin UI for configuring which roles require MFA.
// ============================================================

import { useState, useTransition } from "react";
import { updateMfaPolicy } from "@/lib/actions/mfa";

type Props = {
  currentRoles: string[];
  availableRoles: string[];
};

export function MfaPolicyClient({ currentRoles, availableRoles }: Props) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(currentRoles),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function toggleRole(role: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
    setSaved(false);
  }

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const result = await updateMfaPolicy(Array.from(selectedRoles));
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)]">
        <h2 className="text-base font-semibold text-foreground">
          Require MFA for roles
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Users with these roles will be required to set up two-factor
          authentication. They will be prompted during login if they have not
          enrolled.
        </p>

        <div className="mt-4 space-y-2">
          {availableRoles.map((role) => (
            <label
              key={role}
              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedRoles.has(role)}
                onChange={() => toggleRole(role)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <span className="text-sm text-foreground">{role}</span>
              {role === "Parent" && (
                <span className="text-xs text-muted-foreground">
                  (not recommended)
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save policy"}
          </button>

          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Policy saved.
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How MFA enforcement works</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            When a user with a required role signs in, they are redirected to
            the MFA enrollment page if they have not set up an authenticator.
          </li>
          <li>
            Users who already have MFA enrolled are prompted for their code on
            every login.
          </li>
          <li>
            Users can manage their authenticator and backup codes from{" "}
            <strong>Settings &gt; Security</strong>.
          </li>
          <li>
            Backup codes are provided during enrollment for account recovery if
            the authenticator is lost.
          </li>
        </ul>
      </div>
    </div>
  );
}
