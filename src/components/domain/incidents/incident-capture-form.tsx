"use client";

// src/components/domain/incidents/incident-capture-form.tsx
//
// Incident capture form - Reg 87 compliant record.
// Uses controlled state. On submit, calls createIncident()
// and redirects to the new incident detail page.
// Serious incident classification is auto-suggested but
// the educator always makes the final call.

import { createIncident } from "@/lib/actions/incidents";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface StaffOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  students: StudentOption[];
  staff: StaffOption[];
  currentUserId: string;
}

export function IncidentCaptureForm({ students, staff, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16); // datetime-local format
  });
  const [location, setLocation] = useState("");
  const [incidentType, setIncidentType] = useState<
    "injury" | "illness" | "trauma" | "near_miss"
  >("injury");
  const [description, setDescription] = useState("");
  const [firstAid, setFirstAid] = useState("");
  const [firstAidBy, setFirstAidBy] = useState(currentUserId);
  const [witnessNames, setWitnessNames] = useState("");
  const [severity, setSeverity] = useState<"minor" | "moderate" | "serious">(
    "minor",
  );
  const [isSeriousIncident, setIsSeriousIncident] = useState(false);
  const [seriousReason, setSeriousReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest serious when severity is 'serious'
  const handleSeverityChange = (v: typeof severity) => {
    setSeverity(v);
    if (v === "serious" && !isSeriousIncident) setIsSeriousIncident(true);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedStudentIds.length === 0) {
      setError("Select at least one child involved in this incident.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    startTransition(async () => {
      const result = await createIncident({
        student_ids: selectedStudentIds,
        occurred_at: new Date(occurredAt).toISOString(),
        location: location.trim(),
        incident_type: incidentType,
        description: description.trim(),
        first_aid_administered: firstAid.trim() || null,
        first_aid_by: firstAidBy || null,
        witness_names: witnessNames
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
        severity,
        is_serious_incident: isSeriousIncident,
        serious_incident_reason: isSeriousIncident
          ? seriousReason.trim() || null
          : null,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push(`/incidents/${result.data!.id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Children involved */}
      <GlowTarget
        id="incidents-select-students"
        category="select"
        label="Children involved"
      >
        <fieldset>
          <legend
            className="mb-2 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Children involved{" "}
            <span style={{ color: "var(--destructive)" }}>*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {students.map((s) => {
              const selected = selectedStudentIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStudent(s.id)}
                  className="active-push touch-target rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition-colors"
                  style={{
                    borderColor: selected ? "var(--primary)" : "var(--border)",
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
          {students.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No students found. Add students first.
            </p>
          )}
        </fieldset>
      </GlowTarget>

      {/* Date/time and location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <GlowTarget
          id="incidents-input-datetime"
          category="input"
          label="Date and time"
        >
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
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </GlowTarget>
        <GlowTarget
          id="incidents-input-location"
          category="input"
          label="Location"
        >
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Location <span style={{ color: "var(--destructive)" }}>*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Outdoor play area, bathroom"
              required
              className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </GlowTarget>
      </div>

      {/* Incident type */}
      <GlowTarget
        id="incidents-select-type"
        category="select"
        label="Incident type"
      >
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Incident type <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(["injury", "illness", "trauma", "near_miss"] as const).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIncidentType(t)}
                  className="active-push touch-target rounded-[var(--radius-md)] border px-4 py-2 text-sm font-medium capitalize transition-colors"
                  style={{
                    borderColor:
                      incidentType === t ? "var(--primary)" : "var(--border)",
                    background:
                      incidentType === t
                        ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                        : "var(--background)",
                    color:
                      incidentType === t
                        ? "var(--primary)"
                        : "var(--foreground)",
                  }}
                >
                  {t.replace("_", " ")}
                </button>
              ),
            )}
          </div>
        </div>
      </GlowTarget>

      {/* Description */}
      <GlowTarget
        id="incidents-input-description"
        category="input"
        label="Description"
      >
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Description <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe what happened, how it occurred, and the circumstances."
            className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          />
        </div>
      </GlowTarget>

      {/* First aid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <GlowTarget
          id="incidents-input-first-aid"
          category="input"
          label="First aid administered"
        >
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              First aid administered
            </label>
            <textarea
              value={firstAid}
              onChange={(e) => setFirstAid(e.target.value)}
              rows={2}
              placeholder="e.g. Wound cleaned and bandaged. Ice pack applied."
              className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            />
          </div>
        </GlowTarget>
        <GlowTarget
          id="incidents-select-first-aid-by"
          category="select"
          label="First aid administered by"
        >
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              First aid administered by
            </label>
            <select
              value={firstAidBy}
              onChange={(e) => setFirstAidBy(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <option value="">— select —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>
        </GlowTarget>
      </div>

      {/* Witnesses */}
      <GlowTarget
        id="incidents-input-witnesses"
        category="input"
        label="Witnesses"
      >
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Witnesses (comma-separated names)
          </label>
          <input
            type="text"
            value={witnessNames}
            onChange={(e) => setWitnessNames(e.target.value)}
            placeholder="e.g. Sarah Bloom, Tom Kent"
            className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
            style={{ color: "var(--foreground)" }}
          />
        </div>
      </GlowTarget>

      {/* Severity */}
      <GlowTarget
        id="incidents-select-severity"
        category="select"
        label="Severity"
      >
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Severity <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <div className="flex gap-2">
            {(["minor", "moderate", "serious"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSeverityChange(s)}
                className="active-push touch-target flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium capitalize transition-colors"
                style={{
                  borderColor:
                    severity === s
                      ? s === "serious"
                        ? "var(--destructive)"
                        : s === "moderate"
                          ? "orange"
                          : "var(--primary)"
                      : "var(--border)",
                  background:
                    severity === s
                      ? s === "serious"
                        ? "color-mix(in srgb, var(--destructive) 10%, transparent)"
                        : s === "moderate"
                          ? "color-mix(in srgb, orange 10%, transparent)"
                          : "color-mix(in srgb, var(--primary) 10%, transparent)"
                      : "var(--background)",
                  color:
                    severity === s
                      ? s === "serious"
                        ? "var(--destructive)"
                        : s === "moderate"
                          ? "var(--foreground)"
                          : "var(--primary)"
                      : "var(--muted-foreground)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </GlowTarget>

      {/* Serious incident flag */}
      <GlowTarget
        id="incidents-toggle-serious"
        category="toggle"
        label="Serious incident flag"
      >
        <div
          className="rounded-[var(--radius-lg)] border p-4 space-y-3"
          style={{
            borderColor: isSeriousIncident
              ? "var(--destructive)"
              : "var(--border)",
            background: isSeriousIncident
              ? "color-mix(in srgb, var(--destructive) 5%, transparent)"
              : "var(--muted)",
          }}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isSeriousIncident}
              onChange={(e) => setIsSeriousIncident(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded"
            />
            <div>
              <span
                className="text-sm font-semibold"
                style={{
                  color: isSeriousIncident
                    ? "var(--destructive)"
                    : "var(--foreground)",
                }}
              >
                This is a serious incident (Reg 12)
              </span>
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Hospital attendance required · Child missing · Serious injury ·
                Abuse allegation · Emergency evacuation. Regulatory authority
                must be notified within 24 hours via NQA ITS.
              </p>
            </div>
          </label>
          {isSeriousIncident && (
            <div>
              <label
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Reason for serious classification
              </label>
              <input
                type="text"
                value={seriousReason}
                onChange={(e) => setSeriousReason(e.target.value)}
                placeholder="e.g. Child required hospital attendance for suspected fracture"
                className="w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm"
                style={{ color: "var(--foreground)" }}
              />
            </div>
          )}
        </div>
      </GlowTarget>

      {/* Error */}
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
          id="incidents-btn-submit"
          category="button"
          label="Save Incident"
        >
          <button
            type="submit"
            disabled={isPending}
            className="active-push touch-target flex-1 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Saving…" : "Save Incident"}
          </button>
        </GlowTarget>
      </div>
    </form>
  );
}
