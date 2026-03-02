// src/app/(app)/admin/staff/roles/[roleId]/role-editor-client.tsx
//
// ============================================================
// WattleOS V2 - Role Editor (Interactive)
// ============================================================
// Client component. Shows three sections:
//   1. Role details (name/description - editable for custom only)
//   2. Permission toggles grouped by module
//   3. Members assigned to this role (with links to profiles)
//
// System roles: name/description are locked. Permissions CAN
// be toggled (to restrict a default role for the school).
// Custom roles: fully editable.
// ============================================================

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateRole } from "@/lib/actions/staff-actions";
import { PermissionModules } from "@/lib/constants/permissions";
import type { RoleDetail } from "@/types/domain";

// ============================================================
// Types
// ============================================================

interface RoleEditorClientProps {
  role: RoleDetail;
}

// ============================================================
// Main Component
// ============================================================

export function RoleEditorClient({ role }: RoleEditorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Name / description (custom roles only)
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");

  // Permission selection
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    new Set(role.permission_keys),
  );

  const allModules = Object.entries(PermissionModules);

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSaved(false);
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
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateRole(role.id, {
        ...(!role.is_system
          ? { name, description: description || undefined }
          : {}),
        permissionKeys: Array.from(selectedPerms),
      });

      if (result.error) {
        setError(result.error?.message ?? null);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  // Check if anything changed
  const permsDirty =
    selectedPerms.size !== role.permission_keys.length ||
    role.permission_keys.some((k) => !selectedPerms.has(k));
  const metaDirty =
    !role.is_system &&
    (name !== role.name || description !== (role.description ?? ""));
  const isDirty = permsDirty || metaDirty;

  return (
    <div className="space-y-8">
      {/* ── Role Details ──────────────────────────────────── */}
      {!role.is_system && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Role Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSaved(false);
                }}
                placeholder="Optional summary"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Permission Toggles ────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Permissions</h2>
          <span className="text-xs text-muted-foreground">
            {selectedPerms.size} of{" "}
            {allModules.reduce((n, [, m]) => n + m.permissions.length, 0)}{" "}
            selected
          </span>
        </div>

        <div className="space-y-3">
          {allModules.map(([moduleKey, module]) => {
            const perms = module.permissions as readonly string[];
            const allSelected = perms.every((p) => selectedPerms.has(p));
            const someSelected =
              !allSelected && perms.some((p) => selectedPerms.has(p));

            return (
              <div
                key={moduleKey}
                className="rounded-md border border-border bg-card p-4"
              >
                {/* Module header */}
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleModule(perms)}
                    aria-label={`Toggle all ${module.label} permissions`}
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-xs transition-colors ${
                      allSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : someSelected
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-background"
                    }`}
                  >
                    {allSelected ? "✓" : someSelected ? "−" : ""}
                  </button>
                  <span className="text-xs font-semibold text-foreground">
                    {module.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({perms.filter((p) => selectedPerms.has(p)).length}/
                    {perms.length})
                  </span>
                </div>

                {/* Individual permissions */}
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {perms.map((permKey) => {
                    const active = selectedPerms.has(permKey);
                    const label = permKey
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());

                    return (
                      <button
                        key={permKey}
                        type="button"
                        onClick={() => togglePerm(permKey)}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {active && "✓"}
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
      </section>

      {/* ── Save ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-success">Changes saved.</p>}
        {!error && !saved && <span />}

        <button
          type="button"
          disabled={isPending || !isDirty}
          onClick={handleSave}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ── Members ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Members ({role.members.length})
        </h2>

        {role.members.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No staff members have this role yet.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {role.members.map((m) => {
              const displayName =
                m.first_name || m.last_name
                  ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
                  : m.email;
              const initials =
                m.first_name && m.last_name
                  ? `${m.first_name[0]}${m.last_name[0]}`.toUpperCase()
                  : m.email.slice(0, 2).toUpperCase();

              return (
                <Link
                  key={m.user_id}
                  href={`/admin/staff/${m.user_id}`}
                  className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 last:border-b-0 hover:bg-muted/40"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
