// src/components/domain/sis/GuardianSection.tsx
//
// ============================================================
// WattleOS V2 - Guardian Section (Client Component)
// ============================================================
// PART A FIX: Guardians can exist without a user account.
//
// CHANGES:
// 1. "Add Guardian" form now takes email + first name + last name
//    instead of a raw User UUID. This matches how schools actually
//    work - admins know the parent's name and email, not their UUID.
// 2. Display name falls back to guardian.first_name/last_name when
//    guardian.user is null (parent hasn't accepted invite yet).
// 3. Shows "Invited" / "Account linked" status so admins can see
//    which parents have completed onboarding.
// ============================================================

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

interface GuardianSectionProps {
  studentId: string;
  guardians: GuardianWithUser[];
  canManage: boolean;
}

const GUARDIAN_INPUT =
  "mt-1 block w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all";

// ============================================================
// Helper: resolve display name from guardian or linked user
// ============================================================
// WHY: When guardian.user is null (parent hasn't accepted invite),
// we use the name stored directly on the guardian record (from the
// enrollment form). Once they accept, user data takes precedence.
function guardianDisplayName(g: GuardianWithUser): string {
  if (g.user) {
    return [g.user.first_name, g.user.last_name].filter(Boolean).join(" ");
  }
  return [g.first_name, g.last_name].filter(Boolean).join(" ") || "Unknown";
}

function guardianDisplayEmail(g: GuardianWithUser): string | null {
  return g.user?.email ?? g.email ?? null;
}

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

  // Form state - add mode uses email + name instead of user UUID
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [pickupAuthorized, setPickupAuthorized] = useState(true);
  const [phone, setPhone] = useState("");
  const [mediaConsent, setMediaConsent] = useState(false);
  const [directoryConsent, setDirectoryConsent] = useState(false);

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRelationship("");
    setIsPrimary(false);
    setIsEmergencyContact(false);
    setPickupAuthorized(true);
    setPhone("");
    setMediaConsent(false);
    setDirectoryConsent(false);
    setError(null);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  async function handleAdd() {
    if (!email.trim() || !relationship) {
      setError("Email and relationship are required.");
      return;
    }
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    const input: CreateGuardianInput = {
      student_id: studentId,
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      relationship,
      is_primary: isPrimary,
      is_emergency_contact: isEmergencyContact,
      pickup_authorized: pickupAuthorized,
      phone: phone.trim() || null,
      media_consent: mediaConsent,
      directory_consent: directoryConsent,
    };

    const r = await createGuardian(input);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleUpdate(id: string) {
    const input: UpdateGuardianInput = {
      relationship,
      is_primary: isPrimary,
      is_emergency_contact: isEmergencyContact,
      pickup_authorized: pickupAuthorized,
      phone: phone.trim() || null,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      email: email.trim() || null,
      media_consent: mediaConsent,
      directory_consent: directoryConsent,
    };

    const r = await updateGuardian(id, input);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    closeForm();
    startTransition(() => router.refresh());
  }

  function startEditing(g: GuardianWithUser) {
    setShowAddForm(false);
    setEditingId(g.id);
    setEmail(guardianDisplayEmail(g) ?? "");
    setFirstName(g.user?.first_name ?? g.first_name ?? "");
    setLastName(g.user?.last_name ?? g.last_name ?? "");
    setRelationship(g.relationship);
    setIsPrimary(g.is_primary);
    setIsEmergencyContact(g.is_emergency_contact);
    setPickupAuthorized(g.pickup_authorized);
    setPhone(g.phone ?? "");
    setMediaConsent(g.media_consent);
    setDirectoryConsent(g.directory_consent);
    setError(null);
  }

  function renderForm(mode: "add" | "edit", guardianId?: string) {
    return (
      <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/20 p-[var(--density-card-padding)] animate-scale-in">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-bold text-destructive">
            {error}
          </div>
        )}

        {/* Identity fields - email + name instead of User UUID */}
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Sarah"
              className={GUARDIAN_INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Thompson"
              className={GUARDIAN_INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              className={GUARDIAN_INPUT}
            />
          </div>
        </div>

        {/* Relationship + Phone */}
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Relationship *
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className={GUARDIAN_INPUT}
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
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0412 345 678"
              className={GUARDIAN_INPUT}
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 bg-card/50 p-3 rounded-lg border border-border/50">
          {[
            {
              label: "Primary",
              checked: isPrimary,
              onChange: setIsPrimary,
            },
            {
              label: "Emergency",
              checked: isEmergencyContact,
              onChange: setIsEmergencyContact,
            },
            {
              label: "Auth Pickup",
              checked: pickupAuthorized,
              onChange: setPickupAuthorized,
            },
            {
              label: "Media Consent",
              checked: mediaConsent,
              onChange: setMediaConsent,
            },
            {
              label: "Directory",
              checked: directoryConsent,
              onChange: setDirectoryConsent,
            },
          ].map((t) => (
            <label
              key={t.label}
              className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={t.checked}
                onChange={(e) => t.onChange(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary transition-all"
              />
              <span className="group-hover:text-primary transition-colors">
                {t.label}
              </span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() =>
              mode === "add" ? handleAdd() : handleUpdate(guardianId!)
            }
            disabled={isPending}
            className="rounded-lg bg-primary px-6 h-10 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-600 active:scale-95 disabled:opacity-50"
          >
            {isPending
              ? "..."
              : mode === "add"
                ? "Add Guardian"
                : "Save Changes"}
          </button>
          <button
            onClick={closeForm}
            className="rounded-lg border border-border bg-background px-6 h-10 text-sm font-bold text-muted-foreground hover:bg-muted active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
        <h2 className="text-lg font-bold text-foreground">Guardians</h2>
        {canManage && !showAddForm && !editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setShowAddForm(true);
            }}
            className="text-sm font-bold text-primary hover:underline"
          >
            + Add Guardian
          </button>
        )}
      </div>

      <div className="p-6">
        {guardians.length === 0 && !showAddForm ? (
          <p className="text-sm font-medium text-muted-foreground italic">
            No guardians linked to this student record.
          </p>
        ) : (
          <div className="space-y-3">
            {guardians.map((g) =>
              editingId === g.id ? (
                <div key={g.id}>{renderForm("edit", g.id)}</div>
              ) : (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-4 shadow-sm hover:border-primary-100 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-base font-bold text-foreground">
                        {guardianDisplayName(g)}
                      </p>
                      {g.is_primary && (
                        <span className="status-badge bg-primary text-primary-foreground font-black uppercase text-[9px] px-1.5 status-badge-plain">
                          Primary
                        </span>
                      )}
                      {/* Account status indicator */}
                      {g.user_id ? (
                        <span className="status-badge bg-success/10 text-success font-bold text-[9px] px-1.5 status-badge-plain">
                          LINKED
                        </span>
                      ) : (
                        <span className="status-badge bg-warning/10 text-warning font-bold text-[9px] px-1.5 status-badge-plain">
                          INVITED
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                      {g.relationship}
                      {g.phone && ` • ${g.phone}`}
                      {guardianDisplayEmail(g) &&
                        ` • ${guardianDisplayEmail(g)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-1.5">
                      {g.pickup_authorized && (
                        <span className="status-badge bg-success/10 text-success font-bold text-[9px] px-2 py-0 status-badge-plain">
                          PICKUP
                        </span>
                      )}
                      {g.media_consent && (
                        <span className="status-badge bg-info/10 text-info font-bold text-[9px] px-2 py-0 status-badge-plain">
                          MEDIA
                        </span>
                      )}
                      {g.is_emergency_contact && (
                        <span className="status-badge bg-warning/10 text-warning font-bold text-[9px] px-2 py-0 status-badge-plain">
                          EMERGENCY
                        </span>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex gap-1 border-l border-border pl-4">
                        <button
                          onClick={() => startEditing(g)}
                          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
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
                              strokeWidth={2.5}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            const name = guardianDisplayName(g);
                            if (confirm(`Remove ${name}?`)) {
                              const r = await removeGuardian(g.id);
                              if (r.error) setError(r.error.message);
                              else startTransition(() => router.refresh());
                            }
                          }}
                          className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
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
                              strokeWidth={2.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
        {showAddForm && renderForm("add")}
      </div>
    </section>
  );
}