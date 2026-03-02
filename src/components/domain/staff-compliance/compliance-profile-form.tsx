"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import {
  upsertComplianceProfile,
  verifyWwcc,
} from "@/lib/actions/staff-compliance";
import type { StaffComplianceProfile } from "@/types/domain";
import type { UpsertComplianceProfileInput } from "@/lib/validations/staff-compliance";
import { useHaptics } from "@/lib/hooks/use-haptics";

const AUSTRALIAN_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const QUALIFICATION_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "none", label: "None" },
  { value: "cert3", label: "Certificate III" },
  { value: "diploma", label: "Diploma" },
  { value: "ect", label: "ECT (Early Childhood Teacher)" },
  { value: "working_towards", label: "Working towards qualification" },
  { value: "other", label: "Other" },
];

interface Props {
  userId: string;
  profile: StaffComplianceProfile | null;
  canManage: boolean;
}

export function ComplianceProfileForm({ userId, profile, canManage }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const fd = new FormData(e.currentTarget);

    const result = await upsertComplianceProfile(userId, {
      wwcc_state: ((fd.get("wwcc_state") as string) ||
        null) as UpsertComplianceProfileInput["wwcc_state"],
      wwcc_number: (fd.get("wwcc_number") as string) || null,
      wwcc_expiry: (fd.get("wwcc_expiry") as string) || null,
      highest_qualification: ((fd.get("highest_qualification") as string) ||
        null) as UpsertComplianceProfileInput["highest_qualification"],
      qualification_detail: (fd.get("qualification_detail") as string) || null,
      acecqa_approval_number:
        (fd.get("acecqa_approval_number") as string) || null,
      working_towards_rto: (fd.get("working_towards_rto") as string) || null,
      working_towards_expected:
        (fd.get("working_towards_expected") as string) || null,
      geccko_module: (fd.get("geccko_module") as string) || null,
      geccko_completion_date:
        (fd.get("geccko_completion_date") as string) || null,
      geccko_record_id: (fd.get("geccko_record_id") as string) || null,
      employment_start_date:
        (fd.get("employment_start_date") as string) || null,
      employment_end_date: (fd.get("employment_end_date") as string) || null,
      position_title: (fd.get("position_title") as string) || null,
      date_of_birth: (fd.get("date_of_birth") as string) || null,
      contact_address: (fd.get("contact_address") as string) || null,
    });

    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      setSuccessMsg("Profile saved.");
      haptics.success();
      router.refresh();
    }
    setSaving(false);
  }

  async function handleVerifyWwcc() {
    setVerifying(true);
    setError(null);
    haptics.impact("medium");

    const result = await verifyWwcc(userId);
    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      setSuccessMsg("WWCC verified.");
      haptics.success();
      router.refresh();
    }
    setVerifying(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* WWCC Section */}
      <fieldset className="space-y-3">
        <legend
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Working with Children Check (WWCC)
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="State">
            <select
              name="wwcc_state"
              defaultValue={profile?.wwcc_state ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              <option value="">Select state…</option>
              {AUSTRALIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <GlowTarget
            id="compliance-input-wwcc"
            category="input"
            label="WWCC card number"
          >
            <Field label="Card Number">
              <input
                name="wwcc_number"
                type="text"
                defaultValue={profile?.wwcc_number ?? ""}
                disabled={!canManage}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
              />
            </Field>
          </GlowTarget>
          <GlowTarget
            id="compliance-input-wwcc-expiry"
            category="input"
            label="WWCC expiry date"
          >
            <Field label="Expiry Date">
              <input
                name="wwcc_expiry"
                type="date"
                defaultValue={profile?.wwcc_expiry ?? ""}
                disabled={!canManage}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--foreground)",
                }}
              />
            </Field>
          </GlowTarget>
        </div>
        <div className="flex items-center gap-3">
          {profile?.wwcc_last_verified && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Last verified: {profile.wwcc_last_verified}
            </p>
          )}
          {canManage && profile?.wwcc_number && (
            <button
              type="button"
              onClick={handleVerifyWwcc}
              disabled={verifying}
              className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              {verifying ? "Verifying…" : "Mark as Verified"}
            </button>
          )}
        </div>
      </fieldset>

      {/* Qualifications Section */}
      <fieldset className="space-y-3">
        <legend
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Qualifications
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Highest Qualification">
            <select
              name="highest_qualification"
              defaultValue={profile?.highest_qualification ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              {QUALIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qualification Detail">
            <input
              name="qualification_detail"
              type="text"
              placeholder="e.g. Diploma of ECE (CHC50121)"
              defaultValue={profile?.qualification_detail ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="ACECQA Approval Number">
            <input
              name="acecqa_approval_number"
              type="text"
              defaultValue={profile?.acecqa_approval_number ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Working Towards - RTO Name">
            <input
              name="working_towards_rto"
              type="text"
              defaultValue={profile?.working_towards_rto ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="Expected Completion">
            <input
              name="working_towards_expected"
              type="date"
              defaultValue={profile?.working_towards_expected ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
        </div>
      </fieldset>

      {/* Geccko Section */}
      <fieldset className="space-y-3">
        <legend
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Child Safety Training (Geccko)
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Module Name">
            <input
              name="geccko_module"
              type="text"
              defaultValue={profile?.geccko_module ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="Completion Date">
            <input
              name="geccko_completion_date"
              type="date"
              defaultValue={profile?.geccko_completion_date ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="Geccko Record ID">
            <input
              name="geccko_record_id"
              type="text"
              defaultValue={profile?.geccko_record_id ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
        </div>
      </fieldset>

      {/* Worker Register Section */}
      <fieldset className="space-y-3">
        <legend
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Worker Register (NQA ITS)
        </legend>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Required for the National Early Childhood Worker Register export.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date of Birth">
            <input
              name="date_of_birth"
              type="date"
              defaultValue={profile?.date_of_birth ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="Position Title">
            <input
              name="position_title"
              type="text"
              defaultValue={profile?.position_title ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="Employment Start">
            <input
              name="employment_start_date"
              type="date"
              defaultValue={profile?.employment_start_date ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
          <Field label="Employment End">
            <input
              name="employment_end_date"
              type="date"
              defaultValue={profile?.employment_end_date ?? ""}
              disabled={!canManage}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </Field>
        </div>
        <Field label="Contact Address">
          <textarea
            name="contact_address"
            rows={2}
            defaultValue={profile?.contact_address ?? ""}
            disabled={!canManage}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          />
        </Field>
      </fieldset>

      {/* Feedback + Save */}
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}
      {successMsg && (
        <p
          className="text-sm"
          style={{ color: "var(--attendance-present-fg, #166534)" }}
        >
          {successMsg}
        </p>
      )}
      {canManage && (
        <GlowTarget
          id="compliance-btn-profile-save"
          category="button"
          label="Save compliance profile"
        >
          <button
            type="submit"
            disabled={saving}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </GlowTarget>
      )}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
