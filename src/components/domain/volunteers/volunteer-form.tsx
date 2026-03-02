"use client";

// src/components/domain/volunteers/volunteer-form.tsx

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createVolunteer, updateVolunteer } from "@/lib/actions/volunteers";
import type { Volunteer } from "@/types/domain";

const AU_STATES = [
  { value: "VIC", label: "Victoria" },
  { value: "NSW", label: "New South Wales" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
] as const;

interface VolunteerFormProps {
  mode: "create" | "edit";
  volunteer?: Volunteer;
}

export function VolunteerForm({ mode, volunteer }: VolunteerFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    haptics.medium();

    const fd = new FormData(e.currentTarget);
    const input = {
      first_name:       fd.get("first_name") as string,
      last_name:        fd.get("last_name") as string,
      email:            (fd.get("email") as string) || undefined,
      phone:            (fd.get("phone") as string) || undefined,
      wwcc_number:      (fd.get("wwcc_number") as string) || undefined,
      wwcc_expiry_date: (fd.get("wwcc_expiry_date") as string) || undefined,
      wwcc_state:       (fd.get("wwcc_state") as string) || undefined,
      notes:            (fd.get("notes") as string) || undefined,
      ...(mode === "edit" && { status: fd.get("status") as string }),
    };

    const result =
      mode === "create"
        ? await createVolunteer(input as Parameters<typeof createVolunteer>[0])
        : await updateVolunteer(
            volunteer!.id,
            input as Parameters<typeof updateVolunteer>[1],
          );

    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Failed to save volunteer");
      haptics.error();
      return;
    }

    haptics.success();
    router.push(
      mode === "create"
        ? `/admin/volunteers/${result.data.id}`
        : `/admin/volunteers/${volunteer!.id}`,
    );
    router.refresh();
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--foreground)",
    marginBottom: "0.25rem",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius)",
    border: "1px solid var(--input)",
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    fontSize: "0.9375rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Name */}
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="first_name">
            First name <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            defaultValue={volunteer?.first_name}
            style={inputStyle}
            placeholder="Jane"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="last_name">
            Last name <span style={{ color: "var(--destructive)" }}>*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            defaultValue={volunteer?.last_name}
            style={inputStyle}
            placeholder="Smith"
          />
        </div>

        {/* Contact */}
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={volunteer?.email ?? ""}
            style={inputStyle}
            placeholder="jane@example.com"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={volunteer?.phone ?? ""}
            style={inputStyle}
            placeholder="04xx xxx xxx"
          />
        </div>

        {/* WWCC */}
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wwcc_number">
            WWCC Number
          </label>
          <input
            id="wwcc_number"
            name="wwcc_number"
            type="text"
            defaultValue={volunteer?.wwcc_number ?? ""}
            style={inputStyle}
            placeholder="e.g. WWC1234567E"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wwcc_expiry_date">
            WWCC Expiry Date
          </label>
          <input
            id="wwcc_expiry_date"
            name="wwcc_expiry_date"
            type="date"
            defaultValue={volunteer?.wwcc_expiry_date ?? ""}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="wwcc_state">
            WWCC State
          </label>
          <select
            id="wwcc_state"
            name="wwcc_state"
            defaultValue={volunteer?.wwcc_state ?? ""}
            style={inputStyle}
          >
            <option value="">Select state…</option>
            {AU_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status (edit only) */}
        {mode === "edit" && (
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={volunteer?.status ?? "active"}
              style={inputStyle}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ ...fieldStyle, marginTop: "1rem" }}>
        <label style={labelStyle} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={volunteer?.notes ?? ""}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Any additional information…"
        />
      </div>

      {error && (
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.875rem",
            color: "var(--destructive)",
          }}
        >
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
          {saving ? "Saving…" : mode === "create" ? "Add Volunteer" : "Save Changes"}
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
