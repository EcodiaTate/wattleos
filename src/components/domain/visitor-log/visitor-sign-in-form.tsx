"use client";

// src/components/domain/visitor-log/visitor-sign-in-form.tsx
//
// ============================================================
// WattleOS V2 - Visitor Sign-In Form
// ============================================================

import { useState, useTransition } from "react";
import { createVisitorRecord } from "@/lib/actions/visitor-log";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { VisitorSignInRecord, VisitorType } from "@/types/domain";

const VISITOR_TYPE_OPTIONS: { value: VisitorType; label: string }[] = [
  { value: "parent_guardian", label: "Parent / Guardian" },
  { value: "community_member", label: "Community Member" },
  { value: "official", label: "Official / Inspector" },
  { value: "delivery", label: "Delivery" },
  { value: "volunteer", label: "Volunteer" },
  { value: "other", label: "Other" },
];

interface VisitorSignInFormProps {
  onSuccess: (record: VisitorSignInRecord) => void;
  onCancel: () => void;
}

export function VisitorSignInForm({
  onSuccess,
  onCancel,
}: VisitorSignInFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const [visitorName, setVisitorName] = useState("");
  const [visitorType, setVisitorType] =
    useState<VisitorType>("parent_guardian");
  const [organisation, setOrganisation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hostName, setHostName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [idSighted, setIdSighted] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const fieldClass =
    "w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!purpose.trim()) {
      setError("Purpose is required.");
      return;
    }
    setError("");
    haptics.impact("medium");

    startTransition(async () => {
      const result = await createVisitorRecord({
        visitor_name: visitorName.trim(),
        visitor_type: visitorType,
        organisation: organisation.trim() || null,
        purpose: purpose.trim(),
        host_name: hostName.trim() || null,
        badge_number: badgeNumber.trim() || null,
        id_sighted: idSighted,
        signed_in_at: new Date().toISOString(),
        notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      onSuccess(result.data!);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Full name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          placeholder="e.g. Jane Smith"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Visitor type <span className="text-destructive">*</span>
        </label>
        <select
          value={visitorType}
          onChange={(e) => setVisitorType(e.target.value as VisitorType)}
          className={fieldClass}
        >
          {VISITOR_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Organisation{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={organisation}
          onChange={(e) => setOrganisation(e.target.value)}
          placeholder="e.g. Department of Education"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Purpose of visit <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g. Collecting child / meeting with teacher"
          className={fieldClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Who are they visiting?{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          placeholder="Staff member name"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Badge no.{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            type="text"
            value={badgeNumber}
            onChange={(e) => setBadgeNumber(e.target.value)}
            placeholder="V-001"
            className={fieldClass}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={idSighted}
              onChange={(e) => setIdSighted(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            <span className="text-sm font-medium text-foreground">
              ID sighted
            </span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Notes{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Any additional notes"
          className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            haptics.impact("light");
            onCancel();
          }}
          className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
        >
          {isPending ? "Signing in…" : "Sign In"}
        </button>
      </div>
    </form>
  );
}
