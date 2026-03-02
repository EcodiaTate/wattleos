"use client";

// src/components/domain/volunteers/assignment-form.tsx

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createAssignment } from "@/lib/actions/volunteers";
import type { VolunteerWithWwccStatus } from "@/types/domain";
import { WwccStatusBadge } from "./wwcc-status-badge";

interface AssignmentFormProps {
  volunteers: VolunteerWithWwccStatus[];
  excursionId?: string;
  excursionName?: string;
  excursionDate?: string;
  onSuccess?: () => void;
}

const COMMON_ROLES = [
  "General helper",
  "Canteen assistant",
  "Activity supervisor",
  "First aid officer",
  "Driver",
  "Translator",
];

export function AssignmentForm({
  volunteers,
  excursionId,
  excursionName,
  excursionDate,
  onSuccess,
}: AssignmentFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedVolId, setSelectedVolId] = useState("");
  const [wwccWarning, setWwccWarning] = useState<string | null>(null);

  const activeVols = volunteers.filter((v) => v.status === "active");

  function handleVolunteerChange(id: string) {
    setSelectedVolId(id);
    const vol = activeVols.find((v) => v.id === id);
    if (!vol) {
      setWwccWarning(null);
      return;
    }
    if (vol.wwcc_status === "expired") {
      setWwccWarning("This volunteer's WWCC has expired. Confirm with your coordinator before rostering.");
    } else if (vol.wwcc_status === "expiring_soon") {
      setWwccWarning(`This volunteer's WWCC expires in ${vol.days_until_expiry} days.`);
    } else if (vol.wwcc_status === "missing") {
      setWwccWarning("No WWCC details recorded for this volunteer.");
    } else {
      setWwccWarning(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    haptics.medium();

    const fd = new FormData(e.currentTarget);
    const result = await createAssignment({
      volunteer_id:  fd.get("volunteer_id") as string,
      excursion_id:  excursionId || null,
      event_name:    (fd.get("event_name") as string),
      event_date:    (fd.get("event_date") as string),
      role:          (fd.get("role") as string),
      notes:         (fd.get("notes") as string) || null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error?.message ?? "Failed to create assignment");
      haptics.error();
      return;
    }

    haptics.success();
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/admin/volunteers/assignments");
      router.refresh();
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--input)",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "0.9375rem",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 500,
    marginBottom: "0.25rem",
  };

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  const selectedVol = activeVols.find((v) => v.id === selectedVolId);

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Volunteer selector */}
        <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          <label style={labelStyle} htmlFor="volunteer_id">
            Volunteer <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <select
            id="volunteer_id"
            name="volunteer_id"
            required
            value={selectedVolId}
            onChange={(e) => handleVolunteerChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select volunteer…</option>
            {activeVols.map((v) => (
              <option key={v.id} value={v.id}>
                {v.last_name}, {v.first_name}{" "}
                {v.wwcc_status !== "current"
                  ? `(WWCC ${v.wwcc_status.replace("_", " ")})`
                  : ""}
              </option>
            ))}
          </select>
          {selectedVol && (
            <div style={{ marginTop: "0.25rem" }}>
              <WwccStatusBadge
                status={selectedVol.wwcc_status}
                daysUntilExpiry={selectedVol.days_until_expiry}
                expiryDate={selectedVol.wwcc_expiry_date}
                size="sm"
              />
            </div>
          )}
          {wwccWarning && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--volunteer-wwcc-expiring-soon)",
                marginTop: "0.25rem",
              }}
            >
              ⚠ {wwccWarning}
            </p>
          )}
        </div>

        {/* Event name */}
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="event_name">
            Event / Excursion name <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            id="event_name"
            name="event_name"
            type="text"
            required
            defaultValue={excursionName ?? ""}
            readOnly={!!excursionName}
            style={{
              ...inputStyle,
              backgroundColor: excursionName
                ? "var(--muted)"
                : "var(--background)",
            }}
            placeholder="e.g. Museum Excursion"
          />
        </div>

        {/* Event date */}
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="event_date">
            Event date <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            id="event_date"
            name="event_date"
            type="date"
            required
            defaultValue={excursionDate ?? ""}
            readOnly={!!excursionDate}
            style={{
              ...inputStyle,
              backgroundColor: excursionDate
                ? "var(--muted)"
                : "var(--background)",
            }}
          />
        </div>

        {/* Role */}
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="role">
            Role <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            id="role"
            name="role"
            type="text"
            required
            list="role-suggestions"
            style={inputStyle}
            placeholder="e.g. General helper"
          />
          <datalist id="role-suggestions">
            {COMMON_ROLES.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Notes */}
      <div style={{ ...fieldStyle, marginTop: "1rem" }}>
        <label style={labelStyle} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Any instructions for this volunteer…"
        />
      </div>

      {error && (
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button
          type="submit"
          disabled={saving}
          className="touch-target active-push"
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            fontWeight: 600,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            fontSize: "0.9375rem",
          }}
        >
          {saving ? "Saving…" : "Assign Volunteer"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="touch-target active-push"
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--muted)",
            color: "var(--muted-foreground)",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontSize: "0.9375rem",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
