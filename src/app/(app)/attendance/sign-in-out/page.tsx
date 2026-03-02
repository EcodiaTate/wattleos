// src/app/(app)/attendance/sign-in-out/page.tsx
//
// ============================================================
// WattleOS V2 - Sign-In/Out Log (Staff Admin View)
// ============================================================
// Admin view of all late arrival / early departure events.
// Date picker, type filter, CSV export.
// ============================================================

import { SignInOutRecordList } from "@/components/domain/attendance/sign-in-out-record-list";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign-In/Out Log - WattleOS" };

export default async function SignInOutLogPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ATTENDANCE)) {
    redirect("/dashboard");
  }

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Sign-In / Sign-Out Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Late arrivals and early departures recorded at the kiosk.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/kiosk"
            className="touch-target flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
              />
            </svg>
            Open Kiosk
          </Link>
          <Link
            href="/attendance"
            className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Roll Call
          </Link>
        </div>
      </div>

      <SignInOutRecordList initialDate={today} />
    </div>
  );
}
