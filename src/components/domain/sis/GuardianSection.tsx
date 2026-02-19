// src/components/domain/sis/GuardianSection.tsx
//

"use client";

import type {
  CreateGuardianInput,
  UpdateGuardianInput,
} from "@/lib/actions/guardians";
import {
  createGuardian,
  removeGuardian,
  updateGuardian,
} from "@/lib/actions/guardians";
import { GUARDIAN_RELATIONSHIPS } from "@/lib/constants";
import type { GuardianWithUser } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ── Props ───────────────────────────────────────────────────

interface GuardianSectionProps {
  studentId: string;
  guardians: GuardianWithUser[];
  canManage: boolean;
}

// ── Component ───────────────────────────────────────────────

export function GuardianSection({
  studentId,
  guardians,
  canManage,
}: GuardianSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Add form state ──────────────────────────────────────────
  const [userId, setUserId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [pickupAuthorized, setPickupAuthorized] = useState(true);
  const [phone, setPhone] = useState("");
  const [mediaConsent, setMediaConsent] = useState(false);
  const [directoryConsent, setDirectoryConsent] = useState(false);

  function resetForm() {
    setUserId("");
    setRelationship("");
    setIsPrimary(false);
    setIsEmergencyContact(false);
    setPickupAuthorized(true);
    setPhone("");
    setMediaConsent(false);
    setDirectoryConsent(false);
    setError(null);
  }

  function openAdd() {
    setEditingId(null);
    resetForm();
    setShowAddForm(true);
  }

  function openEdit(guardian: GuardianWithUser) {
    setShowAddForm(false);
    setEditingId(guardian.id);
    setRelationship(guardian.relationship);
    setIsPrimary(guardian.is_primary);
    setIsEmergencyContact(guardian.is_emergency_contact);
    setPickupAuthorized(guardian.pickup_authorized);
    setPhone(guardian.phone ?? "");
    setMediaConsent(guardian.media_consent);
    setDirectoryConsent(guardian.directory_consent);
    setError(null);
  }

  function closeForm() {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  }

  async function handleAdd() {
    if (!userId.trim() || !relationship) {
      setError("User ID and relationship are required.");
      return;
    }

    const input: CreateGuardianInput = {
      user_id: userId.trim(),
      student_id: studentId,
      relationship,
      is_primary: isPrimary,
      is_emergency_contact: isEmergencyContact,
      pickup_authorized: pickupAuthorized,
      phone: phone.trim() || null,
      media_consent: mediaConsent,
      directory_consent: directoryConsent,
    };

    const result = await createGuardian(input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleUpdate(guardianId: string) {
    const input: UpdateGuardianInput = {
      relationship,
      is_primary: isPrimary,
      is_emergency_contact: isEmergencyContact,
      pickup_authorized: pickupAuthorized,
      phone: phone.trim() || null,
      media_consent: mediaConsent,
      directory_consent: directoryConsent,
    };

    const result = await updateGuardian(guardianId, input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleRemove(guardianId: string, guardianName: string) {
    if (
      !confirm(`Remove ${guardianName} as a guardian? This cannot be undone.`)
    ) {
      return;
    }

    const result = await removeGuardian(guardianId);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    startTransition(() => router.refresh());
  }

  // ── Inline form (shared between add and edit) ─────────────
  function renderForm(mode: "add" | "edit", guardianId?: string) {
    return (
      <div className="space-y-[var(--density-md)] rounded-md border border-primary/30 bg-primary/5 p-[var(--density-card-padding)]">
        {error && (
          <div className="rounded bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {mode === "add" && (
          <div>
            <label className="block text-xs font-medium text-foreground">
              User ID <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Paste the parent/guardian's user UUID"
              className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The parent must already have a WattleOS account. Use their UUID
              from the Users page.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-foreground">
              Relationship <span className="text-destructive">*</span>
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select...</option>
              {GUARDIAN_RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0412 345 678"
              className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-[var(--density-sm)] sm:grid-cols-3">
          {[
            {
              label: "Primary guardian",
              checked: isPrimary,
              onChange: setIsPrimary,
            },
            {
              label: "Emergency contact",
              checked: isEmergencyContact,
              onChange: setIsEmergencyContact,
            },
            {
              label: "Pickup authorized",
              checked: pickupAuthorized,
              onChange: setPickupAuthorized,
            },
            {
              label: "Media consent",
              checked: mediaConsent,
              onChange: setMediaConsent,
            },
            {
              label: "Directory consent",
              checked: directoryConsent,
              onChange: setDirectoryConsent,
            },
          ].map((toggle) => (
            <label
              key={toggle.label}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input
                type="checkbox"
                checked={toggle.checked}
                onChange={(e) => toggle.onChange(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              {toggle.label}
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              mode === "add" ? handleAdd() : handleUpdate(guardianId!)
            }
            disabled={isPending}
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending
              ? "Saving..."
              : mode === "add"
                ? "Add Guardian"
                : "Save Changes"}
          </button>
          <button
            onClick={closeForm}
            className="rounded border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between border-b border-border px-[var(--density-card-padding)] py-[var(--density-card-padding)]">
        <h2 className="font-medium text-foreground">Guardians</h2>
        {canManage && !showAddForm && !editingId && (
          <button
            onClick={openAdd}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            + Add Guardian
          </button>
        )}
      </div>
      <div className="p-[var(--density-card-padding)]">
        {guardians.length === 0 && !showAddForm ? (
          <p className="text-sm text-muted-foreground">No guardians linked.</p>
        ) : (
          <div className="space-y-[var(--density-sm)]">
            {guardians.map((guardian) => {
              if (editingId === guardian.id) {
                return (
                  <div key={guardian.id}>{renderForm("edit", guardian.id)}</div>
                );
              }

              return (
                <div
                  key={guardian.id}
                  className="flex items-center justify-between rounded-md border border-border/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {guardian.user?.first_name} {guardian.user?.last_name}
                      {guardian.is_primary && (
                        <span className="ml-2 text-xs font-normal text-primary">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {guardian.relationship}
                      {guardian.phone && ` · ${guardian.phone}`}
                      {guardian.user?.email && ` · ${guardian.user.email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {guardian.pickup_authorized && (
                        <span
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--success) 12%, transparent)",
                            color: "var(--success)",
                          }}
                        >
                          Pickup
                        </span>
                      )}
                      {guardian.media_consent && (
                        <span
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--info) 12%, transparent)",
                            color: "var(--info)",
                          }}
                        >
                          Media
                        </span>
                      )}
                      {guardian.is_emergency_contact && (
                        <span
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--warning) 12%, transparent)",
                            color: "var(--warning)",
                          }}
                        >
                          Emergency
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(guardian)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Edit"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            handleRemove(
                              guardian.id,
                              `${guardian.user?.first_name} ${guardian.user?.last_name}`,
                            )
                          }
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Remove"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddForm && renderForm("add")}
      </div>
    </section>
  );
}
