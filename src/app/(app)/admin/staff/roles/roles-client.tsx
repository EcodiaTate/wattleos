// src/app/(app)/admin/staff/roles/roles-client.tsx
//
// ============================================================
// WattleOS V2 - Roles List (Interactive)
// ============================================================
// Client component. Renders system and custom role cards,
// and provides an inline form for creating custom roles with
// permission selections grouped by module.
// ============================================================

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRole, deleteRole } from "@/lib/actions/staff-actions";
import { PermissionModules, Permissions } from "@/lib/constants/permissions";
import type { RoleWithCounts } from "@/types/domain";

// ============================================================
// Role Card
// ============================================================

function RoleCard({
  role,
  onDelete,
  isDeleting,
}: {
  role: RoleWithCounts;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {role.name}
          </span>
          {role.is_system && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              System
            </span>
          )}
        </div>
        {role.description && (
          <p className="text-xs text-muted-foreground">{role.description}</p>
        )}
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>{role.member_count} member{role.member_count !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{role.permission_count} permission{role.permission_count !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/admin/staff/roles/${role.id}`}
          className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {role.is_system ? "View" : "Edit"}
        </Link>

        {!role.is_system && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDelete(role.id)}
            className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Create Role Form
// ============================================================

function CreateRoleForm({ onSuccess }: { onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const allModules = Object.entries(PermissionModules);

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleModule(perms: readonly string[]) {
    const allSelected = perms.every((p) => selectedPerms.has(p));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        perms.forEach((p) => next.delete(p));
      } else {
        perms.forEach((p) => next.add(p));
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim();

    if (!name) {
      setError("Role name is required.");
      return;
    }

    startTransition(async () => {
      const result = await createRole({
        name,
        description: description || undefined,
        permissionKeys: Array.from(selectedPerms),
      });

      if (result.error) {
        setError(result.error?.message ?? null);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Create Custom Role
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name + description */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Role Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Room Leader"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <input
              type="text"
              name="description"
              placeholder="Optional summary"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Permission picker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Permissions
            </label>
            <span className="text-xs text-muted-foreground">
              {selectedPerms.size} selected
            </span>
          </div>

          <div className="space-y-3">
            {allModules.map(([moduleKey, module]) => {
              const perms = module.permissions as readonly string[];
              const allSelected = perms.every((p) => selectedPerms.has(p));
              const someSelected = perms.some((p) => selectedPerms.has(p));

              return (
                <div
                  key={moduleKey}
                  className="rounded-md border border-border bg-background p-3"
                >
                  {/* Module header */}
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleModule(perms)}
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                        allSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : someSelected
                            ? "border-primary/50 bg-primary/20 text-primary"
                            : "border-border bg-background"
                      }`}
                    >
                      {allSelected ? "✓" : someSelected ? "−" : ""}
                    </button>
                    <span className="text-xs font-semibold text-foreground">
                      {module.label}
                    </span>
                  </div>

                  {/* Permission toggles */}
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {perms.map((permKey) => {
                      const selected = selectedPerms.has(permKey);
                      const label = permKey
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());

                      return (
                        <button
                          key={permKey}
                          type="button"
                          onClick={() => togglePerm(permKey)}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                            selected
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border"
                            }`}
                          >
                            {selected && "✓"}
                          </span>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onSuccess}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create Role"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

interface RolesClientProps {
  systemRoles: RoleWithCounts[];
  customRoles: RoleWithCounts[];
}

export function RolesClient({ systemRoles, customRoles }: RolesClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(roleId: string) {
    const role = customRoles.find((r) => r.id === roleId);
    if (
      !window.confirm(
        `Delete the "${role?.name ?? "role"}" role? This cannot be undone.`,
      )
    )
      return;

    setDeleteError(null);
    setDeletingId(roleId);

    startTransition(async () => {
      const result = await deleteRole(roleId);
      setDeletingId(null);

      if (result.error) {
        setDeleteError(result.error?.message ?? null);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {deleteError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateRoleForm
          onSuccess={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {/* System roles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">System Roles</h2>
        <div className="space-y-2">
          {systemRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onDelete={handleDelete}
              isDeleting={deletingId === role.id}
            />
          ))}
        </div>
      </section>

      {/* Custom roles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Custom Roles
          </h2>
          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              + New Role
            </button>
          )}
        </div>

        {customRoles.length === 0 && !showCreate ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p
              className="mx-auto mb-2 text-2xl"
              style={{ color: "var(--empty-state-icon)" }}
            >
              🔑
            </p>
            <p className="text-sm text-muted-foreground">
              No custom roles yet. Create one to give specific staff members a
              tailored set of permissions.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onDelete={handleDelete}
                isDeleting={deletingId === role.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
