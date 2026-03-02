"use client";

// src/components/domain/attendance/kiosk-panel.tsx
//
// ============================================================
// WattleOS V2 - Late Arrival / Early Departure Kiosk Panel
// ============================================================
// Three-step kiosk workflow for a reception tablet:
//   1. SEARCH    - Staff/parent finds the student by name
//   2. FORM      - Select type, reason, sign with name
//   3. CONFIRM   - Large success state, auto-resets
//
// Designed for a landscape tablet at 44px+ touch targets.
// ============================================================

import { useCallback, useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createSignInOutRecord,
  searchStudentsForKiosk,
} from "@/lib/actions/sign-in-out";
import {
  LATE_ARRIVAL_REASONS,
  EARLY_DEPARTURE_REASONS,
  RELATIONSHIP_OPTIONS,
  SIGN_IN_OUT_TYPE_CONFIG,
} from "@/lib/constants/sign-in-out";
import type { SignInOutType } from "@/types/domain";
import type { Student } from "@/types/domain";

type StudentResult = Pick<
  Student,
  "id" | "first_name" | "last_name" | "preferred_name" | "photo_url"
>;

type KioskStep = "search" | "form" | "confirm";

// ── Helpers ─────────────────────────────────────────────────

function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function studentDisplayName(s: StudentResult): string {
  return s.preferred_name
    ? `${s.preferred_name} ${s.last_name}`
    : `${s.first_name} ${s.last_name}`;
}

// ── Student Avatar ───────────────────────────────────────────

function StudentAvatar({
  student,
  size = "md",
}: {
  student: StudentResult;
  size?: "sm" | "md" | "lg";
}) {
  const initials = `${student.first_name[0] ?? ""}${student.last_name[0] ?? ""}`;
  const sizeCls =
    size === "lg"
      ? "h-16 w-16 text-xl"
      : size === "md"
        ? "h-10 w-10 text-base"
        : "h-8 w-8 text-sm";

  if (student.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={student.photo_url}
        alt={studentDisplayName(student)}
        className={`${sizeCls} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeCls} flex items-center justify-center rounded-full font-semibold text-white`}
      style={{ background: "var(--avatar-2)" }}
    >
      {initials}
    </div>
  );
}

// ── Step 1: Student Search ───────────────────────────────────

function SearchStep({
  onSelect,
}: {
  onSelect: (student: StudentResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const haptics = useHaptics();

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const result = await searchStudentsForKiosk(q.trim());
      setResults(result.data ?? []);
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Student Sign-In / Sign-Out
        </h2>
        <p className="mt-1 text-muted-foreground">
          Search for a student to record a late arrival or early departure.
        </p>
      </div>

      {/* Search input - large for tablet */}
      <div className="relative w-full max-w-xl">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type student's name…"
          autoComplete="off"
          className="w-full rounded-[var(--radius-lg)] border border-border bg-background px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ minHeight: 56 }}
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div className="w-full max-w-xl divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-background overflow-hidden">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                haptics.impact("medium");
                onSelect(s);
              }}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted active:scale-[0.98]"
            >
              <StudentAvatar student={s} size="md" />
              <span className="text-lg font-medium text-foreground">
                {studentDisplayName(s)}
              </span>
              <svg
                className="ml-auto h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No students found for &ldquo;{query}&rdquo;
        </p>
      )}
    </div>
  );
}

// ── Step 2: Sign-In/Out Form ─────────────────────────────────

function SignInOutForm({
  student,
  onBack,
  onSubmit,
}: {
  student: StudentResult;
  onBack: () => void;
  onSubmit: (
    type: SignInOutType,
    reasonCode: string,
    reasonNotes: string,
    signedByName: string,
    signedByRelationship: string,
  ) => void;
}) {
  const haptics = useHaptics();
  const [type, setType] = useState<SignInOutType>("late_arrival");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNotes, setReasonNotes] = useState("");
  const [signedByName, setSignedByName] = useState("");
  const [signedByRelationship, setSignedByRelationship] = useState("");
  const [error, setError] = useState("");

  const reasons =
    type === "late_arrival" ? LATE_ARRIVAL_REASONS : EARLY_DEPARTURE_REASONS;

  // Reset reason when type changes
  const handleTypeChange = (t: SignInOutType) => {
    haptics.impact("light");
    setType(t);
    setReasonCode("");
  };

  const handleSubmit = () => {
    if (!reasonCode) {
      setError("Please select a reason.");
      return;
    }
    haptics.impact("medium");
    setError("");
    onSubmit(type, reasonCode, reasonNotes, signedByName, signedByRelationship);
  };

  const typeConfig = SIGN_IN_OUT_TYPE_CONFIG[type];

  return (
    <div className="flex flex-col gap-6">
      {/* Back + student header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            haptics.impact("light");
            onBack();
          }}
          className="touch-target flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <StudentAvatar student={student} size="md" />
          <span className="text-lg font-semibold text-foreground">
            {studentDisplayName(student)}
          </span>
        </div>
      </div>

      {/* Type toggle */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Event type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(["late_arrival", "early_departure"] as SignInOutType[]).map((t) => {
            const cfg = SIGN_IN_OUT_TYPE_CONFIG[t];
            const selected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className="active-push touch-target flex flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] border-2 p-4 text-center transition-all"
                style={
                  selected
                    ? {
                        borderColor: cfg.colorVar,
                        background: cfg.colorVar,
                        color: cfg.fgVar,
                      }
                    : {
                        borderColor: "var(--border)",
                        background: "var(--background)",
                        color: "var(--foreground)",
                      }
                }
              >
                <span className="text-2xl">
                  {t === "late_arrival" ? "→" : "←"}
                </span>
                <span className="font-semibold">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reason select */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Reason <span className="text-destructive">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {reasons.map((r) => {
            const selected = reasonCode === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  haptics.impact("light");
                  setReasonCode(r.value);
                  setError("");
                }}
                className="active-push touch-target rounded-[var(--radius-md)] border p-3 text-left text-sm transition-all"
                style={
                  selected
                    ? {
                        borderColor: typeConfig.colorVar,
                        background: typeConfig.colorVar,
                        color: typeConfig.fgVar,
                      }
                    : {
                        borderColor: "var(--border)",
                        background: "var(--background)",
                        color: "var(--foreground)",
                      }
                }
              >
                <span className="font-medium">{r.label}</span>
              </button>
            );
          })}
        </div>
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>

      {/* Optional notes */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Additional notes{" "}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={reasonNotes}
          onChange={(e) => setReasonNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="e.g. Appointment at 10am, dentist"
          className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Parent signature (typed name) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Collected / dropped off by{" "}
            <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            type="text"
            value={signedByName}
            onChange={(e) => setSignedByName(e.target.value)}
            maxLength={100}
            placeholder="Parent or guardian name"
            className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Relationship{" "}
            <span className="text-muted-foreground">(optional)</span>
          </label>
          <select
            value={signedByRelationship}
            onChange={(e) => setSignedByRelationship(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select…</option>
            {RELATIONSHIP_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        className="active-push touch-target w-full rounded-[var(--radius-lg)] py-4 text-lg font-semibold transition-opacity"
        style={{
          background: typeConfig.colorVar,
          color: typeConfig.fgVar,
        }}
      >
        Confirm {typeConfig.action}
      </button>
    </div>
  );
}

// ── Step 3: Confirmation ─────────────────────────────────────

function ConfirmStep({
  student,
  type,
  occurredAt,
  onReset,
}: {
  student: StudentResult;
  type: SignInOutType;
  occurredAt: string;
  onReset: () => void;
}) {
  const cfg = SIGN_IN_OUT_TYPE_CONFIG[type];
  const time = new Date(occurredAt).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      {/* Large success icon */}
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full text-4xl"
        style={{
          background: cfg.colorVar,
          color: cfg.fgVar,
        }}
      >
        ✓
      </div>

      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {cfg.label} Recorded
        </h2>
        <p className="mt-2 text-muted-foreground">
          {studentDisplayName(student)} - {time}
        </p>
      </div>

      <StudentAvatar student={student} size="lg" />

      <button
        type="button"
        onClick={onReset}
        className="active-push touch-target mt-4 rounded-[var(--radius-lg)] border border-border bg-background px-8 py-3 font-medium text-foreground transition-colors hover:bg-muted"
      >
        Record Another
      </button>
    </div>
  );
}

// ── Main Kiosk Panel ─────────────────────────────────────────

export function KioskPanel() {
  const haptics = useHaptics();
  const [step, setStep] = useState<KioskStep>("search");
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(
    null,
  );
  const [lastType, setLastType] = useState<SignInOutType>("late_arrival");
  const [lastOccurredAt, setLastOccurredAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState("");

  const handleSelectStudent = (student: StudentResult) => {
    setSelectedStudent(student);
    setStep("form");
  };

  const handleSubmit = (
    type: SignInOutType,
    reasonCode: string,
    reasonNotes: string,
    signedByName: string,
    signedByRelationship: string,
  ) => {
    if (!selectedStudent) return;

    const now = new Date();
    const occurredAt = now.toISOString();
    const eventDate = toLocalISOString(now);

    setSubmitError("");

    startTransition(async () => {
      const result = await createSignInOutRecord({
        studentId: selectedStudent.id,
        type,
        eventDate,
        occurredAt,
        reasonCode,
        reasonNotes: reasonNotes || null,
        signedByName: signedByName || null,
        signedByRelationship: signedByRelationship || null,
      });

      if (result.error) {
        setSubmitError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      setLastType(type);
      setLastOccurredAt(occurredAt);
      setStep("confirm");
    });
  };

  const handleReset = () => {
    setStep("search");
    setSelectedStudent(null);
    setSubmitError("");
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Error banner */}
      {submitError && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          Saving…
        </div>
      )}

      {step === "search" && <SearchStep onSelect={handleSelectStudent} />}

      {step === "form" && selectedStudent && (
        <SignInOutForm
          student={selectedStudent}
          onBack={() => setStep("search")}
          onSubmit={handleSubmit}
        />
      )}

      {step === "confirm" && selectedStudent && (
        <ConfirmStep
          student={selectedStudent}
          type={lastType}
          occurredAt={lastOccurredAt}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
