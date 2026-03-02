// src/app/(app)/admin/enrollment/invitations/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Invitations Page (Module 10)
// ============================================================
// Admin view for tracking parent invitations sent after
// enrollment approval. Shows status (pending, accepted,
// expired, revoked), allows resending and revoking.
//
// WHY dedicated page: Invitations are a separate workflow
// from applications. Admins need to troubleshoot "I didn't
// get my invite" without navigating each application.
//
// NOTE: This page fetches directly from Supabase since no
// dedicated listInvitations action exists yet. If you build
// one, refactor this to use it.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { InvitationActions } from "./invitation-actions";

export const metadata = {
  title: "Parent Invitations - WattleOS",
};

function formatDate(iso: string | null): string {
  if (!iso) return " - ";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({
  status,
  expiresAt,
}: {
  status: string;
  expiresAt: string | null;
}) {
  // Check if pending but expired
  const isExpired =
    status === "pending" && expiresAt && new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Expired
      </span>
    );
  }

  const styles: Record<string, string> = {
    pending: "bg-info/15 text-info",
    accepted: "bg-success/15 text-success",
    expired: "bg-muted text-muted-foreground",
    revoked: "bg-destructive/15 text-destructive",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface ParentInvitation {
  id: string;
  email: string;
  student_id: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  student: { first_name: string; last_name: string } | null;
  inviter: { first_name: string | null; last_name: string | null } | null;
}

export default async function InvitationsPage() {
  const context = await getTenantContext();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("parent_invitations")
    .select(
      `
      id, email, student_id, token, status, expires_at, accepted_at, created_at,
      student:students!parent_invitations_student_id_fkey(first_name, last_name),
      inviter:users!parent_invitations_invited_by_fkey(first_name, last_name)
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  // Normalize nested relationships
  const invitations: ParentInvitation[] = (data ?? []).map((row) => {
    const student = Array.isArray(row.student)
      ? (row.student[0] ?? null)
      : row.student;
    const inviter = Array.isArray(row.inviter)
      ? (row.inviter[0] ?? null)
      : row.inviter;
    return {
      ...row,
      student: student as ParentInvitation["student"],
      inviter: inviter as ParentInvitation["inviter"],
    };
  });

  const errorMessage = error?.message ?? null;

  // Stats
  const pendingCount = invitations.filter((inv) => {
    if (inv.status !== "pending") return false;
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) return false;
    return true;
  }).length;
  const acceptedCount = invitations.filter(
    (inv) => inv.status === "accepted",
  ).length;
  const expiredCount = invitations.filter(
    (inv) =>
      inv.status === "expired" ||
      (inv.status === "pending" &&
        inv.expires_at &&
        new Date(inv.expires_at) < new Date()),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Parent Invitations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage parent account invitations.
          </p>
        </div>
        <Link
          href="/admin/enrollment"
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          ← Enrollment Periods
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-info">{pendingCount}</p>
          <p className="text-xs font-medium text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-success">{acceptedCount}</p>
          <p className="text-xs font-medium text-muted-foreground">Accepted</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold text-muted-foreground">{expiredCount}</p>
          <p className="text-xs font-medium text-muted-foreground">Expired</p>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Empty state */}
      {!errorMessage && invitations.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No invitations sent yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invitations are automatically generated when you approve an
            enrollment application.
          </p>
        </div>
      )}

      {/* Invitations table */}
      {invitations.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Parent Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Expires
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted">
                  <td className="px-4 py-3 text-sm text-foreground">
                    {inv.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {inv.student
                      ? `${inv.student.first_name} ${inv.student.last_name}`
                      : inv.student_id}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={inv.status}
                      expiresAt={inv.expires_at}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(inv.expires_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <InvitationActions
                      invitationId={inv.id}
                      currentStatus={inv.status}
                      expiresAt={inv.expires_at}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
