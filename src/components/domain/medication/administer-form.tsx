"use client";

// src/components/domain/medication/administer-form.tsx
//
// ============================================================
// Medication Administration Form (Reg 94)
// ============================================================
// Step-by-step: select student → select authorisation →
// confirm dose → add witness → mark parent notified → submit.
// Immutable once saved - the record becomes a legal document.
// ============================================================

import { recordMedicationAdministration } from "@/lib/actions/medication-admin";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface AuthorisationOption {
  id: string;
  student_id: string;
  medication_name: string;
  dose: string;
  route: string;
  frequency: string;
  is_active: boolean;
  valid_until: string | null;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  } | null;
}

interface StaffOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  authorisations: AuthorisationOption[];
  staff: StaffOption[];
  currentUserId: string;
}

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  inhaled: "Inhaled",
  injected: "Injected",
  topical: "Topical",
  other: "Other",
};

export function AdministerForm({
  authorisations,
  staff,
  currentUserId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  // Pre-select student if provided via query param
  const preSelectedStudentId = searchParams.get("studentId") ?? "";

  const [selectedStudentId, setSelectedStudentId] =
    useState(preSelectedStudentId);
  const [selectedAuthId, setSelectedAuthId] = useState("");
  const [administeredAt, setAdministeredAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [doseGiven, setDoseGiven] = useState("");
  const [route, setRoute] = useState("");
  const [witnessId, setWitnessId] = useState("");
  const [parentNotified, setParentNotified] = useState(false);
  const [childResponse, setChildResponse] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Derive unique students from authorisations
  const students = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        first_name: string;
        last_name: string;
        preferred_name: string | null;
      }
    >();
    for (const auth of authorisations) {
      if (auth.student && !map.has(auth.student.id)) {
        map.set(auth.student.id, auth.student);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.last_name.localeCompare(b.last_name),
    );
  }, [authorisations]);

  // Filter authorisations for selected student
  const studentAuths = useMemo(
    () => authorisations.filter((a) => a.student_id === selectedStudentId),
    [authorisations, selectedStudentId],
  );

  // Auto-fill dose/route when authorisation selected
  const handleAuthSelect = (authId: string) => {
    setSelectedAuthId(authId);
    const auth = authorisations.find((a) => a.id === authId);
    if (auth) {
      setDoseGiven(auth.dose);
      setRoute(auth.route);
      haptics.impact("light");
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedAuthId("");
    setDoseGiven("");
    setRoute("");
    haptics.impact("light");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStudentId) {
      setError("Select a child.");
      return;
    }
    if (!doseGiven.trim()) {
      setError("Dose is required.");
      return;
    }
    if (!route) {
      setError("Route is required.");
      return;
    }

    const selectedAuth = authorisations.find((a) => a.id === selectedAuthId);
    const medName = selectedAuth?.medication_name ?? doseGiven;

    haptics.impact("heavy");
    startTransition(async () => {
      const result = await recordMedicationAdministration({
        student_id: selectedStudentId,
        authorisation_id: selectedAuthId || null,
        administered_at: new Date(administeredAt).toISOString(),
        medication_name: selectedAuth?.medication_name ?? medName,
        dose_given: doseGiven.trim(),
        route,
        witness_id: witnessId || null,
        parent_notified: parentNotified,
        child_response: childResponse.trim() || null,
        notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      router.push(`/medication/student/${selectedStudentId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Select child */}
      <GlowTarget
        id="meds-select-student"
        category="select"
        label="Select child"
      >
        <fieldset>
          <legend
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Child <span style={{ color: "var(--destructive)" }}>*</span>
          </legend>
          {students.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No children have active medication authorisations. Add an
              authorisation first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {students.map((s) => {
                const selected = selectedStudentId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStudentSelect(s.id)}
                    className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition-colors"
                    style={{
                      borderColor: selected
                        ? "var(--primary)"
                        : "var(--border)",
                      background: selected
                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                        : "var(--background)",
                      color: "var(--foreground)",
                    }}
                  >
                    {s.first_name} {s.last_name}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      </GlowTarget>

      {/* Step 2: Select authorisation */}
      {selectedStudentId && studentAuths.length > 0 && (
        <GlowTarget
          id="meds-select-authorisation"
          category="select"
          label="Authorised medication"
        >
          <fieldset>
            <legend
              className="mb-2 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Authorised medication
            </legend>
            <div className="space-y-2">
              {studentAuths.map((auth) => {
                const selected = selectedAuthId === auth.id;
                return (
                  <button
                    key={auth.id}
                    type="button"
                    onClick={() => handleAuthSelect(auth.id)}
                    className="active-push touch-target w-full rounded-[var(--radius-md)] border p-3 text-left transition-colors"
                    style={{
                      borderColor: selected
                        ? "var(--primary)"
                        : "var(--border)",
                      background: selected
                        ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                        : "var(--background)",
                    }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {auth.medication_name}
                    </span>
                    <span
                      className="block text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {auth.dose} · {ROUTE_LABELS[auth.route] ?? auth.route} ·{" "}
                      {auth.frequency}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </GlowTarget>
      )}

      {/* Step 3: Dose details */}
      {selectedStudentId && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Date and time{" "}
                <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input
                type="datetime-local"
                value={administeredAt}
                onChange={(e) => setAdministeredAt(e.target.value)}
                required
                className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            <GlowTarget
              id="meds-input-dose"
              category="input"
              label="Dose given"
            >
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Dose given{" "}
                  <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={doseGiven}
                  onChange={(e) => setDoseGiven(e.target.value)}
                  placeholder="e.g. 2 puffs, 5ml"
                  required
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  style={{ color: "var(--foreground)" }}
                />
              </div>
            </GlowTarget>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Route <span style={{ color: "var(--destructive)" }}>*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(ROUTE_LABELS) as [string, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setRoute(key);
                      haptics.impact("light");
                    }}
                    className="active-push touch-target rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium transition-colors"
                    style={{
                      borderColor:
                        route === key ? "var(--primary)" : "var(--border)",
                      background:
                        route === key
                          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                          : "var(--background)",
                      color:
                        route === key ? "var(--primary)" : "var(--foreground)",
                    }}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Witness */}
          <GlowTarget
            id="meds-select-witness"
            category="select"
            label="Witness"
          >
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Witness
              </label>
              <select
                value={witnessId}
                onChange={(e) => setWitnessId(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                <option value="">— no witness —</option>
                {staff
                  .filter((s) => s.id !== currentUserId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
              </select>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Best practice: all medication administration should be witnessed
                by a second staff member.
              </p>
            </div>
          </GlowTarget>

          {/* Parent notified */}
          <label
            className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border border-border p-4"
            style={{ background: "var(--background)" }}
          >
            <input
              type="checkbox"
              checked={parentNotified}
              onChange={(e) => {
                setParentNotified(e.target.checked);
                haptics.impact("light");
              }}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Parent notified
              </span>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Parent/guardian has been informed of this medication
                administration.
              </p>
            </div>
          </label>

          {/* Child response */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Child&apos;s response
            </label>
            <textarea
              value={childResponse}
              onChange={(e) => setChildResponse(e.target.value)}
              rows={2}
              placeholder="e.g. Breathing improved after inhaler. Child returned to play."
              className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes for this administration"
              className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </>
      )}

      {error && (
        <p
          className="text-sm font-medium"
          style={{ color: "var(--destructive)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target flex-1 rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <GlowTarget
          id="meds-btn-submit"
          category="button"
          label="Record Administration"
        >
          <button
            type="submit"
            disabled={isPending || !selectedStudentId}
            className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Recording…" : "Record Administration"}
          </button>
        </GlowTarget>
      </div>

      {/* Regulatory note */}
      <p
        className="text-[10px] text-center"
        style={{ color: "var(--muted-foreground)" }}
      >
        This record is immutable once saved. It forms part of the service&apos;s
        Reg 94 compliance records.
      </p>
    </form>
  );
}
