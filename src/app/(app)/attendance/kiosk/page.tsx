// src/app/(app)/attendance/kiosk/page.tsx
//
// ============================================================
// WattleOS V2 - Kiosk Page (Late Arrival / Early Departure)
// ============================================================
// Tablet-optimised kiosk UI for recording late arrivals and
// early departures at the school reception desk.
//
// Typically used on a dedicated reception tablet.
// Gated on MANAGE_ATTENDANCE - same as roll call.
// ============================================================

import { KioskPanel } from "@/components/domain/attendance/kiosk-panel";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign-In / Sign-Out Kiosk - WattleOS" };

export default async function KioskPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_ATTENDANCE)) {
    redirect("/dashboard");
  }

  // Get today's date in the tenant's local timezone (server-side best guess).
  // The client component stamps the actual local time on submit.
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Sign-In / Sign-Out Kiosk
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Record late arrivals and early departures.{" "}
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/attendance/sign-in-out"
            className="touch-target rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            View Log
          </Link>
          <Link
            href="/attendance"
            className="touch-target rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Roll Call
          </Link>
        </div>
      </div>

      {/* Kiosk panel */}
      <div className="rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-sm">
        <KioskPanel />
      </div>

      {/* Info footer */}
      <p className="text-center text-xs text-muted-foreground">
        Late arrivals automatically update the class roll. Timestamps are
        recorded in real time.
      </p>
    </div>
  );
}
