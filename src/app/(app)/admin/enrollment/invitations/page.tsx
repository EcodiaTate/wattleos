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
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        Expired
      </span>
    );
  }

  const styles: Record<string, string> = {
    pending: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    expired: "bg-gray-100 text-gray-500",
    revoked: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
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
          <h1 className="text-2xl font-bold text-gray-900">
            Parent Invitations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage parent account invitations.
          </p>
        </div>
        <Link
          href="/admin/enrollment"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Enrollment Periods
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
          <p className="text-xs font-medium text-gray-500">Pending</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
          <p className="text-xs font-medium text-gray-500">Accepted</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-2xl font-bold text-gray-400">{expiredCount}</p>
          <p className="text-xs font-medium text-gray-500">Expired</p>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Empty state */}
      {!errorMessage && invitations.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-900">
            No invitations sent yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Invitations are automatically generated when you approve an
            enrollment application.
          </p>
        </div>
      )}

      {/* Invitations table */}
      {invitations.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Parent Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Expires
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {inv.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
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
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(inv.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
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
