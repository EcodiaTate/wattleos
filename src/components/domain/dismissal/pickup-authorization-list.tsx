"use client";

// src/components/domain/dismissal/pickup-authorization-list.tsx
//
// List and manage authorized pickup persons for a student.

import { useState } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  createPickupAuthorization,
  updatePickupAuthorization,
  revokePickupAuthorization,
} from "@/lib/actions/dismissal";
import type { PickupAuthorization } from "@/types/domain";

interface PickupAuthorizationListProps {
  studentId: string;
  initialAuthorizations: PickupAuthorization[];
  canManage: boolean;
}

interface AuthFormState {
  authorized_name: string;
  relationship: string;
  phone: string;
  is_permanent: boolean;
  valid_from: string;
  valid_until: string;
  id_verified: boolean;
  notes: string;
}

const emptyForm = (): AuthFormState => ({
  authorized_name: "",
  relationship: "",
  phone: "",
  is_permanent: true,
  valid_from: "",
  valid_until: "",
  id_verified: false,
  notes: "",
});

export function PickupAuthorizationList({
  studentId,
  initialAuthorizations,
  canManage,
}: PickupAuthorizationListProps) {
  const haptics = useHaptics();
  const [authorizations, setAuthorizations] = useState(initialAuthorizations);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<AuthFormState>(emptyForm());
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  function openCreate() {
    haptics.selection();
    setForm(emptyForm());
    setEditId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(auth: PickupAuthorization) {
    haptics.selection();
    setForm({
      authorized_name: auth.authorized_name,
      relationship:    auth.relationship ?? "",
      phone:           auth.phone ?? "",
      is_permanent:    auth.is_permanent,
      valid_from:      auth.valid_from ?? "",
      valid_until:     auth.valid_until ?? "",
      id_verified:     auth.id_verified,
      notes:           auth.notes ?? "",
    });
    setEditId(auth.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    haptics.impact("medium");

    const payload = {
      student_id:       studentId,
      authorized_name:  form.authorized_name,
      relationship:     form.relationship || null,
      phone:            form.phone || null,
      photo_url:        null,
      id_verified:      form.id_verified,
      is_permanent:     form.is_permanent,
      valid_from:       form.is_permanent ? null : (form.valid_from || null),
      valid_until:      form.is_permanent ? null : (form.valid_until || null),
      notes:            form.notes || null,
    };

    const result = editId
      ? await updatePickupAuthorization(editId, payload)
      : await createPickupAuthorization(payload);

    if (result.error) {
      haptics.error();
      setError(result.error.message);
    } else {
      haptics.success();
      if (result.data) {
        const saved = result.data;
        if (editId) {
          setAuthorizations((prev) =>
            prev.map((a) => (a.id === editId ? saved : a)),
          );
        } else {
          setAuthorizations((prev) => [saved, ...prev]);
        }
      }
      setShowForm(false);
      setEditId(null);
    }
    setLoading(false);
  }

  async function handleRevoke(id: string, name: string) {
    if (!confirm(`Remove ${name} as an authorized pickup person? This cannot be undone.`)) return;
    setRevokingId(id);
    haptics.impact("heavy");
    const result = await revokePickupAuthorization(id);
    if (result.error) {
      setError(result.error.message);
    } else {
      haptics.success();
      setAuthorizations((prev) => prev.filter((a) => a.id !== id));
    }
    setRevokingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
          Authorised pickup persons
        </h3>
        {canManage && !showForm && (
          <button
            type="button"
            className="touch-target rounded-xl px-3 py-1.5 text-sm font-medium active-push"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={openCreate}
          >
            + Add person
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm p-3 rounded-lg" style={{ color: "var(--destructive)", backgroundColor: "color-mix(in srgb, var(--destructive) 10%, transparent)" }}>
          {error}
        </p>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border p-4 space-y-3"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <h4 className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
            {editId ? "Edit authorised person" : "Add authorised person"}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Full name *
              </label>
              <input
                type="text"
                required
                maxLength={200}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                placeholder="e.g. Sarah Johnson"
                value={form.authorized_name}
                onChange={(e) => setForm({ ...form, authorized_name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Relationship
              </label>
              <input
                type="text"
                maxLength={100}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                placeholder="Grandparent, Aunt…"
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Phone
              </label>
              <input
                type="tel"
                maxLength={30}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--foreground)" }}>
              <input
                type="checkbox"
                checked={form.id_verified}
                onChange={(e) => setForm({ ...form, id_verified: e.target.checked })}
              />
              ID verified
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--foreground)" }}>
              <input
                type="checkbox"
                checked={form.is_permanent}
                onChange={(e) => setForm({ ...form, is_permanent: e.target.checked })}
              />
              Permanent authorization
            </label>
          </div>

          {!form.is_permanent && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Valid from
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Valid until
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
              Notes
            </label>
            <input
              type="text"
              maxLength={1000}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
              placeholder="e.g. Will show student ID"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 touch-target rounded-lg px-3 py-2 text-sm font-medium active-push"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Saving…" : editId ? "Update" : "Add person"}
            </button>
            <button
              type="button"
              className="touch-target rounded-lg border border-border px-3 py-2 text-sm active-push"
              style={{ color: "var(--muted-foreground)" }}
              onClick={() => { setShowForm(false); setEditId(null); setError(null); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {authorizations.length === 0 && !showForm ? (
        <p className="text-sm py-6 text-center" style={{ color: "var(--muted-foreground)" }}>
          No authorized pickup persons added yet.
        </p>
      ) : (
        <div className="space-y-2">
          {authorizations.map((auth) => {
            const isExpired =
              !auth.is_permanent &&
              auth.valid_until &&
              new Date(auth.valid_until) < new Date();

            return (
              <div
                key={auth.id}
                className="rounded-xl border border-border p-3 flex items-start justify-between gap-3"
                style={{
                  backgroundColor: "var(--background)",
                  opacity: isExpired ? 0.6 : 1,
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                      👤 {auth.authorized_name}
                    </span>
                    {auth.id_verified && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "var(--dismissal-confirmed-bg)",
                          color: "var(--dismissal-confirmed-fg)",
                        }}
                      >
                        ID verified
                      </span>
                    )}
                    {isExpired && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "var(--dismissal-exception-bg)",
                          color: "var(--dismissal-exception-fg)",
                        }}
                      >
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {auth.relationship && `${auth.relationship} · `}
                    {auth.phone && `${auth.phone} · `}
                    {auth.is_permanent
                      ? "Permanent"
                      : `${auth.valid_from ?? "?"} – ${auth.valid_until ?? "?"}`}
                  </p>
                  {auth.notes && (
                    <p className="text-xs italic mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {auth.notes}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      className="touch-target text-xs rounded-lg border border-border px-2 py-1 active-push"
                      style={{ color: "var(--foreground)" }}
                      onClick={() => openEdit(auth)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={revokingId === auth.id}
                      className="touch-target text-xs rounded-lg border border-border px-2 py-1 active-push"
                      style={{ color: "var(--destructive)", opacity: revokingId === auth.id ? 0.5 : 1 }}
                      onClick={() => handleRevoke(auth.id, auth.authorized_name)}
                    >
                      {revokingId === auth.id ? "…" : "Remove"}
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
