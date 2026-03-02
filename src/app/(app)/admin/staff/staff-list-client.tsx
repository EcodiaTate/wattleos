// src/app/(app)/admin/staff/staff-list-client.tsx
//
// ============================================================
// WattleOS V2 - Staff List (Interactive)
// ============================================================
// Client component. Search/filter table of staff members.
// Handles the invite sheet, role filter, status filter, and
// row-level actions (suspend, reactivate, remove).
//
// WHY client: Search, filter, and inline actions need
// interactivity. Page.tsx handles the server fetch; this
// component just manages the interactive layer.
// ============================================================

"use client";

import { useState, useTransition, useOptimistic } from "react";
import Link from "next/link";
import {
  suspendStaffMember,
  reactivateStaffMember,
  removeStaffMember,
} from "@/lib/actions/staff-actions";
import type { RoleWithCounts, StaffMember, StaffStatus } from "@/types/domain";
import { InviteStaffSheet } from "./invite-staff-sheet";

// ============================================================
// Sub-components
// ============================================================

function StatusBadge({ status }: { status: StaffStatus }) {
  const styles: Record<StaffStatus, string> = {
    active: "bg-success/15 text-success",
    invited: "bg-info/15 text-info",
    suspended: "bg-destructive/15 text-destructive",
  };
  const labels: Record<StaffStatus, string> = {
    active: "Active",
    invited: "Invited",
    suspended: "Suspended",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function AvatarInitials({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const initials =
    firstName && lastName
      ? `${firstName[0]}${lastName[0]}`.toUpperCase()
      : email.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: "var(--primary)" }}
    >
      {initials}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

interface StaffListClientProps {
  initialStaff: StaffMember[];
  roles: RoleWithCounts[];
  currentUserId: string;
}

export function StaffListClient({
  initialStaff,
  roles,
  currentUserId,
}: StaffListClientProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [optimisticStaff, updateOptimistic] = useOptimistic(
    initialStaff,
    (
      state,
      update: { userId: string; action: "suspend" | "reactivate" | "remove" },
    ) => {
      if (update.action === "remove") {
        return state.filter((s) => s.user_id !== update.userId);
      }
      return state.map((s) =>
        s.user_id === update.userId
          ? {
              ...s,
              status: (update.action === "suspend"
                ? "suspended"
                : "active") as StaffStatus,
            }
          : s,
      );
    },
  );
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Filtering ────────────────────────────────────────────
  const filtered = optimisticStaff.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (roleFilter !== "all" && m.role_id !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase();
      if (!name.includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Actions ──────────────────────────────────────────────
  function handleAction(
    userId: string,
    action: "suspend" | "reactivate" | "remove",
    confirm?: string,
  ) {
    if (confirm && !window.confirm(confirm)) return;
    setActionError(null);

    startTransition(async () => {
      updateOptimistic({ userId, action });

      const result =
        action === "suspend"
          ? await suspendStaffMember(userId)
          : action === "reactivate"
            ? await reactivateStaffMember(userId)
            : await removeStaffMember(userId);

      if (result.error) {
        setActionError(result.error?.message ?? null);
      }
    });
  }

  return (
    <>
      {/* Invite sheet */}
      {showInvite && (
        <InviteStaffSheet
          roles={roles}
          onSuccess={() => {
            setShowInvite(false);
            // Reload is handled by server revalidation - page.tsx will re-fetch
            window.location.reload();
          }}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-48 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as StaffStatus | "all")
          }
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All roles</option>
          {roles
            .filter((r) => r.name.toLowerCase() !== "parent")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>

        {/* Invite button */}
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active-push touch-target"
        >
          + Invite Staff
        </button>
      </div>

      {/* Error */}
      {actionError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p
            className="mx-auto mb-3 text-3xl"
            style={{ color: "var(--empty-state-icon)" }}
          >
            👥
          </p>
          <p className="text-sm font-medium text-foreground">
            {search || statusFilter !== "all" || roleFilter !== "all"
              ? "No staff match your filters"
              : "No staff members yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter !== "all" || roleFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Invite your first staff member to get started."}
          </p>
        </div>
      )}

      {/* Staff table */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Staff Member
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((member) => (
                <tr key={member.user_id} className="hover:bg-muted/40">
                  {/* Name + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarInitials
                        firstName={member.first_name}
                        lastName={member.last_name}
                        email={member.email}
                      />
                      <div>
                        <Link
                          href={`/admin/staff/${member.user_id}`}
                          className="text-sm font-medium text-foreground hover:text-primary"
                        >
                          {member.first_name || member.last_name
                            ? `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
                            : "Pending name"}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
                      {member.role_name}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={member.status} />
                  </td>

                  {/* Row actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/staff/${member.user_id}`}
                        className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        View
                      </Link>

                      {member.user_id !== currentUserId && (
                        <>
                          {member.status === "suspended" ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleAction(member.user_id, "reactivate")
                              }
                              className="rounded px-2 py-1 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-50"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                handleAction(member.user_id, "suspend")
                              }
                              className="rounded px-2 py-1 text-xs font-medium text-warning hover:bg-warning/10 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleAction(
                                member.user_id,
                                "remove",
                                `Remove ${member.first_name ?? member.email} from your school? They will lose all access.`,
                              )
                            }
                            className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          {filtered.length} of {optimisticStaff.length} staff
        </p>
      )}
    </>
  );
}
