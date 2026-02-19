// src/components/domain/timesheets/employee-mapping-client.tsx
//
// ============================================================
// WattleOS V2 - Employee Mapping Client Component
// ============================================================
// Interactive management of user ↔ external employee ID
// mappings. Shows two states:
//   • Mapped staff (with external ID, edit/deactivate)
//   • Unmapped staff (with "Link" action)
//
// WHY 'use client': Add/edit/deactivate are mutations requiring
// form state and optimistic UI updates.
// ============================================================

"use client";

import {
  createEmployeeMapping,
  removeEmployeeMapping,
  updateEmployeeMapping,
} from "@/lib/actions/payroll-integration";
import type { EmployeeMapping, PayrollProvider } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ============================================================
// Props
// ============================================================

interface EmployeeMappingClientProps {
  mappings: Array<EmployeeMapping & { user_name: string; user_email: string }>;
  staff: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
  provider: PayrollProvider | null;
}

// ============================================================
// Component
// ============================================================

export function EmployeeMappingClient({
  mappings,
  staff,
  provider,
}: EmployeeMappingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Add form state
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [externalId, setExternalId] = useState("");
  const [externalName, setExternalName] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExternalId, setEditExternalId] = useState("");
  const [editExternalName, setEditExternalName] = useState("");

  // Feedback
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Mapped user IDs ────────────────────────────────────
  const mappedUserIds = new Set(
    mappings.filter((m) => m.is_active).map((m) => m.user_id),
  );
  const unmappedStaff = staff.filter((s) => !mappedUserIds.has(s.id));
  const activeMappings = mappings.filter((m) => m.is_active);
  const inactiveMappings = mappings.filter((m) => !m.is_active);

  // ── Create mapping ─────────────────────────────────────
  const handleCreate = async () => {
    if (!addingUserId || !externalId.trim() || !provider) return;
    setMessage(null);

    const result = await createEmployeeMapping({
      userId: addingUserId,
      provider,
      externalId: externalId.trim(),
      externalName: externalName.trim() || undefined,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Employee linked." });
      setAddingUserId(null);
      setExternalId("");
      setExternalName("");
      startTransition(() => router.refresh());
    }
  };

  // ── Update mapping ─────────────────────────────────────
  const handleUpdate = async (mappingId: string) => {
    setMessage(null);

    const result = await updateEmployeeMapping(mappingId, {
      externalId: editExternalId.trim() || undefined,
      externalName: editExternalName.trim() || undefined,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Mapping updated." });
      setEditingId(null);
      startTransition(() => router.refresh());
    }
  };

  // ── Deactivate mapping ─────────────────────────────────
  const handleDeactivate = async (mappingId: string) => {
    if (
      !confirm(
        "Deactivate this mapping? The staff member will no longer sync to payroll.",
      )
    ) {
      return;
    }
    setMessage(null);

    const result = await removeEmployeeMapping(mappingId);
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Mapping deactivated." });
      startTransition(() => router.refresh());
    }
  };

  // ── Reactivate mapping ─────────────────────────────────
  const handleReactivate = async (mappingId: string) => {
    setMessage(null);
    const result = await updateEmployeeMapping(mappingId, { isActive: true });
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
    } else {
      setMessage({ type: "success", text: "Mapping reactivated." });
      startTransition(() => router.refresh());
    }
  };

  const providerLabel =
    provider === "xero" ? "Xero" : provider === "keypay" ? "KeyPay" : "Payroll";

  return (
    <div className="space-y-8">
      {/* Feedback */}
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Active Mappings */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900">
          Linked Staff ({activeMappings.length})
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          These staff members are connected to {providerLabel} for payroll sync.
        </p>

        {activeMappings.length === 0 ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No staff linked yet. Use the section below to map staff to their{" "}
            {providerLabel} employee IDs.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {activeMappings.map((mapping) => {
              const isEditing = editingId === mapping.id;

              return (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
                        {mapping.user_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {mapping.user_name}
                      </div>
                      <input
                        type="text"
                        value={editExternalId}
                        onChange={(e) => setEditExternalId(e.target.value)}
                        placeholder="External ID"
                        className="w-40 rounded border border-gray-300 px-2 py-1 text-sm focus:border-ring focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editExternalName}
                        onChange={(e) => setEditExternalName(e.target.value)}
                        placeholder="External name (optional)"
                        className="w-48 rounded border border-gray-300 px-2 py-1 text-sm focus:border-ring focus:outline-none"
                      />
                      <button
                        onClick={() => handleUpdate(mapping.id)}
                        disabled={isPending}
                        className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
                          {mapping.user_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {mapping.user_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {mapping.user_email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-mono text-gray-700">
                            {mapping.external_id}
                          </p>
                          {mapping.external_name && (
                            <p className="text-xs text-gray-400">
                              {mapping.external_name}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(mapping.id);
                              setEditExternalId(mapping.external_id);
                              setEditExternalName(mapping.external_name ?? "");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeactivate(mapping.id)}
                            disabled={isPending}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unmapped Staff */}
      {provider && unmappedStaff.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900">
            Unmapped Staff ({unmappedStaff.length})
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            These staff members have not been linked to a {providerLabel}{" "}
            employee record.
          </p>

          <div className="mt-4 space-y-2">
            {unmappedStaff.map((user) => {
              const isAdding = addingUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                      {user.first_name?.[0] ?? ""}
                      {user.last_name?.[0] ?? ""}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  {isAdding ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={externalId}
                        onChange={(e) => setExternalId(e.target.value)}
                        placeholder={`${providerLabel} Employee ID`}
                        className="w-40 rounded border border-gray-300 px-2 py-1 text-sm focus:border-ring focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        placeholder="Name in payroll (optional)"
                        className="w-48 rounded border border-gray-300 px-2 py-1 text-sm focus:border-ring focus:outline-none"
                      />
                      <button
                        onClick={handleCreate}
                        disabled={isPending || !externalId.trim()}
                        className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        Link
                      </button>
                      <button
                        onClick={() => {
                          setAddingUserId(null);
                          setExternalId("");
                          setExternalName("");
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingUserId(user.id)}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
                    >
                      Link to {providerLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Inactive Mappings */}
      {inactiveMappings.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500">
            Inactive Mappings ({inactiveMappings.length})
          </h2>

          <div className="mt-3 space-y-2">
            {inactiveMappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-500">
                    {mapping.user_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {mapping.user_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {mapping.external_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleReactivate(mapping.id)}
                  disabled={isPending}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
