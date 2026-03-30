"use client";

// ============================================================
// WattleOS V2 - MFA Policy Settings Component
// ============================================================
// Admin-only component for configuring which roles require MFA.
// Only visible to users with manage_mfa_policy permission.
// ============================================================

import { useState } from "react";
import { updateMfaPolicy } from "@/lib/actions/mfa";

const AVAILABLE_ROLES = [
  "Owner",
  "Administrator",
  "Head of School",
  "Lead Guide",
  "Guide",
  "Assistant",
] as const;

export function MfaPolicySettings({
  currentRoles,
}: {
  currentRoles: string[];
}) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoles);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const result = await updateMfaPolicy(selectedRoles);
    setSaving(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "MFA policy updated." });
    }
  }

  const hasChanges =
    JSON.stringify([...selectedRoles].sort()) !==
    JSON.stringify([...currentRoles].sort());

  return (
    <div className="rounded-lg border border-border bg-card p-[var(--density-card-padding)] space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          MFA Enforcement Policy
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select which roles are required to use two-factor authentication.
          Users in these roles will be prompted to set up MFA on their next
          login.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        {AVAILABLE_ROLES.map((role) => (
          <label
            key={role}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedRoles.includes(role)}
              onChange={() => toggleRole(role)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-foreground">{role}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Policy"}
        </button>
        {!hasChanges && (
          <span className="text-xs text-muted-foreground">No changes</span>
        )}
      </div>
    </div>
  );
}
