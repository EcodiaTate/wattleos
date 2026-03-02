"use client";

import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { PhotoSession } from "@/types/domain";
import type { CreateSessionInput } from "@/lib/validations/school-photos";

// ============================================================
// Session Form (Module R)
// ============================================================
// Create/edit form for photo sessions. Validates client-side
// via Zod-compatible checks and delegates mutation to parent
// via onSubmit callback (which calls a server action).
// ============================================================

const PERSON_TYPE_OPTIONS = [
  { value: "student", label: "Students" },
  { value: "staff", label: "Staff" },
  { value: "both", label: "Both" },
] as const;

interface SessionFormProps {
  session?: PhotoSession;
  onSubmit: (data: CreateSessionInput) => Promise<void>;
  onCancel: () => void;
}

export function SessionForm({ session, onSubmit, onCancel }: SessionFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(session?.name ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [sessionDate, setSessionDate] = useState(session?.session_date ?? "");
  const [personType, setPersonType] = useState<"student" | "staff" | "both">(
    session?.person_type ?? "student",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!name.trim()) {
      setError("Session name is required.");
      haptics.error();
      return;
    }

    if (name.trim().length > 200) {
      setError("Session name must be 200 characters or fewer.");
      haptics.error();
      return;
    }

    if (!sessionDate) {
      setError("Session date is required.");
      haptics.error();
      return;
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
      setError("Enter a valid date (YYYY-MM-DD).");
      haptics.error();
      return;
    }

    if (description.length > 2000) {
      setError("Description must be 2000 characters or fewer.");
      haptics.error();
      return;
    }

    const data: CreateSessionInput = {
      name: name.trim(),
      description: description.trim() || null,
      session_date: sessionDate,
      person_type: personType,
    };

    startTransition(async () => {
      try {
        await onSubmit(data);
        haptics.impact("medium");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save session";
        setError(message);
        haptics.error();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="session-name"
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Session Name
        </label>
        <input
          id="session-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Term 1 2026 School Photos"
          required
          maxLength={200}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="session-description"
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Description
          <span
            className="ml-1 font-normal"
            style={{ color: "var(--muted-foreground)" }}
          >
            (optional)
          </span>
        </label>
        <textarea
          id="session-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes about this photo session..."
          maxLength={2000}
          rows={3}
          className="w-full resize-none rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {description.length}/2000
        </p>
      </div>

      {/* Session Date */}
      <div className="space-y-1.5">
        <label
          htmlFor="session-date"
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Photo Date
        </label>
        <input
          id="session-date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Person Type */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Photo Type
        </label>
        <div className="flex gap-2">
          {PERSON_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setPersonType(option.value);
                haptics.impact("light");
              }}
              className="active-push touch-target flex-1 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-all"
              style={{
                borderColor:
                  personType === option.value
                    ? "var(--primary)"
                    : "var(--border)",
                background:
                  personType === option.value
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : "var(--background)",
                color:
                  personType === option.value
                    ? "var(--primary)"
                    : "var(--foreground)",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-semibold"
          style={{
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? "Saving..."
            : session
              ? "Update Session"
              : "Create Session"}
        </button>
      </div>
    </form>
  );
}
