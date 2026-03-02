// src/app/(app)/interviews/page.tsx
// Staff: their own interview schedule across all open sessions
// Families: list open sessions + book/view bookings

import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listInterviewSessions } from "@/lib/actions/interviews";
import { InterviewSessionStatusBadge } from "@/components/domain/interviews/interview-status-badge";
import type { InterviewSessionStatus } from "@/types/domain";

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function InterviewsPage() {
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canBook = hasPermission(context, Permissions.BOOK_INTERVIEW);
  const canView = hasPermission(context, Permissions.VIEW_INTERVIEW_SCHEDULE);
  const canManage = hasPermission(context, Permissions.MANAGE_INTERVIEW_SESSIONS);

  if (!canBook && !canView) redirect("/dashboard");

  // Only show open sessions on the public-facing page
  const result = await listInterviewSessions({ status: "open", includeArchived: false });
  const sessions = result.error || !result.data ? [] : result.data;

  const isStaff = canView || canManage;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-tab-bar space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            {isStaff ? "Interview Schedule" : "Book an Interview"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {isStaff
              ? "Your interview slots and bookings"
              : "Select a session to view and book available times"}
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/interviews"
            className="text-sm px-3 py-1.5 rounded-lg touch-target"
            style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
          >
            Admin view →
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <p className="text-4xl mb-3" style={{ color: "var(--empty-state-icon)" }}>🗓️</p>
          <p className="text-base font-medium mb-1" style={{ color: "var(--foreground)" }}>
            No sessions open right now
          </p>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Check back when the school opens the next interview booking period.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={isStaff ? `/interviews/${session.id}/schedule` : `/interviews/${session.id}/book`}
              className="block rounded-2xl p-5 card-interactive"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <InterviewSessionStatusBadge
                      status={session.status as InterviewSessionStatus}
                      size="sm"
                    />
                    {session.available_slots > 0 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: "var(--interview-slot-available-bg)",
                          color: "var(--interview-slot-available-fg)",
                        }}
                      >
                        {session.available_slots} available
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>
                    {session.title}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    {formatDate(session.session_start_date)} – {formatDate(session.session_end_date)}
                  </p>
                  {session.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                      {session.description}
                    </p>
                  )}
                </div>
                <span className="text-lg" style={{ color: "var(--muted-foreground)" }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
