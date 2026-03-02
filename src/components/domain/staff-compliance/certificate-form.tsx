"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import {
  upsertCertificate,
  deleteCertificate,
} from "@/lib/actions/staff-compliance";
import type { StaffCertificate, StaffCertType } from "@/types/domain";
import { ComplianceStatusPill } from "./compliance-status-pill";
import { useHaptics } from "@/lib/hooks/use-haptics";

const CERT_TYPE_OPTIONS: { value: StaffCertType; label: string }[] = [
  { value: "first_aid", label: "First Aid (HLTAID012)" },
  { value: "cpr", label: "CPR (annual)" },
  { value: "anaphylaxis", label: "Anaphylaxis Management" },
  { value: "asthma", label: "Asthma Management" },
  { value: "child_safety", label: "Child Safety Training" },
  { value: "mandatory_reporting", label: "Mandatory Reporting Training" },
  { value: "food_safety", label: "Food Safety Supervisor (SITXFSA005)" },
  { value: "other", label: "Other" },
];

interface Props {
  userId: string;
  certificates: StaffCertificate[];
  canManage: boolean;
}

export function CertificateSection({ userId, certificates, canManage }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [showForm, setShowForm] = useState(false);
  const [editingCert, setEditingCert] = useState<StaffCertificate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(cert: StaffCertificate) {
    setEditingCert(cert);
    setShowForm(true);
    setError(null);
  }

  function startNew() {
    setEditingCert(null);
    setShowForm(true);
    setError(null);
  }

  function cancel() {
    setShowForm(false);
    setEditingCert(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const result = await upsertCertificate({
      id: editingCert?.id ?? null,
      user_id: userId,
      cert_type: fd.get("cert_type") as StaffCertType,
      cert_name: fd.get("cert_name") as string,
      issue_date: fd.get("issue_date") as string,
      expiry_date: (fd.get("expiry_date") as string) || null,
      cert_number: (fd.get("cert_number") as string) || null,
      provider: (fd.get("provider") as string) || null,
      document_url: null,
      notes: (fd.get("notes") as string) || null,
    });

    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      haptics.success();
      setShowForm(false);
      setEditingCert(null);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete(certId: string) {
    if (!confirm("Remove this certificate?")) return;
    setDeleting(certId);
    haptics.impact("medium");

    const result = await deleteCertificate(certId);
    if (result.error) {
      setError(result.error.message);
      haptics.error();
    } else {
      haptics.success();
      router.refresh();
    }
    setDeleting(null);
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Certificates
        </h3>
        {canManage && !showForm && (
          <button
            type="button"
            onClick={startNew}
            className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            + Add Certificate
          </button>
        )}
      </div>

      {/* Required Certificates Checklist */}
      <RequiredCertsChecklist certificates={certificates} today={today} />

      {/* Inline Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <GlowTarget
              id="compliance-input-cert-file"
              category="select"
              label="Certificate type"
            >
              <label className="block">
                <span
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Type
                </span>
                <select
                  name="cert_type"
                  defaultValue={editingCert?.cert_type ?? "first_aid"}
                  required
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--background)",
                    color: "var(--foreground)",
                  }}
                >
                  {CERT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </GlowTarget>
            <label className="block">
              <span
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Certificate Name
              </span>
              <input
                name="cert_name"
                type="text"
                defaultValue={editingCert?.cert_name ?? ""}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </label>
            <label className="block">
              <span
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Issue Date
              </span>
              <input
                name="issue_date"
                type="date"
                defaultValue={editingCert?.issue_date ?? ""}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </label>
            <GlowTarget
              id="compliance-input-cert-expiry"
              category="input"
              label="Certificate expiry date"
            >
              <label className="block">
                <span
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Expiry Date
                </span>
                <input
                  name="expiry_date"
                  type="date"
                  defaultValue={editingCert?.expiry_date ?? ""}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--background)",
                    color: "var(--foreground)",
                  }}
                />
              </label>
            </GlowTarget>
            <label className="block">
              <span
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Certificate Number
              </span>
              <input
                name="cert_number"
                type="text"
                defaultValue={editingCert?.cert_number ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </label>
            <label className="block">
              <span
                className="mb-1 block text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Provider / Issuer
              </span>
              <input
                name="provider"
                type="text"
                defaultValue={editingCert?.provider ?? ""}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              />
            </label>
          </div>
          <label className="block">
            <span
              className="mb-1 block text-xs font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Notes
            </span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingCert?.notes ?? ""}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
          </label>

          {error && (
            <p className="text-xs" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <GlowTarget
              id="compliance-btn-cert-submit"
              category="button"
              label="Save certificate"
            >
              <button
                type="submit"
                disabled={saving}
                className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {saving
                  ? "Saving…"
                  : editingCert
                    ? "Update Certificate"
                    : "Add Certificate"}
              </button>
            </GlowTarget>
            <button
              type="button"
              onClick={cancel}
              className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Certificate List */}
      {certificates.length === 0 && !showForm ? (
        <div className="py-8 text-center">
          <p
            className="text-2xl"
            style={{ color: "var(--empty-state-icon)" }}
            aria-hidden
          >
            📋
          </p>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No certificates on file.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {certificates.map((cert) => {
            const expiryDate = cert.expiry_date
              ? new Date(cert.expiry_date)
              : null;
            const isExpired = expiryDate ? expiryDate < today : false;
            const daysRemaining = expiryDate
              ? Math.ceil(
                  (expiryDate.getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : null;
            const status: "valid" | "expiring_soon" | "expired" | "missing" =
              !expiryDate
                ? "valid"
                : isExpired
                  ? "expired"
                  : daysRemaining !== null && daysRemaining <= 60
                    ? "expiring_soon"
                    : "valid";

            const typeLabel =
              CERT_TYPE_OPTIONS.find((o) => o.value === cert.cert_type)
                ?.label ?? cert.cert_type;

            return (
              <div
                key={cert.id}
                className="flex items-start justify-between rounded-lg border border-border p-3"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {cert.cert_name}
                    </p>
                    <ComplianceStatusPill
                      status={status}
                      daysRemaining={daysRemaining}
                      compact
                    />
                  </div>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {typeLabel}
                    {cert.provider && ` · ${cert.provider}`}
                    {cert.cert_number && ` · #${cert.cert_number}`}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Issued: {cert.issue_date}
                    {cert.expiry_date && ` · Expires: ${cert.expiry_date}`}
                  </p>
                </div>
                {canManage && (
                  <div className="ml-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(cert)}
                      className="active-push touch-target rounded px-2 py-1 text-xs"
                      style={{ color: "var(--primary)" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cert.id)}
                      disabled={deleting === cert.id}
                      className="active-push touch-target rounded px-2 py-1 text-xs"
                      style={{ color: "var(--destructive)" }}
                    >
                      {deleting === cert.id ? "…" : "Remove"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Required Certs Checklist ────────────────────────────────

const REQUIRED_CERTS: { type: StaffCertType; label: string }[] = [
  { type: "first_aid", label: "First Aid (HLTAID012) - 3yr expiry" },
  { type: "cpr", label: "CPR - annual expiry" },
  { type: "anaphylaxis", label: "Anaphylaxis Management - 3yr expiry" },
  { type: "asthma", label: "Asthma Management - 3yr expiry" },
  { type: "child_safety", label: "Child Safety (Geccko)" },
  {
    type: "mandatory_reporting",
    label: "Mandatory Reporting Training - 2yr expiry",
  },
  {
    type: "food_safety",
    label: "Food Safety Supervisor (SITXFSA005) - 5yr expiry",
  },
];

function RequiredCertsChecklist({
  certificates,
  today,
}: {
  certificates: StaffCertificate[];
  today: Date;
}) {
  return (
    <div
      className="rounded-lg border border-border p-3"
      style={{ backgroundColor: "var(--muted)" }}
    >
      <p
        className="mb-2 text-xs font-semibold"
        style={{ color: "var(--muted-foreground)" }}
      >
        Required Certificates
      </p>
      <div className="space-y-1.5">
        {REQUIRED_CERTS.map(({ type, label }) => {
          const cert = certificates.find(
            (c) => c.cert_type === type && !c.deleted_at,
          );
          let status: "valid" | "expiring_soon" | "expired" | "missing";
          if (!cert) {
            status = "missing";
          } else if (!cert.expiry_date) {
            status = "valid";
          } else {
            const expiry = new Date(cert.expiry_date);
            const days = Math.ceil(
              (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            status =
              days < 0 ? "expired" : days <= 60 ? "expiring_soon" : "valid";
          }

          return (
            <div key={type} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--foreground)" }}>
                {label}
              </span>
              <ComplianceStatusPill status={status} compact />
            </div>
          );
        })}
      </div>
    </div>
  );
}
