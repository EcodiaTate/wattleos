// src/components/domain/sis/EmergencyContactSection.tsx
//
// ============================================================
// WattleOS V2 - Emergency Contact Management Section
// ============================================================
// 'use client' - inline add/edit/remove for emergency contacts.
//
// Why separate from guardians: Not all emergency contacts are
// system users (e.g., a neighbour or family friend). These are
// plain contact records, not linked to auth accounts.
// ============================================================

"use client";

import type {
  CreateEmergencyContactInput,
  UpdateEmergencyContactInput,
} from "@/lib/actions/emergency-contacts";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  updateEmergencyContact,
} from "@/lib/actions/emergency-contacts";
import type { EmergencyContact } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ── Props ───────────────────────────────────────────────────

interface EmergencyContactSectionProps {
  studentId: string;
  contacts: EmergencyContact[];
  canManage: boolean;
}

// ── Component ───────────────────────────────────────────────

export function EmergencyContactSection({
  studentId,
  contacts,
  canManage,
}: EmergencyContactSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phonePrimary, setPhonePrimary] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [email, setEmail] = useState("");
  const [priorityOrder, setPriorityOrder] = useState(contacts.length + 1);
  const [notes, setNotes] = useState("");

  function resetForm() {
    setName("");
    setRelationship("");
    setPhonePrimary("");
    setPhoneSecondary("");
    setEmail("");
    setPriorityOrder(contacts.length + 1);
    setNotes("");
    setError(null);
  }

  function openAdd() {
    setEditingId(null);
    resetForm();
    setPriorityOrder(contacts.length + 1);
    setShowAddForm(true);
  }

  function openEdit(contact: EmergencyContact) {
    setShowAddForm(false);
    setEditingId(contact.id);
    setName(contact.name);
    setRelationship(contact.relationship);
    setPhonePrimary(contact.phone_primary);
    setPhoneSecondary(contact.phone_secondary ?? "");
    setEmail(contact.email ?? "");
    setPriorityOrder(contact.priority_order);
    setNotes(contact.notes ?? "");
    setError(null);
  }

  function closeForm() {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  }

  async function handleAdd() {
    if (!name.trim() || !relationship.trim() || !phonePrimary.trim()) {
      setError("Name, relationship, and primary phone are required.");
      return;
    }

    const input: CreateEmergencyContactInput = {
      student_id: studentId,
      name: name.trim(),
      relationship: relationship.trim(),
      phone_primary: phonePrimary.trim(),
      phone_secondary: phoneSecondary.trim() || null,
      email: email.trim() || null,
      priority_order: priorityOrder,
      notes: notes.trim() || null,
    };

    const result = await createEmergencyContact(input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleUpdate(contactId: string) {
    const input: UpdateEmergencyContactInput = {
      name: name.trim(),
      relationship: relationship.trim(),
      phone_primary: phonePrimary.trim(),
      phone_secondary: phoneSecondary.trim() || null,
      email: email.trim() || null,
      priority_order: priorityOrder,
      notes: notes.trim() || null,
    };

    const result = await updateEmergencyContact(contactId, input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete(contactId: string, contactName: string) {
    if (!confirm(`Delete emergency contact "${contactName}"?`)) return;

    const result = await deleteEmergencyContact(contactId);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    startTransition(() => router.refresh());
  }

  // ── Inline form ─────────────────────────────────────────
  function renderForm(mode: "add" | "edit", contactId?: string) {
    return (
      <div className="space-y-4 rounded-md border border-amber-200 bg-amber-50/50 p-4">
        {error && (
          <div className="rounded bg-red-50 p-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Relationship <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Grandmother, Neighbour"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Priority
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={priorityOrder}
              onChange={(e) => setPriorityOrder(Number(e.target.value))}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-gray-500">1 = first to call</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Primary Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phonePrimary}
              onChange={(e) => setPhonePrimary(e.target.value)}
              placeholder="e.g. 0412 345 678"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Secondary Phone
            </label>
            <input
              type="tel"
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
              placeholder="Optional"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Only available after 3pm"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              mode === "add" ? handleAdd() : handleUpdate(contactId!)
            }
            disabled={isPending}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending
              ? "Saving..."
              : mode === "add"
                ? "Add Contact"
                : "Save Changes"}
          </button>
          <button
            onClick={closeForm}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-medium text-gray-900">
          Emergency Contacts
        </h2>
        {canManage && !showAddForm && !editingId && (
          <button
            onClick={openAdd}
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            + Add Contact
          </button>
        )}
      </div>
      <div className="px-6 py-4">
        {contacts.length === 0 && !showAddForm ? (
          <p className="text-sm text-gray-500">
            No emergency contacts recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => {
              if (editingId === contact.id) {
                return (
                  <div key={contact.id}>{renderForm("edit", contact.id)}</div>
                );
              }

              return (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                      {contact.priority_order}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {contact.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {contact.relationship} · {contact.phone_primary}
                        {contact.phone_secondary &&
                          ` / ${contact.phone_secondary}`}
                        {contact.email && ` · ${contact.email}`}
                      </p>
                      {contact.notes && (
                        <p className="text-xs text-gray-400">{contact.notes}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(contact)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
                        onClick={() => handleDelete(contact.id, contact.name)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
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
              );
            })}
          </div>
        )}

        {showAddForm && renderForm("add")}
      </div>
    </section>
  );
}
