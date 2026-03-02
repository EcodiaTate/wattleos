// src/components/domain/attendance/pickup-authorization-section.tsx
//
// ============================================================
// WattleOS V2 - Pickup Authorization Section
// ============================================================
// Client component embedded in the student detail page.
// Manages who is authorized to pick up this student.
//
// WHY client component: Inline add/edit form with state
// management. The student detail page is a server component,
// so this section is a client island.
// ============================================================

"use client";

import {
  createPickupAuthorization,
  deletePickupAuthorization,
  listPickupAuthorizations,
} from "@/lib/actions/pickup-authorizations";
import type { PickupAuthorization } from "@/types/domain";
import { useEffect, useState, useTransition } from "react";

interface PickupAuthorizationSectionProps {
  studentId: string;
}

export function PickupAuthorizationSection({
  studentId,
}: PickupAuthorizationSectionProps) {
  const [authorizations, setAuthorizations] = useState<PickupAuthorization[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formName, setFormName] = useState("");
  const [formRelationship, setFormRelationship] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIsPermanent, setFormIsPermanent] = useState(true);
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Load authorizations
  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await listPickupAuthorizations(studentId);
      if (result.data) {
        setAuthorizations(result.data);
      }
      setLoading(false);
    }
    load();
  }, [studentId]);

  // Reset form
  function resetForm() {
    setFormName("");
    setFormRelationship("");
    setFormPhone("");
    setFormIsPermanent(true);
    setFormValidFrom("");
    setFormValidUntil("");
    setFormError(null);
    setShowForm(false);
  }

  // Create
  async function handleCreate() {
    if (!formName.trim()) {
      setFormError("Name is required.");
      return;
    }

    setFormError(null);

    startTransition(async () => {
      const result = await createPickupAuthorization({
        studentId,
        authorizedName: formName.trim(),
        relationship: formRelationship.trim() || undefined,
        phone: formPhone.trim() || undefined,
        isPermanent: formIsPermanent,
        validFrom: formIsPermanent ? undefined : formValidFrom || undefined,
        validUntil: formIsPermanent ? undefined : formValidUntil || undefined,
      });

      if (result.error) {
        setFormError(result.error.message);
        return;
      }

      if (result.data) {
        setAuthorizations((prev) => [...prev, result.data!]);
        resetForm();
      }
    });
  }

  // Delete
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from pickup authorizations?`)) return;

    startTransition(async () => {
      const result = await deletePickupAuthorization(id);
      if (result.data?.success) {
        setAuthorizations((prev) => prev.filter((a) => a.id !== id));
      }
    });
  }

  // Check if authorization is currently valid
  function isValid(auth: PickupAuthorization): boolean {
    if (auth.is_permanent) return true;
    const now = new Date().toISOString().split("T")[0];
    if (auth.valid_from && now < auth.valid_from) return false;
    if (auth.valid_until && now > auth.valid_until) return false;
    return true;
  }

  return (
    <section className="rounded-lg border border-border bg-background shadow-sm">
      <div className="flex items-center justify-between border-bborder-border px-6 py-4">
        <h2 className="text-lg font-medium text-foreground">
          Pickup Authorizations
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary"
          >
            Add Person
          </button>
        )}
      </div>

      <div className="px-6 py-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-amber-600" />
          </div>
        )}

        {/* Empty state */}
        {!loading && authorizations.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">
            No pickup authorizations. Guardians with pickup permission are shown
            in the Guardians section above.
          </p>
        )}

        {/* List */}
        {!loading && authorizations.length > 0 && (
          <div className="space-y-3">
            {authorizations.map((auth) => {
              const valid = isValid(auth);
              return (
                <div
                  key={auth.id}
                  className={`flex items-center justify-between rounded-md border p-3 ${
                    valid ? "border-border" : "border-border opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {auth.authorized_name}
                      </p>
                      {auth.is_permanent ? (
                        <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          Permanent
                        </span>
                      ) : (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          Temporary
                        </span>
                      )}
                      {!valid && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {auth.relationship && `${auth.relationship}`}
                      {auth.relationship && auth.phone && " · "}
                      {auth.phone && auth.phone}
                    </p>
                    {!auth.is_permanent &&
                      (auth.valid_from || auth.valid_until) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {auth.valid_from && `From ${auth.valid_from}`}
                          {auth.valid_from && auth.valid_until && " "}
                          {auth.valid_until && `Until ${auth.valid_until}`}
                        </p>
                      )}
                  </div>
                  <button
                    onClick={() => handleDelete(auth.id, auth.authorized_name)}
                    disabled={isPending}
                    className="flex-shrink-0 text-xs font-medium text-destructive hover:text-destructive disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="mt-3 space-y-3 rounded-lg border border-primary/30 bg-primary/10/50 p-[var(--density-card-padding)]">
            <h3 className="text-sm font-medium text-foreground">
              Add Authorized Person
            </h3>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-foreground">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Sarah Johnson"
                  className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground">
                  Relationship
                </label>
                <input
                  type="text"
                  value={formRelationship}
                  onChange={(e) => setFormRelationship(e.target.value)}
                  placeholder="e.g., Grandmother, Nanny"
                  className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g., 0412 345 678"
                  className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formIsPermanent}
                    onChange={(e) => setFormIsPermanent(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  Permanent authorization
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formIsPermanent
                    ? "Can pick up any time."
                    : "Set a date range below."}
                </p>
              </div>
            </div>

            {/* Date range for temporary auth */}
            {!formIsPermanent && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add"}
              </button>
              <button
                onClick={resetForm}
                disabled={isPending}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
