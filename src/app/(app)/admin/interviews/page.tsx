// src/app/(app)/admin/interviews/page.tsx
// Admin: list all interview sessions

import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listInterviewSessions } from "@/lib/actions/interviews";
import { SessionsListClient } from "@/components/domain/interviews/sessions-list-client";
import type { InterviewSessionWithCounts } from "@/types/domain";

export default async function InterviewsAdminPage() {
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canManage = hasPermission(context, Permissions.MANAGE_INTERVIEW_SESSIONS);
  const canView = hasPermission(context, Permissions.VIEW_INTERVIEW_SCHEDULE);

  if (!canManage && !canView) redirect("/dashboard");

  const result = await listInterviewSessions();
  const sessions: InterviewSessionWithCounts[] = result.error || !result.data ? [] : result.data;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-tab-bar space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Parent-Teacher Interviews
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Manage interview sessions and bookings
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/interviews/new"
            className="rounded-lg px-3 py-2 text-sm font-medium touch-target active-push"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            New session
          </Link>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href="/interviews"
          className="text-sm px-3 py-1.5 rounded-lg touch-target"
          style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
        >
          My schedule →
        </Link>
      </div>

      <SessionsListClient sessions={sessions} />
    </div>
  );
}
