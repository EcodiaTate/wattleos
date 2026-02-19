// src/app/(app)/attendance/page.tsx
//
// ============================================================
// WattleOS V2 - Attendance Page (Roll Call Landing)
// ============================================================
// Server Component. Loads available classes for the current
// tenant, then renders the interactive RollCallClient.
//
// The guide's workflow:
// 1. Arrive at /attendance (linked from sidebar + dashboard)
// 2. Select their class (defaults to first if only one)
// 3. See today's date (can change)
// 4. Tap each student's status
// 5. Submit
//
// WHY server component wrapper: Class list is a static query
// that doesn't need client-side interactivity. Keeping it in
// a server component avoids shipping the Supabase client to
// the browser.
// ============================================================

import { RollCallClient } from "@/components/domain/attendance/roll-call-client";
import { listClasses } from "@/lib/actions/classes";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AttendancePage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ATTENDANCE)) {
    redirect("/dashboard");
  }

  const classesResult = await listClasses();
  const classes = (classesResult.data ?? []).filter((c) => c.is_active);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Take the daily roll for your class.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/history"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            History
          </Link>
          <Link
            href="/attendance/absences"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          >
            Absences
          </Link>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-lg borderborder-border bg-background p-12 text-center">
          <svg
            className="mx-auto h-[var(--density-button-height)] w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground">
            No classes found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a class first before taking attendance.
          </p>
        </div>
      ) : (
        <RollCallClient
          classes={classes.map((c) => ({
            id: c.id,
            name: c.name,
            room: c.room,
            cycleLevel: c.cycle_level,
          }))}
        />
      )}
    </div>
  );
}
